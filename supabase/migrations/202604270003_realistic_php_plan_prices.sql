update public.subscription_plans
set
  price_cents = 14900,
  currency = 'PHP',
  description = 'Flexible monthly billing for full Scraps2Snacks access.'
where plan_code = 'monthly';

update public.subscription_plans
set
  price_cents = 149900,
  currency = 'PHP',
  description = 'Save with a full year of Scraps2Snacks access.'
where plan_code = 'annual';
