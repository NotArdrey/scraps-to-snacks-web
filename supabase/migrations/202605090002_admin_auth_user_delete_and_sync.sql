drop function if exists public.admin_list_users();
drop function if exists public.admin_get_stats();
drop function if exists public.admin_delete_user(uuid);
drop function if exists public.admin_prune_auth_user_mismatches();
drop function if exists public.require_app_admin();

create or replace function public.require_app_admin()
returns uuid
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  caller_user_id uuid := auth.uid();
  caller_role text;
begin
  if caller_user_id is null then
    raise exception 'Authentication required.'
      using errcode = '28000';
  end if;

  select p.role
    into caller_role
  from public.app_user_profiles p
  where p.user_id = caller_user_id;

  if coalesce(caller_role, '') <> 'admin' then
    raise exception 'Admin role required.'
      using errcode = '42501';
  end if;

  return caller_user_id;
end;
$$;

revoke all on function public.require_app_admin() from public;
revoke all on function public.require_app_admin() from anon;
revoke all on function public.require_app_admin() from authenticated;

create or replace function public.admin_list_users()
returns table (
  user_id uuid,
  email text,
  display_name text,
  role text,
  created_at timestamptz,
  subscription_status text,
  plan_id uuid,
  plan_name text
)
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  perform public.require_app_admin();

  return query
  select
    p.user_id,
    u.email::text,
    p.display_name::text,
    p.role::text,
    coalesce(p.created_at, u.created_at),
    latest_subscription.status::text,
    latest_subscription.plan_id,
    latest_subscription.plan_name::text
  from public.app_user_profiles p
  join auth.users u
    on u.id = p.user_id
  left join lateral (
    select
      us.status,
      us.plan_id,
      sp.display_name as plan_name
    from public.user_subscriptions us
    left join public.subscription_plans sp
      on sp.id = us.plan_id
    where us.user_id = p.user_id
    order by us.created_at desc nulls last, us.id desc
    limit 1
  ) latest_subscription on true
  order by coalesce(p.created_at, u.created_at) desc;
end;
$$;

revoke all on function public.admin_list_users() from public;
grant execute on function public.admin_list_users() to authenticated;

create or replace function public.admin_get_stats()
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  result jsonb;
begin
  perform public.require_app_admin();

  select jsonb_build_object(
    'total_users', (
      select count(*)
      from public.app_user_profiles p
      join auth.users u on u.id = p.user_id
    ),
    'active_subscriptions', (
      select count(*)
      from public.app_user_profiles p
      join auth.users u on u.id = p.user_id
      join lateral (
        select us.status
        from public.user_subscriptions us
        where us.user_id = p.user_id
        order by us.created_at desc nulls last, us.id desc
        limit 1
      ) latest_subscription on true
      where latest_subscription.status in ('active', 'trialing')
    ),
    'total_pantry_items', (
      select count(*)
      from public.pantry_items
      where status = 'available'
    ),
    'total_recipes', (
      select count(*)
      from public.recipes
    )
  )
    into result;

  return result;
end;
$$;

revoke all on function public.admin_get_stats() from public;
grant execute on function public.admin_get_stats() to authenticated;

create or replace function public.admin_delete_user(target_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  caller_user_id uuid;
  target_email text;
  deleted_profile_count integer := 0;
  deleted_auth_count integer := 0;
begin
  caller_user_id := public.require_app_admin();

  if target_user_id is null then
    raise exception 'Target user is required.'
      using errcode = '22023';
  end if;

  if target_user_id = caller_user_id then
    raise exception 'Admins cannot delete their own account from the admin panel.'
      using errcode = '42501';
  end if;

  select u.email
    into target_email
  from auth.users u
  where u.id = target_user_id;

  delete from public.app_user_profiles p
  where p.user_id = target_user_id;
  get diagnostics deleted_profile_count = row_count;

  delete from auth.users u
  where u.id = target_user_id;
  get diagnostics deleted_auth_count = row_count;

  return jsonb_build_object(
    'user_id', target_user_id,
    'email', target_email,
    'deleted_profile', deleted_profile_count > 0,
    'deleted_auth_user', deleted_auth_count > 0
  );
end;
$$;

revoke all on function public.admin_delete_user(uuid) from public;
grant execute on function public.admin_delete_user(uuid) to authenticated;

create or replace function public.admin_prune_auth_user_mismatches()
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  caller_user_id uuid;
  deleted_profile_count integer := 0;
  deleted_auth_count integer := 0;
begin
  caller_user_id := public.require_app_admin();

  delete from public.app_user_profiles p
  where not exists (
    select 1
    from auth.users u
    where u.id = p.user_id
  );
  get diagnostics deleted_profile_count = row_count;

  delete from auth.users u
  where u.id <> caller_user_id
    and not exists (
      select 1
      from public.app_user_profiles p
      where p.user_id = u.id
    );
  get diagnostics deleted_auth_count = row_count;

  return jsonb_build_object(
    'deleted_profiles_without_auth', deleted_profile_count,
    'deleted_auth_users_without_profile', deleted_auth_count
  );
end;
$$;

revoke all on function public.admin_prune_auth_user_mismatches() from public;
grant execute on function public.admin_prune_auth_user_mismatches() to authenticated;
