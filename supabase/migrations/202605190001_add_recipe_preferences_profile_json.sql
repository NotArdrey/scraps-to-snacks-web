alter table public.app_user_profiles
  add column if not exists recipe_preferences jsonb not null default '{}'::jsonb;

alter table public.app_user_profiles
  drop constraint if exists app_user_profiles_recipe_preferences_object;

alter table public.app_user_profiles
  add constraint app_user_profiles_recipe_preferences_object
  check (jsonb_typeof(recipe_preferences) = 'object');

comment on column public.app_user_profiles.recipe_preferences is
  'Extended recipe personalization preferences such as custom diets, allergy controls, cuisine, budget, skill, servings, and macro targets.';
