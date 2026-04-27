create extension if not exists pg_cron with schema extensions;

create or replace function public.expire_due_user_subscriptions()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  expired_count integer := 0;
  has_updated_at boolean := false;
begin
  select exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'user_subscriptions'
      and column_name = 'updated_at'
  )
  into has_updated_at;

  if has_updated_at then
    execute $sql$
      update public.user_subscriptions
      set status = 'expired',
          updated_at = now()
      where status in ('active', 'trialing')
        and ends_at is not null
        and ends_at <= now()
    $sql$;
  else
    execute $sql$
      update public.user_subscriptions
      set status = 'expired'
      where status in ('active', 'trialing')
        and ends_at is not null
        and ends_at <= now()
    $sql$;
  end if;

  get diagnostics expired_count = row_count;
  return expired_count;
end;
$$;

revoke all on function public.expire_due_user_subscriptions() from public;

do $$
begin
  if exists (
    select 1
    from cron.job
    where jobname = 'expire-due-user-subscriptions'
  ) then
    perform cron.unschedule('expire-due-user-subscriptions');
  end if;

  perform cron.schedule(
    'expire-due-user-subscriptions',
    '*/15 * * * *',
    $job$select public.expire_due_user_subscriptions();$job$
  );
end;
$$;

select public.expire_due_user_subscriptions();
