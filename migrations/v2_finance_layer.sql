-- ============================================================
-- Migration: V2 Finance Layer
-- One unified table for income/expenses/bills — deliberately not three
-- separate tables, since the whole point is low-effort single-row
-- entry regardless of type. Savings goals aren't a new table at all —
-- `goals` already has category='Financial' plus target_value/
-- current_value, which IS a savings goal; the Finance tab just
-- surfaces those with a quick +/- instead of duplicating the concept.
-- ============================================================

create table if not exists finance_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  entry_type text check (entry_type in ('income','expense','bill')) not null,
  category text not null default 'Other',
  amount numeric not null,
  occurred_date date not null default current_date,
  is_recurring boolean not null default false,
  recurrence_day integer check (recurrence_day between 1 and 31),
  notes text,
  created_at timestamptz default now()
);

alter table finance_entries enable row level security;
drop policy if exists "finance_entries: owner all" on finance_entries;
create policy "finance_entries: owner all" on finance_entries
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists finance_entries_user_date_idx on finance_entries (user_id, occurred_date);
create index if not exists finance_entries_user_category_idx on finance_entries (user_id, category);

-- Optional — a budget target only gets created if the person actually
-- sets one. No target for a category just means "show the total,
-- don't show a progress bar" — never a required setup step.
create table if not exists category_budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  category text not null,
  monthly_target numeric not null,
  created_at timestamptz default now(),
  unique (user_id, category)
);

alter table category_budgets enable row level security;
drop policy if exists "category_budgets: owner all" on category_budgets;
create policy "category_budgets: owner all" on category_budgets
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- No data to migrate — both tables start empty. Existing `bills` table
-- is left untouched and still readable; the Finance tab shows both,
-- since nothing should silently disappear.
-- ============================================================
