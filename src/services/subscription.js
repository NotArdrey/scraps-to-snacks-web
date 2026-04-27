import { supabase } from '../lib/supabase';

export async function fetchActivePlans({ paidOnly = false } = {}) {
  let query = supabase
    .from('subscription_plans')
    .select('*')
    .eq('is_active', true)
    .order('billing_period_days', { ascending: true });

  if (paidOnly) {
    query = query.gt('price_cents', 0).neq('plan_code', 'trial');
  }

  const { data } = await query;
  return data || [];
}

export async function startPaymongoCheckout(planCode) {
  const { data, error } = await supabase.functions.invoke('create-paymongo-checkout', {
    body: { plan_code: planCode },
  });

  if (error) {
    console.error('create-paymongo-checkout failed', {
      message: error.message,
      status: error.status,
      code: error.code,
      details: error.details,
      context: error.context,
    });
    throw new Error(data?.error || error.message || 'Unable to start PayMongo Checkout.');
  }

  if (!data?.checkout_url) {
    throw new Error(data?.error || 'PayMongo did not return a checkout URL.');
  }

  return data;
}

export async function fetchPaymentAttempt({ attemptId, checkoutSessionId }) {
  let query = supabase
    .from('paymongo_checkout_sessions')
    .select('*, subscription_plans(*)');

  if (attemptId) {
    query = query.eq('id', attemptId);
  } else if (checkoutSessionId) {
    query = query.eq('paymongo_checkout_session_id', checkoutSessionId);
  } else {
    return { data: null, error: { message: 'Missing payment attempt reference.' } };
  }

  return query.maybeSingle();
}

export async function verifyPaymongoCheckout(attemptId) {
  const { data, error } = await supabase.functions.invoke('verify-paymongo-checkout', {
    body: { attempt_id: attemptId },
  });

  if (error) {
    console.error('verify-paymongo-checkout failed', {
      message: error.message,
      status: error.status,
      code: error.code,
      details: error.details,
      context: error.context,
    });
    throw new Error(data?.error || error.message || 'Unable to verify PayMongo checkout.');
  }

  return data;
}

export function getPlanPeriodLabel(plan) {
  const days = Number(plan.billing_period_days || 0);

  if (days <= 0) return '';
  if (days === 7) return 'week';
  if (days === 14) return '2 weeks';
  if (days >= 28 && days <= 31) return 'month';
  if (days >= 89 && days <= 92) return 'quarter';
  if (days >= 179 && days <= 184) return '6 months';
  if (days >= 364 && days <= 366) return 'year';
  return `${days} days`;
}

export function getPlanBillingLabel(plan) {
  const days = Number(plan.billing_period_days || 0);

  if (days === 7) return 'Billed weekly';
  if (days === 14) return 'Billed every 2 weeks';
  if (days >= 28 && days <= 31) return 'Billed monthly';
  if (days >= 89 && days <= 92) return 'Billed quarterly';
  if (days >= 179 && days <= 184) return 'Billed every 6 months';
  if (days >= 364 && days <= 366) return 'Billed annually';
  if (days > 0) return `Billed every ${days} days`;
  return 'Flexible billing';
}

export function formatPlanPrice(plan) {
  const currency = plan.currency || 'PHP';
  const amount = (plan.price_cents || 0) / 100;
  const price = new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency,
  }).format(amount);

  if (plan.price_cents === 0) return price;

  const period = getPlanPeriodLabel(plan);
  return period ? `${price}/${period}` : price;
}
