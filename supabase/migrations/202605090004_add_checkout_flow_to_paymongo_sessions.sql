alter table public.paymongo_checkout_sessions
  add column if not exists checkout_flow text not null default 'subscription'
  check (checkout_flow in ('subscription', 'registration'));

update public.paymongo_checkout_sessions
set checkout_flow = coalesce(
  nullif(raw_checkout #>> '{data,attributes,metadata,checkout_flow}', ''),
  nullif(raw_event #>> '{checkout,data,attributes,metadata,checkout_flow}', ''),
  checkout_flow,
  'subscription'
)
where checkout_flow is null
   or checkout_flow <> coalesce(
      nullif(raw_checkout #>> '{data,attributes,metadata,checkout_flow}', ''),
      nullif(raw_event #>> '{checkout,data,attributes,metadata,checkout_flow}', ''),
      checkout_flow
    );

create index if not exists paymongo_checkout_sessions_flow_idx
  on public.paymongo_checkout_sessions(checkout_flow);
