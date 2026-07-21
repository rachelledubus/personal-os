-- ============================================================
-- Migration: Meal Planner
-- Adds the ability to PLAN meals ahead of time (against a future
-- plan_date) rather than only logging what's already been eaten.
-- Reuses the existing `foods` table entirely — nothing duplicated,
-- meal_plan_items just references it the same way meal_logs does.
--
-- Additive only. No existing table touched.
--
-- HOW TO RUN: Supabase dashboard → SQL Editor → New query → paste
-- this whole file → Run.
-- ============================================================

create table if not exists meal_plan_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  plan_date date not null,
  meal_type text check (meal_type in ('breakfast','lunch','dinner','snacks')) not null,
  food_id uuid references foods(id) on delete cascade,
  servings numeric default 1,
  created_at timestamptz default now()
);

alter table meal_plan_items enable row level security;
drop policy if exists "meal_plan_items: owner all" on meal_plan_items;
create policy "meal_plan_items: owner all" on meal_plan_items
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists meal_plan_items_user_date_idx on meal_plan_items (user_id, plan_date);

create table if not exists meal_plan_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  items jsonb not null default '[]'::jsonb,
  created_at timestamptz default now()
);

alter table meal_plan_templates enable row level security;
drop policy if exists "meal_plan_templates: owner all" on meal_plan_templates;
create policy "meal_plan_templates: owner all" on meal_plan_templates
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- No data to migrate — both tables start empty.
-- ============================================================
