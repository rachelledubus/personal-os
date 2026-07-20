-- ============================================================
-- Migration: Grocery List
-- Adds the table backing the new automated/interactive Grocery
-- List (Nutrition tab) and the "Add ingredients to grocery list"
-- button on the new Build Your Own Meal feature.
--
-- Additive only — doesn't touch any existing table.
--
-- HOW TO RUN: Supabase dashboard → SQL Editor → New query → paste
-- this whole file → Run.
-- ============================================================

create table if not exists grocery_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  category text not null default 'Other',
  checked boolean default false,
  created_at timestamptz default now()
);

alter table grocery_items enable row level security;
drop policy if exists "grocery_items: owner all" on grocery_items;
create policy "grocery_items: owner all" on grocery_items for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists grocery_items_user_category_idx on grocery_items (user_id, category);

-- No data to migrate — this is a brand new list. It seeds itself
-- automatically the first time you open the Nutrition tab, using the
-- same staple items that used to be hardcoded there.
