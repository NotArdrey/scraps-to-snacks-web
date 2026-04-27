grant select on public.subscription_plans to anon, authenticated;

drop policy if exists "Anyone can read active subscription plans" on public.subscription_plans;
create policy "Anyone can read active subscription plans"
on public.subscription_plans
for select
to anon, authenticated
using (is_active = true);
