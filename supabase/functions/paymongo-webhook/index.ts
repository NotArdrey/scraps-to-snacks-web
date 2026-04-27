import { createClient } from "https://esm.sh/@supabase/supabase-js@2.100.1";
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";

type CheckoutAttempt = {
  id: string;
  user_id: string;
  plan_id: string;
  subscription_id: string | null;
  amount_cents: number;
  currency: string;
  status: string;
  subscription_plans: {
    billing_period_days: number | null;
  } | null;
};

type PaymongoEvent = {
  data?: {
    id?: string;
    attributes?: {
      type?: string;
      livemode?: boolean;
      data?: {
        id?: string;
        attributes?: Record<string, unknown>;
      };
    };
  };
};

type JsonRecord = Record<string, any>;

function getRequiredEnv(name: string) {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`${name} is not configured`);
  return value;
}

function parseSignatureHeader(header: string) {
  return header.split(",").reduce<Record<string, string>>((parts, pair) => {
    const [key, ...valueParts] = pair.split("=");
    if (key) parts[key.trim()] = valueParts.join("=").trim();
    return parts;
  }, {});
}

async function hmacSha256Hex(secret: string, message: string) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(message));
  return Array.from(new Uint8Array(signature))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function timingSafeEqual(left: string, right: string) {
  const leftBytes = new TextEncoder().encode(left);
  const rightBytes = new TextEncoder().encode(right);
  if (leftBytes.length !== rightBytes.length) return false;

  let diff = 0;
  for (let index = 0; index < leftBytes.length; index += 1) {
    diff |= leftBytes[index] ^ rightBytes[index];
  }
  return diff === 0;
}

async function verifyPaymongoSignature(rawBody: string, header: string | null, livemode: boolean) {
  if (!header) return false;

  const parts = parseSignatureHeader(header);
  const timestamp = parts.t;
  const receivedSignature = livemode ? parts.li : parts.te;
  if (!timestamp || !receivedSignature) return false;

  const toleranceSeconds = Number(Deno.env.get("PAYMONGO_WEBHOOK_TOLERANCE_SECONDS") ?? "300");
  const timestampSeconds = Number(timestamp);
  if (!Number.isFinite(timestampSeconds)) return false;

  const nowSeconds = Math.floor(Date.now() / 1000);
  if (Math.abs(nowSeconds - timestampSeconds) > toleranceSeconds) return false;

  const expectedSignature = await hmacSha256Hex(
    getRequiredEnv("PAYMONGO_WEBHOOK_SECRET"),
    `${timestamp}.${rawBody}`,
  );

  return timingSafeEqual(expectedSignature, receivedSignature);
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function getPayment(checkoutAttributes: JsonRecord) {
  const payments = Array.isArray(checkoutAttributes.payments) ? checkoutAttributes.payments : [];
  return (
    payments.find((payment) => payment?.attributes?.status === "paid") ??
    payments[0] ??
    null
  ) as { id?: string; attributes?: Record<string, unknown> } | null;
}

function unixSecondsToIso(value: unknown) {
  if (typeof value !== "number") return new Date().toISOString();
  return new Date(value * 1000).toISOString();
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

async function getLinkedSubscriptionId(
  supabase: ReturnType<typeof createClient>,
  checkoutSessionId: string,
) {
  const { data, error } = await supabase
    .from("user_subscriptions")
    .select("id")
    .eq("provider_ref", checkoutSessionId)
    .maybeSingle();

  if (error) throw error;
  return data?.id ?? null;
}

async function markEvent(supabase: ReturnType<typeof createClient>, eventId: string, status: string, error?: string) {
  await supabase
    .from("paymongo_webhook_events")
    .update({ status, error: error ?? null, processed_at: new Date().toISOString() })
    .eq("id", eventId);
}

async function activateSubscription(
  supabase: ReturnType<typeof createClient>,
  attempt: CheckoutAttempt,
  checkoutSessionId: string,
) {
  const linkedSubscriptionId = await getLinkedSubscriptionId(supabase, checkoutSessionId);
  if (linkedSubscriptionId) return linkedSubscriptionId;

  const periodDays = attempt.subscription_plans?.billing_period_days ?? 30;
  const now = new Date();
  const nowIso = now.toISOString();

  const { data: existing, error: existingError } = await supabase
    .from("user_subscriptions")
    .select("id, plan_id, status, starts_at, ends_at")
    .eq("user_id", attempt.user_id)
    .in("status", ["active", "trialing"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existingError) throw existingError;

  const existingEndsAt = existing?.ends_at ? new Date(existing.ends_at) : null;
  const existingEndsInFuture = !!existingEndsAt && existingEndsAt.getTime() > now.getTime();

  if (existing && existing.plan_id === attempt.plan_id && existingEndsInFuture) {
    const nextEndsAt = addDays(existingEndsAt, periodDays).toISOString();
    const { data: renewed, error: renewError } = await supabase
      .from("user_subscriptions")
      .update({
        status: "active",
        ends_at: nextEndsAt,
        provider: "paymongo",
        provider_ref: checkoutSessionId,
      })
      .eq("id", existing.id)
      .select("id")
      .single();

    if (renewError) throw renewError;
    return renewed.id;
  }

  if (existing && existing.plan_id !== attempt.plan_id) {
    const { error: cancelError } = await supabase
      .from("user_subscriptions")
      .update({ status: "canceled", ends_at: nowIso })
      .eq("id", existing.id);

    if (cancelError) throw cancelError;
  }

  if (existing && existing.plan_id === attempt.plan_id && !existingEndsInFuture && existing.ends_at) {
    const { error: expireError } = await supabase
      .from("user_subscriptions")
      .update({ status: "expired" })
      .eq("id", existing.id);

    if (expireError) throw expireError;
  }

  const { data: created, error: createError } = await supabase
    .from("user_subscriptions")
    .insert({
      user_id: attempt.user_id,
      plan_id: attempt.plan_id,
      status: "active",
      starts_at: nowIso,
      ends_at: addDays(now, periodDays).toISOString(),
      provider: "paymongo",
      provider_ref: checkoutSessionId,
    })
    .select("id")
    .single();

  if (createError) {
    if (createError.code === "23505") {
      const existingLinkedSubscriptionId = await getLinkedSubscriptionId(supabase, checkoutSessionId);
      if (existingLinkedSubscriptionId) return existingLinkedSubscriptionId;
    }
    throw createError;
  }
  return created.id;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

  const rawBody = await req.text();
  let payload: PaymongoEvent;

  try {
    payload = JSON.parse(rawBody);
  } catch (_error) {
    return jsonResponse({ error: "Invalid JSON" }, 400);
  }

  const eventId = payload.data?.id;
  const eventType = payload.data?.attributes?.type;
  const livemode = !!payload.data?.attributes?.livemode;
  const checkoutSession = payload.data?.attributes?.data;
  const checkoutSessionId = checkoutSession?.id;

  const isValidSignature = await verifyPaymongoSignature(
    rawBody,
    req.headers.get("Paymongo-Signature"),
    livemode,
  );

  if (!isValidSignature) return jsonResponse({ error: "Invalid PayMongo signature" }, 401);
  if (!eventId || !eventType) return jsonResponse({ error: "Invalid PayMongo event" }, 400);

  const supabase = createClient(
    getRequiredEnv("SUPABASE_URL"),
    getRequiredEnv("SUPABASE_SERVICE_ROLE_KEY"),
    { auth: { persistSession: false } },
  );

  try {
    const { data: existingEvent, error: existingEventError } = await supabase
      .from("paymongo_webhook_events")
      .select("id, status")
      .eq("id", eventId)
      .maybeSingle();

    if (existingEventError) throw existingEventError;
    if (existingEvent?.status === "succeeded") {
      return jsonResponse({ received: true, duplicate: true });
    }

    if (existingEvent) {
      await supabase
        .from("paymongo_webhook_events")
        .update({ status: "processing", error: null, payload, checkout_session_id: checkoutSessionId, livemode })
        .eq("id", eventId);
    } else {
      const { error: insertEventError } = await supabase
        .from("paymongo_webhook_events")
        .insert({
          id: eventId,
          event_type: eventType,
          checkout_session_id: checkoutSessionId,
          livemode,
          status: "processing",
          payload,
        });

      if (insertEventError) throw insertEventError;
    }

    if (eventType !== "checkout_session.payment.paid") {
      await markEvent(supabase, eventId, "ignored");
      return jsonResponse({ received: true, ignored: true });
    }

    if (!checkoutSessionId || !checkoutSession?.attributes) {
      throw new Error("Missing checkout session data");
    }

    const checkoutAttributes = checkoutSession.attributes as JsonRecord;
    const payment = getPayment(checkoutAttributes);
    const paymentAttributes = payment?.attributes ?? {};
    const paymentAmount = paymentAttributes.amount ?? checkoutAttributes.payment_intent?.attributes?.amount;
    const paymentCurrency = paymentAttributes.currency ?? checkoutAttributes.payment_intent?.attributes?.currency;

    const { data: attemptData, error: attemptError } = await supabase
      .from("paymongo_checkout_sessions")
      .select("*, subscription_plans(billing_period_days)")
      .eq("paymongo_checkout_session_id", checkoutSessionId)
      .maybeSingle();

    if (attemptError) throw attemptError;
    const attempt = attemptData as CheckoutAttempt | null;
    if (!attempt) throw new Error(`No local payment attempt found for ${checkoutSessionId}`);

    if (attempt.status === "paid" && attempt.subscription_id) {
      await markEvent(supabase, eventId, "succeeded");
      return jsonResponse({ received: true, duplicate: true });
    }

    if (Number(paymentAmount) !== attempt.amount_cents || String(paymentCurrency).toUpperCase() !== attempt.currency) {
      throw new Error("Paid amount or currency did not match the local payment attempt");
    }

    const subscriptionId = await activateSubscription(supabase, attempt, checkoutSessionId);
    const paidAt = unixSecondsToIso(paymentAttributes.paid_at ?? checkoutAttributes.paid_at);

    const { error: updateAttemptError } = await supabase
      .from("paymongo_checkout_sessions")
      .update({
        status: "paid",
        subscription_id: subscriptionId,
        paymongo_payment_id: payment?.id ?? null,
        paymongo_payment_intent_id: paymentAttributes.payment_intent_id ?? checkoutAttributes.payment_intent?.id ?? null,
        livemode,
        paid_at: paidAt,
        raw_event: payload,
      })
      .eq("id", attempt.id);

    if (updateAttemptError) throw updateAttemptError;

    await markEvent(supabase, eventId, "succeeded");
    return jsonResponse({ received: true });
  } catch (error) {
    console.error("paymongo-webhook failed", error);
    if (eventId) await markEvent(supabase, eventId, "failed", getErrorMessage(error));
    return jsonResponse({ error: getErrorMessage(error) || "Webhook processing failed" }, 500);
  }
});
