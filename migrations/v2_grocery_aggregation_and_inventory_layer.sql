-- ============================================================
-- GROCERY AGGREGATION + KITCHEN INVENTORY
-- Three additive pieces:
-- 1. grocery_items gains real quantity tracking (previously name-only,
--    duplicate ingredients across recipes just deduped by string match
--    with no summed amount).
-- 2. ingredient_shopping_units — the editable conversion table. There's
--    no universal formula from "3 cups flour" to a store unit, so this
--    is a user-maintained mapping: ingredient name -> how many recipe
--    units make one shopping unit, and what to call that shopping unit.
-- 3. kitchen_inventory — what's already on hand, subtracted from the
--    aggregated total before the shopping-unit conversion is applied.
-- ============================================================

alter table grocery_items add column if not exists total_quantity numeric default null;
alter table grocery_items add column if not exists unit text default null;

create table if not exists ingredient_shopping_units (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  ingredient_name text not null,
  recipe_unit text,
  qty_per_shopping_unit numeric not null default 1,
  shopping_unit_label text not null,
  created_at timestamptz default now(),
  unique (user_id, ingredient_name)
);
alter table ingredient_shopping_units enable row level security;
drop policy if exists "ingredient_shopping_units: owner all" on ingredient_shopping_units;
create policy "ingredient_shopping_units: owner all" on ingredient_shopping_units
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table if not exists kitchen_inventory (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  ingredient_name text not null,
  quantity numeric not null default 0,
  unit text,
  updated_at timestamptz default now(),
  unique (user_id, ingredient_name)
);
alter table kitchen_inventory enable row level security;
drop policy if exists "kitchen_inventory: owner all" on kitchen_inventory;
create policy "kitchen_inventory: owner all" on kitchen_inventory
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
