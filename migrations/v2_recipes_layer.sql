-- ============================================================
-- Migration: Recipes with serving-scaled ingredients
-- ============================================================
-- Separate from `foods` on purpose — a food is one item with fixed
-- macros (a banana, a can of tuna). A recipe is made of several
-- ingredients that scale together when servings change (double the
-- servings, double every ingredient's quantity and macro contribution).
-- Ingredients are free-text + per-serving quantity/macros, not FK'd to
-- `foods` — real recipes call for things ("2 cups flour") that don't
-- always map to an existing single-food row, and forcing that match
-- would block entering a recipe for something small and simple.
-- ============================================================

create table if not exists recipes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  base_servings integer not null default 1,
  instructions text,
  created_at timestamptz default now()
);

alter table recipes enable row level security;
drop policy if exists "recipes: owner all" on recipes;
create policy "recipes: owner all" on recipes
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table if not exists recipe_ingredients (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  recipe_id uuid references recipes(id) on delete cascade not null,
  name text not null,
  quantity_per_serving numeric not null default 0,
  unit text default '',
  calories_per_serving numeric default 0,
  protein_per_serving numeric default 0,
  carbs_per_serving numeric default 0,
  fat_per_serving numeric default 0,
  sort_order integer default 0
);

alter table recipe_ingredients enable row level security;
drop policy if exists "recipe_ingredients: owner all" on recipe_ingredients;
create policy "recipe_ingredients: owner all" on recipe_ingredients
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists recipe_ingredients_recipe_idx on recipe_ingredients (recipe_id);
