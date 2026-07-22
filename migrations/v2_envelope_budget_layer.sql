-- ============================================================
-- Migration: Envelope-style budget ("every dollar assigned a home")
-- ============================================================
-- Additive only. Doesn't touch finance_entries, bills, or the existing
-- category_budgets (target-vs-actual) system — this is a new, separate
-- way of looking at money, sitting alongside what already exists, not
-- replacing it at the database level.
--
-- budget_setup: one row per user, holds the current "pot" total she's
-- dividing up (e.g. this paycheck). Editable any time.
--
-- budget_envelopes: her own categories, fully user-managed (add, edit,
-- rename, delete) — nothing hardcoded, unlike category_budgets which
-- pulls from the shared CATEGORY_LISTS. "Spent" isn't stored here —
-- it's computed live from finance_entries by matching category name,
-- same pattern the rest of the finance system already uses, so nothing
-- is double-entered.
-- ============================================================

create table if not exists budget_setup (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null unique,
  starting_amount numeric not null default 0,
  updated_at timestamptz default now()
);

alter table budget_setup enable row level security;
drop policy if exists "budget_setup: owner all" on budget_setup;
create policy "budget_setup: owner all" on budget_setup
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table if not exists budget_envelopes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  assigned_amount numeric not null default 0,
  sort_order integer default 0,
  created_at timestamptz default now()
);

alter table budget_envelopes enable row level security;
drop policy if exists "budget_envelopes: owner all" on budget_envelopes;
create policy "budget_envelopes: owner all" on budget_envelopes
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists budget_envelopes_user_idx on budget_envelopes (user_id, sort_order);
