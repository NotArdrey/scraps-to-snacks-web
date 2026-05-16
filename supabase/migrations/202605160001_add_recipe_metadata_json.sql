alter table public.recipes
  add column if not exists metadata_json jsonb not null default '{}'::jsonb;

comment on column public.recipes.metadata_json is 'Extensible recipe metadata such as AI-generated recipe cost estimates.';
