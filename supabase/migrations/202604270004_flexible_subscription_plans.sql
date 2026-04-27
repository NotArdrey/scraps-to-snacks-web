insert into public.subscription_plans (
  plan_code,
  display_name,
  description,
  price_cents,
  billing_period_days,
  is_active,
  currency
)
values
  (
    'weekly',
    'Weekly Starter',
    'A low-commitment week of full Scraps2Snacks access.',
    4900,
    7,
    true,
    'PHP'
  ),
  (
    'monthly',
    'Monthly Pro',
    'Flexible monthly billing for full Scraps2Snacks access.',
    14900,
    30,
    true,
    'PHP'
  ),
  (
    'annual',
    'Annual Pro',
    'Best value for a full year of Scraps2Snacks access.',
    149900,
    365,
    true,
    'PHP'
  )
on conflict (plan_code) do update
set
  display_name = excluded.display_name,
  description = excluded.description,
  price_cents = excluded.price_cents,
  billing_period_days = excluded.billing_period_days,
  is_active = excluded.is_active,
  currency = excluded.currency;

update public.subscription_plans
set is_active = false
where plan_code = 'quarterly';
