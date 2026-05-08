create or replace function public.handle_new_app_user()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  profile_name text;
  owned_household_id uuid;
begin
  profile_name := coalesce(
    nullif(trim(new.raw_user_meta_data->>'display_name'), ''),
    nullif(trim(concat_ws(' ', new.raw_user_meta_data->>'first_name', new.raw_user_meta_data->>'last_name')), ''),
    nullif(trim(split_part(new.email, '@', 1)), ''),
    'My'
  );

  insert into public.app_user_profiles (user_id, display_name)
  values (new.id, profile_name)
  on conflict (user_id) do update
    set
      display_name = coalesce(public.app_user_profiles.display_name, excluded.display_name),
      onboarding_completed_at = null;

  select h.id
    into owned_household_id
  from public.households h
  where h.owner_user_id = new.id
  order by h.created_at asc nulls last, h.id asc
  limit 1;

  if owned_household_id is null then
    insert into public.households (owner_user_id, name)
    values (new.id, coalesce(profile_name, 'My') || '''s Household')
    returning id into owned_household_id;
  end if;

  insert into public.household_members (household_id, user_id, role)
  values (owned_household_id, new.id, 'owner')
  on conflict (household_id, user_id) do update
    set role = 'owner';

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_app_user();

insert into public.app_user_profiles (user_id, display_name)
select
  u.id,
  coalesce(
    nullif(trim(u.raw_user_meta_data->>'display_name'), ''),
    nullif(trim(concat_ws(' ', u.raw_user_meta_data->>'first_name', u.raw_user_meta_data->>'last_name')), ''),
    nullif(trim(split_part(u.email, '@', 1)), ''),
    'My'
  )
from auth.users u
where not exists (
  select 1
  from public.app_user_profiles p
  where p.user_id = u.id
)
on conflict (user_id) do nothing;

do $$
declare
  user_record record;
  owned_household_id uuid;
  profile_name text;
begin
  for user_record in
    select
      u.id,
      u.email,
      u.raw_user_meta_data
    from auth.users u
    where not exists (
      select 1
      from public.households h
      where h.owner_user_id = u.id
    )
  loop
    profile_name := coalesce(
      nullif(trim(user_record.raw_user_meta_data->>'display_name'), ''),
      nullif(trim(concat_ws(' ', user_record.raw_user_meta_data->>'first_name', user_record.raw_user_meta_data->>'last_name')), ''),
      nullif(trim(split_part(user_record.email, '@', 1)), ''),
      'My'
    );

    insert into public.households (owner_user_id, name)
    values (user_record.id, coalesce(profile_name, 'My') || '''s Household')
    returning id into owned_household_id;

    insert into public.household_members (household_id, user_id, role)
    values (owned_household_id, user_record.id, 'owner')
    on conflict (household_id, user_id) do update
      set role = 'owner';
  end loop;
end;
$$;

insert into public.household_members (household_id, user_id, role)
select h.id, h.owner_user_id, 'owner'
from public.households h
where h.owner_user_id is not null
on conflict (household_id, user_id) do update
  set role = 'owner';
