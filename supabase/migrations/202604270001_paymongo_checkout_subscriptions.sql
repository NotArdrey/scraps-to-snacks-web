create extension if not exists pgcrypto;

alter table public.subscription_plans
  add column if not exists currency text not null default 'PHP';

update public.subscription_plans
set currency = 'PHP'
where currency is null or trim(currency) = '';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'subscription_plans_currency_format'
      and conrelid = 'public.subscription_plans'::regclass
  ) then
    alter table public.subscription_plans
      add constraint subscription_plans_currency_format
      check (currency = upper(currency) and length(currency) = 3);
  end if;
end $$;

alter table public.user_subscriptions
  add column if not exists provider text not null default 'manual',
  add column if not exists provider_ref text;

create index if not exists user_subscriptions_provider_ref_idx
  on public.user_subscriptions(provider_ref)
  where provider_ref is not null;

create table if not exists public.paymongo_checkout_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan_id uuid not null references public.subscription_plans(id),
  subscription_id uuid references public.user_subscriptions(id) on delete set null,
  paymongo_checkout_session_id text unique,
  paymongo_payment_id text,
  paymongo_payment_intent_id text,
  checkout_url text,
  amount_cents integer not null check (amount_cents > 0),
  currency text not null default 'PHP' check (currency = upper(currency) and length(currency) = 3),
  status text not null default 'pending' check (status in ('pending', 'paid', 'failed', 'canceled', 'expired')),
  livemode boolean,
  raw_checkout jsonb,
  raw_event jsonb,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists paymongo_checkout_sessions_payment_id_key
  on public.paymongo_checkout_sessions(paymongo_payment_id)
  where paymongo_payment_id is not null;

create index if not exists paymongo_checkout_sessions_user_created_idx
  on public.paymongo_checkout_sessions(user_id, created_at desc);

create index if not exists paymongo_checkout_sessions_plan_idx
  on public.paymongo_checkout_sessions(plan_id);

create index if not exists paymongo_checkout_sessions_status_idx
  on public.paymongo_checkout_sessions(status);

create table if not exists public.paymongo_webhook_events (
  id text primary key,
  event_type text not null,
  checkout_session_id text,
  livemode boolean,
  status text not null default 'processing' check (status in ('processing', 'succeeded', 'ignored', 'failed')),
  payload jsonb not null,
  error text,
  created_at timestamptz not null default now(),
  processed_at timestamptz
);

create index if not exists paymongo_webhook_events_checkout_session_idx
  on public.paymongo_webhook_events(checkout_session_id)
  where checkout_session_id is not null;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_paymongo_checkout_sessions_updated_at on public.paymongo_checkout_sessions;
create trigger set_paymongo_checkout_sessions_updated_at
before update on public.paymongo_checkout_sessions
for each row execute function public.set_updated_at();

alter table public.paymongo_checkout_sessions enable row level security;
alter table public.paymongo_webhook_events enable row level security;

drop policy if exists "Users can read own PayMongo checkout sessions" on public.paymongo_checkout_sessions;
create policy "Users can read own PayMongo checkout sessions"
on public.paymongo_checkout_sessions
for select
to authenticated
using (auth.uid() = user_id);

grant select on public.paymongo_checkout_sessions to authenticated;
