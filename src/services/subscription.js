import { supabase } from '../lib/supabase';
import { DEFAULT_BILLING_PERIOD_DAYS } from '../constants/ai';

export async function fetchActivePlans() {
  const { data } = await supabase
    .from('subscription_plans')
    .select('*')
    .eq('is_active', true)
    .order('billing_period_days', { ascending: true });
  return data || [];
}

export async function createSubscription(userId, plan) {
  const endsAt = new Date(Date.now() + (plan.billing_period_days || DEFAULT_BILLING_PERIOD_DAYS) * 86400000).toISOString();

  const { data, error } = await supabase.from('user_subscriptions').insert({
    user_id: userId,
    plan_id: plan.id,
    status: plan.plan_code === 'trial' ? 'trialing' : 'active',
    starts_at: new Date().toISOString(),
    ends_at: endsAt,
  }).select().single();

  return { data, error };
}

export function formatPlanPrice(plan) {
  if (plan.price_cents === 0) return '$0';
  const dollars = (plan.price_cents / 100).toFixed(2);
  if (plan.billing_period_days <= 31) return `$${dollars}/mo`;
  return `$${dollars}/yr`;
}
