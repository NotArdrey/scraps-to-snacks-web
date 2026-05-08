create or replace function public.admin_delete_user_app_data(target_user_id uuid, target_schema name)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  deleted_analytics_count integer := 0;
  deleted_cooking_count integer := 0;
  deleted_recipe_count integer := 0;
  deleted_expiry_count integer := 0;
  deleted_scan_count integer := 0;
  deleted_pantry_event_count integer := 0;
  deleted_pantry_item_count integer := 0;
  deleted_household_member_count integer := 0;
  deleted_household_count integer := 0;
begin
  if to_regnamespace(target_schema::text) is null then
    return jsonb_build_object('schema', target_schema, 'skipped', true);
  end if;

  if to_regclass(format('%I.analytics_events', target_schema)) is not null then
    execute format(
      'delete from %I.analytics_events ae
       where ae.user_id = $1
          or ae.household_id in (select h.id from %I.households h where h.owner_user_id = $1)',
      target_schema,
      target_schema
    )
    using target_user_id;
    get diagnostics deleted_analytics_count = row_count;
  end if;

  if to_regclass(format('%I.cooking_events', target_schema)) is not null then
    execute format(
      'delete from %I.cooking_events ce
       where ce.user_id = $1
          or ce.recipe_id in (select r.id from %I.recipes r where r.generated_by_user_id = $1)',
      target_schema,
      target_schema
    )
    using target_user_id;
    get diagnostics deleted_cooking_count = row_count;
  end if;

  if to_regclass(format('%I.saved_recipes', target_schema)) is not null then
    execute format(
      'delete from %I.saved_recipes sr
       where sr.user_id = $1
          or sr.recipe_id in (select r.id from %I.recipes r where r.generated_by_user_id = $1)',
      target_schema,
      target_schema
    )
    using target_user_id;
  end if;

  if to_regclass(format('%I.recipes', target_schema)) is not null then
    execute format('delete from %I.recipes r where r.generated_by_user_id = $1', target_schema)
    using target_user_id;
    get diagnostics deleted_recipe_count = row_count;
  end if;

  if to_regclass(format('%I.expiry_predictions', target_schema)) is not null then
    execute format(
      'delete from %I.expiry_predictions ep
       where ep.pantry_item_id in (
           select pi.id
           from %I.pantry_items pi
           where pi.created_by_user_id = $1
              or pi.household_id in (select h.id from %I.households h where h.owner_user_id = $1)
         )
          or ep.scan_job_id in (
           select sj.id
           from %I.scan_jobs sj
           where sj.user_id = $1
              or sj.household_id in (select h.id from %I.households h where h.owner_user_id = $1)
         )',
      target_schema,
      target_schema,
      target_schema,
      target_schema,
      target_schema
    )
    using target_user_id;
    get diagnostics deleted_expiry_count = row_count;
  end if;

  if to_regclass(format('%I.scan_jobs', target_schema)) is not null then
    execute format(
      'delete from %I.scan_jobs sj
       where sj.user_id = $1
          or sj.household_id in (select h.id from %I.households h where h.owner_user_id = $1)',
      target_schema,
      target_schema
    )
    using target_user_id;
    get diagnostics deleted_scan_count = row_count;
  end if;

  if to_regclass(format('%I.pantry_item_events', target_schema)) is not null then
    execute format(
      'delete from %I.pantry_item_events pie
       where pie.actor_user_id = $1
          or pie.pantry_item_id in (
           select pi.id
           from %I.pantry_items pi
           where pi.created_by_user_id = $1
              or pi.household_id in (select h.id from %I.households h where h.owner_user_id = $1)
         )',
      target_schema,
      target_schema,
      target_schema
    )
    using target_user_id;
    get diagnostics deleted_pantry_event_count = row_count;
  end if;

  if to_regclass(format('%I.pantry_items', target_schema)) is not null then
    execute format(
      'delete from %I.pantry_items pi
       where pi.created_by_user_id = $1
          or pi.household_id in (select h.id from %I.households h where h.owner_user_id = $1)',
      target_schema,
      target_schema
    )
    using target_user_id;
    get diagnostics deleted_pantry_item_count = row_count;
  end if;

  if to_regclass(format('%I.household_members', target_schema)) is not null then
    execute format('delete from %I.household_members hm where hm.user_id = $1', target_schema)
    using target_user_id;
    get diagnostics deleted_household_member_count = row_count;
  end if;

  if to_regclass(format('%I.households', target_schema)) is not null then
    execute format('delete from %I.households h where h.owner_user_id = $1', target_schema)
    using target_user_id;
    get diagnostics deleted_household_count = row_count;
  end if;

  return jsonb_build_object(
    'schema', target_schema,
    'deleted_analytics', deleted_analytics_count,
    'deleted_cooking_events', deleted_cooking_count,
    'deleted_recipes', deleted_recipe_count,
    'deleted_expiry_predictions', deleted_expiry_count,
    'deleted_scan_jobs', deleted_scan_count,
    'deleted_pantry_events', deleted_pantry_event_count,
    'deleted_pantry_items', deleted_pantry_item_count,
    'deleted_household_members', deleted_household_member_count,
    'deleted_households', deleted_household_count
  );
end;
$$;

revoke all on function public.admin_delete_user_app_data(uuid, name) from public;
revoke all on function public.admin_delete_user_app_data(uuid, name) from anon;
revoke all on function public.admin_delete_user_app_data(uuid, name) from authenticated;

create or replace function public.admin_delete_user(target_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  caller_user_id uuid;
  target_email text;
  public_cleanup jsonb;
  app_cleanup jsonb;
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

  public_cleanup := public.admin_delete_user_app_data(target_user_id, 'public'::name);
  app_cleanup := public.admin_delete_user_app_data(target_user_id, 'app'::name);

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
    'deleted_auth_user', deleted_auth_count > 0,
    'cleanup', jsonb_build_array(public_cleanup, app_cleanup)
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
  target_record record;
  deleted_profile_count integer := 0;
  deleted_auth_count integer := 0;
  current_deleted_auth_count integer := 0;
begin
  caller_user_id := public.require_app_admin();

  delete from public.app_user_profiles p
  where not exists (
    select 1
    from auth.users u
    where u.id = p.user_id
  );
  get diagnostics deleted_profile_count = row_count;

  for target_record in
    select u.id
    from auth.users u
    where u.id <> caller_user_id
      and not exists (
        select 1
        from public.app_user_profiles p
        where p.user_id = u.id
      )
  loop
    perform public.admin_delete_user_app_data(target_record.id, 'public'::name);
    perform public.admin_delete_user_app_data(target_record.id, 'app'::name);

    delete from auth.users u
    where u.id = target_record.id;
    get diagnostics current_deleted_auth_count = row_count;
    deleted_auth_count := deleted_auth_count + current_deleted_auth_count;
  end loop;

  return jsonb_build_object(
    'deleted_profiles_without_auth', deleted_profile_count,
    'deleted_auth_users_without_profile', deleted_auth_count
  );
end;
$$;

revoke all on function public.admin_prune_auth_user_mismatches() from public;
grant execute on function public.admin_prune_auth_user_mismatches() to authenticated;

notify pgrst, 'reload schema';
