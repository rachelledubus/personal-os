-- ============================================================
-- DEBT TABLE FIX — follow-up to v2_debt_tracker_layer.sql
-- Addresses a reported "Could not find the 'debt_type' column of
-- 'debts' in the schema cache" error. Two possible causes, this
-- covers both: (1) a stale PostgREST schema cache — running any
-- ALTER TABLE forces a fresh reload as a side effect, or (2) a
-- `debts` table already existed before this feature was built,
-- which "create table if not exists" would have silently left
-- alone rather than adding the columns this feature needs.
-- Idempotent — safe to run regardless of which case applies, or
-- even if the table is already correct.
-- ============================================================

alter table debts add column if not exists debt_type text check (debt_type in ('Credit Card', 'Student Loan', 'Auto Loan', 'Mortgage', 'Personal Loan', 'Medical', 'Other')) default 'Other';
alter table debts add column if not exists original_balance numeric;
alter table debts add column if not exists current_balance numeric not null default 0;
alter table debts add column if not exists interest_rate numeric;
alter table debts add column if not exists minimum_payment numeric;
alter table debts add column if not exists due_day integer check (due_day between 1 and 31);
alter table debts add column if not exists notes text;
alter table debts add column if not exists created_at timestamptz default now();

-- ============================================================
-- Cleanup: "Real Payment Guide" was a duplicate of "Future Home
-- Plan" under an earlier name — same audience, same purpose, from
-- before the real Website-Build content existed. Removing the
-- superseded one. Safe to run even if you never had this row.
-- ============================================================
delete from lead_magnets where name = 'Real Payment Guide';
