with ranked as (
  select
    id,
    row_number() over (
      partition by provider_ref
      order by created_at asc, id asc
    ) as rn
  from public.user_subscriptions
  where provider = 'paymongo'
    and provider_ref is not null
)
update public.user_subscriptions us
set
  status = 'canceled',
  ends_at = now(),
  provider_ref = null
from ranked
where us.id = ranked.id
  and ranked.rn > 1;

update public.paymongo_checkout_sessions pcs
set subscription_id = us.id
from public.user_subscriptions us
where pcs.paymongo_checkout_session_id = us.provider_ref
  and us.status = 'active'
  and pcs.subscription_id is distinct from us.id;

create unique index if not exists user_subscriptions_provider_ref_unique_idx
  on public.user_subscriptions(provider_ref)
  where provider_ref is not null;
