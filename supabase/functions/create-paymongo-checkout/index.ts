import { createClient } from "https://esm.sh/@supabase/supabase-js@2.100.1";
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";

type Plan = {
  id: string;
  plan_code: string;
  display_name: string;
  description: string | null;
  price_cents: number;
  billing_period_days: number | null;
  is_active: boolean;
  currency: string | null;
};

const PAYMONGO_API_BASE_URL = Deno.env.get("PAYMONGO_API_BASE_URL") ?? "https://api.paymongo.com/v1";
const DEFAULT_PAYMENT_METHOD_TYPES = [
  "card",
  "gcash",
  "paymaya",
  "grab_pay",
  "qrph",
  "dob",
  "dob_ubp",
  "brankas_bdo",
  "brankas_landbank",
  "brankas_metrobank",
  "billease",
];

function getRequiredEnv(name: string) {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`${name} is not configured`);
  return value;
}

function parsePaymentMethodTypes() {
  const configured = Deno.env.get("PAYMONGO_PAYMENT_METHOD_TYPES");
  if (!configured) return DEFAULT_PAYMENT_METHOD_TYPES;
  return configured.split(",").map((item) => item.trim()).filter(Boolean);
}

function getAppOrigin(req: Request) {
  const configured = Deno.env.get("SITE_URL") ?? Deno.env.get("APP_URL");
  const origin = configured ?? req.headers.get("Origin");
  if (!origin) throw new Error("SITE_URL or request Origin is required for checkout redirects");
  return origin.replace(/\/$/, "");
}

function getDisplayName(userMetadata: Record<string, unknown> | undefined) {
  const value = userMetadata?.display_name;
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function getCheckoutAmountCents(plan: Plan) {
  const testAmount = Deno.env.get("PAYMONGO_TEST_AMOUNT_CENTS");
  if (!testAmount) return plan.price_cents;

  const amount = Number(testAmount);
  if (!Number.isInteger(amount) || amount <= 0) {
    throw new Error("PAYMONGO_TEST_AMOUNT_CENTS must be a positive integer amount in centavos");
  }

  return amount;
}

async function createPaymongoCheckout(secretKey: string, payload: unknown) {
  const response = await fetch(`${PAYMONGO_API_BASE_URL}/checkout_sessions`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      Authorization: `Basic ${btoa(`${secretKey}:`)}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const responseBody = await response.json().catch(() => null);
  if (!response.ok) {
    const message =
      responseBody?.errors?.[0]?.detail ??
      responseBody?.errors?.[0]?.message ??
      responseBody?.message ??
      "PayMongo rejected the checkout request";
    throw new Error(message);
  }

  return responseBody;
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
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
    const planCode = typeof requestBody?.plan_code === "string" ? requestBody.plan_code.trim() : "";
    if (!planCode) return jsonResponse({ error: "plan_code is required" }, 400);

    const serviceClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: { persistSession: false },
    });

    const { data: planData, error: planError } = await serviceClient
      .from("subscription_plans")
      .select("id, plan_code, display_name, description, price_cents, billing_period_days, is_active, currency")
      .eq("plan_code", planCode)
      .eq("is_active", true)
      .maybeSingle();

    if (planError) throw planError;
    const plan = planData as Plan | null;
    if (!plan) return jsonResponse({ error: "Plan not found" }, 404);
    if (!plan.price_cents || plan.price_cents <= 0) {
      return jsonResponse({ error: "Only paid plans can be purchased through PayMongo Checkout" }, 400);
    }

    const currency = (plan.currency ?? "PHP").toUpperCase();
    if (currency !== "PHP") return jsonResponse({ error: "PayMongo checkout is configured for PHP plans only" }, 400);
    const checkoutAmountCents = getCheckoutAmountCents(plan);

    const { data: attempt, error: attemptError } = await serviceClient
      .from("paymongo_checkout_sessions")
      .insert({
        user_id: userData.user.id,
        plan_id: plan.id,
        amount_cents: checkoutAmountCents,
        currency,
        status: "pending",
      })
      .select("id")
      .single();

    if (attemptError) throw attemptError;

    const appOrigin = getAppOrigin(req);
    const successUrl = `${appOrigin}/payment/success?attempt_id=${attempt.id}`;
    const cancelUrl = `${appOrigin}/payment/cancel?attempt_id=${attempt.id}`;
    const userName = getDisplayName(userData.user.user_metadata);

    const checkoutPayload = {
      data: {
        attributes: {
          line_items: [
            {
              amount: checkoutAmountCents,
              currency,
              name: plan.display_name,
              quantity: 1,
              description: plan.description ?? `${plan.billing_period_days ?? 30}-day Scraps2Snacks access`,
            },
          ],
          payment_method_types: parsePaymentMethodTypes(),
          success_url: successUrl,
          cancel_url: cancelUrl,
          description: `${plan.display_name} subscription`,
          send_email_receipt: true,
          show_description: true,
          show_line_items: true,
          customer_email: userData.user.email,
          metadata: {
            local_attempt_id: attempt.id,
            user_id: userData.user.id,
            plan_code: plan.plan_code,
            plan_price_cents: String(plan.price_cents),
            checkout_amount_cents: String(checkoutAmountCents),
            customer_name: userName,
          },
        },
      },
    };

    let checkout;
    try {
      checkout = await createPaymongoCheckout(paymongoSecretKey, checkoutPayload);
    } catch (error) {
      await serviceClient
        .from("paymongo_checkout_sessions")
        .update({ status: "failed", raw_checkout: { error: getErrorMessage(error) } })
        .eq("id", attempt.id);
      throw error;
    }

    const checkoutSessionId = checkout?.data?.id;
    const checkoutUrl = checkout?.data?.attributes?.checkout_url;

    if (!checkoutSessionId || !checkoutUrl) {
      await serviceClient
        .from("paymongo_checkout_sessions")
        .update({ status: "failed", raw_checkout: checkout })
        .eq("id", attempt.id);
      return jsonResponse({ error: "PayMongo did not return a checkout URL" }, 502);
    }

    const { error: updateError } = await serviceClient
      .from("paymongo_checkout_sessions")
      .update({
        paymongo_checkout_session_id: checkoutSessionId,
        checkout_url: checkoutUrl,
        raw_checkout: checkout,
        livemode: checkout?.data?.attributes?.livemode ?? null,
      })
      .eq("id", attempt.id);

    if (updateError) throw updateError;

    return jsonResponse({
      checkout_url: checkoutUrl,
      checkout_session_id: checkoutSessionId,
      attempt_id: attempt.id,
    });
  } catch (error) {
    console.error("create-paymongo-checkout failed", error);
    return jsonResponse({ error: getErrorMessage(error) || "Unable to create PayMongo checkout" }, 500);
  }
});
