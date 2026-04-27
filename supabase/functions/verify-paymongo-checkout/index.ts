import { createClient } from "https://esm.sh/@supabase/supabase-js@2.100.1";
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";

type CheckoutAttempt = {
  id: string;
  user_id: string;
  plan_id: string;
  subscription_id: string | null;
  paymongo_checkout_session_id: string | null;
  amount_cents: number;
  currency: string;
  status: string;
  subscription_plans: {
    billing_period_days: number | null;
  } | null;
};

const PAYMONGO_API_BASE_URL = Deno.env.get("PAYMONGO_API_BASE_URL") ?? "https://api.paymongo.com/v1";

function getRequiredEnv(name: string) {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`${name} is not configured`);
  return value;
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

async function retrievePaymongoCheckout(secretKey: string, checkoutSessionId: string) {
  const response = await fetch(`${PAYMONGO_API_BASE_URL}/checkout_sessions/${checkoutSessionId}`, {
    method: "GET",
    headers: {
      Accept: "application/json",
      Authorization: `Basic ${btoa(`${secretKey}:`)}`,
    },
  });

  const responseBody = await response.json().catch(() => null);
  if (!response.ok) {
    const message =
      responseBody?.errors?.[0]?.detail ??
      responseBody?.errors?.[0]?.message ??
      responseBody?.message ??
      "Unable to retrieve PayMongo checkout";
    throw new Error(message);
  }

  return responseBody;
}

function getPaidPayment(checkoutAttributes: Record<string, any>) {
  const directPayments = Array.isArray(checkoutAttributes.payments) ? checkoutAttributes.payments : [];
  const intentPayments = Array.isArray(checkoutAttributes.payment_intent?.attributes?.payments)
    ? checkoutAttributes.payment_intent.attributes.payments
    : [];
  const payments = [...directPayments, ...intentPayments];

  return (
    payments.find((payment) => payment?.attributes?.status === "paid") ??
    null
  ) as { id?: string; attributes?: Record<string, any> } | null;
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
    const { data: renewed, error: renewError } = await supabase
      .from("user_subscriptions")
      .update({
        status: "active",
        ends_at: addDays(existingEndsAt, periodDays).toISOString(),
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

  try {
    const supabaseUrl = getRequiredEnv("SUPABASE_URL");
    const supabaseAnonKey = getRequiredEnv("SUPABASE_ANON_KEY");
    const supabaseServiceRoleKey = getRequiredEnv("SUPABASE_SERVICE_ROLE_KEY");
    const paymongoSecretKey = getRequiredEnv("PAYMONGO_SECRET_KEY");
    const authHeader = req.headers.get("Authorization");

    if (!authHeader) return jsonResponse({ error: "Missing Authorization header" }, 401);

    const authClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false },
    });

    const { data: userData, error: userError } = await authClient.auth.getUser();
    if (userError || !userData.user) return jsonResponse({ error: "Invalid session" }, 401);

    const requestBody = await req.json().catch(() => null);
    const attemptId = typeof requestBody?.attempt_id === "string" ? requestBody.attempt_id.trim() : "";
    if (!attemptId) return jsonResponse({ error: "attempt_id is required" }, 400);

    const serviceClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: { persistSession: false },
    });

    const { data: attemptData, error: attemptError } = await serviceClient
      .from("paymongo_checkout_sessions")
      .select("*, subscription_plans(billing_period_days)")
      .eq("id", attemptId)
      .eq("user_id", userData.user.id)
      .maybeSingle();

    if (attemptError) throw attemptError;
    const attempt = attemptData as CheckoutAttempt | null;
    if (!attempt) return jsonResponse({ error: "Payment attempt not found" }, 404);
    if (!attempt.paymongo_checkout_session_id) {
      return jsonResponse({ error: "Payment attempt has no PayMongo checkout session" }, 400);
    }

    if (attempt.status === "paid" && attempt.subscription_id) {
      return jsonResponse({ status: "paid", subscription_id: attempt.subscription_id });
    }

    const checkout = await retrievePaymongoCheckout(paymongoSecretKey, attempt.paymongo_checkout_session_id);
    const checkoutAttributes = checkout?.data?.attributes as Record<string, any> | undefined;
    if (!checkoutAttributes) throw new Error("PayMongo checkout response was missing attributes");

    const payment = getPaidPayment(checkoutAttributes);
    const paymentAttributes = payment?.attributes ?? {};
    const paymentIntent = checkoutAttributes.payment_intent;
    const paymentIntentStatus = paymentIntent?.attributes?.status;

    if (!payment || paymentIntentStatus !== "succeeded") {
      return jsonResponse({
        status: "pending",
        checkout_status: checkoutAttributes.status ?? null,
        payment_intent_status: paymentIntentStatus ?? null,
      });
    }

    if (Number(paymentAttributes.amount) !== attempt.amount_cents) {
      throw new Error("Paid amount did not match the local payment attempt");
    }

    if (String(paymentAttributes.currency).toUpperCase() !== attempt.currency) {
      throw new Error("Paid currency did not match the local payment attempt");
    }

    const subscriptionId = await activateSubscription(
      serviceClient,
      attempt,
      attempt.paymongo_checkout_session_id,
    );

    const paidAt = unixSecondsToIso(paymentAttributes.paid_at ?? checkoutAttributes.paid_at);

    const { data: updatedAttempt, error: updateAttemptError } = await serviceClient
      .from("paymongo_checkout_sessions")
      .update({
        status: "paid",
        subscription_id: subscriptionId,
        paymongo_payment_id: payment.id ?? null,
        paymongo_payment_intent_id: paymentAttributes.payment_intent_id ?? paymentIntent?.id ?? null,
        livemode: checkoutAttributes.livemode ?? null,
        paid_at: paidAt,
        raw_event: { verification_source: "retrieve_checkout_session", checkout },
      })
      .eq("id", attempt.id)
      .select("id, status, subscription_id")
      .single();

    if (updateAttemptError) throw updateAttemptError;

    return jsonResponse({
      status: "paid",
      subscription_id: subscriptionId,
      attempt: updatedAttempt,
    });
  } catch (error) {
    console.error("verify-paymongo-checkout failed", error);
    return jsonResponse({ error: getErrorMessage(error) || "Unable to verify payment" }, 500);
  }
});
