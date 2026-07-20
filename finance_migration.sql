-- ============================================================
-- Migration: Finances tab expansion
-- Adds Income & Expenses tracking, Debt Payoff, and Savings Goals,
-- and adds a Personal/Business "account" split across all of it
-- (including the existing Bills table).
--
-- Additive only — no existing table is dropped, and the new
-- `account` column on `bills` defaults to 'Personal' so every
-- existing bill keeps working exactly as before.
--
-- HOW TO RUN: Supabase dashboard → SQL Editor → New query → paste
-- this whole file → Run.
-- ============================================================

-- ---------- Add account split to the existing Bills table ----------
alter table bills add column if not exists account text default 'Personal';

-- ---------- Income & Expenses ledger ----------
create table if not exists transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  type text check (type in ('Income','Expense')) not null,
  account text check (account in ('Personal','Business')) default 'Personal',
  amount numeric not null,
  description text,
  txn_date date not null default current_date,
  is_recurring boolean default false,
  recurrence text check (recurrence in ('Weekly','Biweekly','Monthly','Yearly')),
  created_at timestamptz default now()
);

alter table transactions enable row level security;
drop policy if exists "transactions: owner all" on transactions;
create policy "transactions: owner all" on transactions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists transactions_user_date_idx on transactions (user_id, txn_date);

-- ---------- Debt Payoff tracker ----------
create table if not exists debts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  account text check (account in ('Personal','Business')) default 'Personal',
  original_balance numeric not null,
  current_balance numeric not null,
  interest_rate numeric,
  minimum_payment numeric,
  created_at timestamptz default now()
);

alter table debts enable row level security;
drop policy if exists "debts: owner all" on debts;
create policy "debts: owner all" on debts for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------- Savings Goals ----------
create table if not exists savings_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  account text check (account in ('Personal','Business')) default 'Personal',
  target_amount numeric not null,
  current_amount numeric default 0,
  target_date date,
  created_at timestamptz default now()
);

alter table savings_goals enable row level security;
drop policy if exists "savings_goals: owner all" on savings_goals;
create policy "savings_goals: owner all" on savings_goals for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- No data to migrate for the three new tables — they start empty.
-- Existing bills are untouched aside from gaining account = 'Personal'.
