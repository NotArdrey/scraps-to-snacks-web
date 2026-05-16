alter table public.pantry_items
  add column if not exists estimated_unit_price numeric(10, 2),
  add column if not exists pricing_unit text,
  add column if not exists currency text not null default 'PHP';

comment on column public.pantry_items.estimated_unit_price is 'Optional user-entered pantry item price per pricing_unit, stored in currency.';
comment on column public.pantry_items.pricing_unit is 'Unit that estimated_unit_price applies to, usually the pantry item unit.';
comment on column public.pantry_items.currency is 'Currency code for pantry price fields.';
