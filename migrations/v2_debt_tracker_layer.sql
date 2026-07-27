-- ============================================================
-- DEBT TRACKER (Finance)
-- Balance tracked directly on the debt row (current_balance), not
-- derived from a payment log — simpler, and matches how a real bank/
-- loan statement works. Logging a payment both reduces the balance
-- AND inserts a real finance_entries row, so debt payments show up
-- in the existing monthly spend summary instead of living in an
-- isolated system nothing else can see.
-- ============================================================

create table if not exists debts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  debt_type text check (debt_type in ('Credit Card', 'Student Loan', 'Auto Loan', 'Mortgage', 'Personal Loan', 'Medical', 'Other')) default 'Other',
  original_balance numeric,
  current_balance numeric not null default 0,
  interest_rate numeric,
  minimum_payment numeric,
  due_day integer check (due_day between 1 and 31),
  notes text,
  created_at timestamptz default now()
);
alter table debts enable row level security;
drop policy if exists "debts: owner all" on debts;
create policy "debts: owner all" on debts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
