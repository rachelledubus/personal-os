-- ============================================================
-- Migration: fix a table-name collision (correction)
-- ============================================================
-- v2_weekly_reflection_layer.sql created a `weekly_reviews` table for
-- the Business Dashboard's reflection card, without checking whether
-- that name was already in use. It was: WeeklyResetModal.jsx's
-- "Friday Close-Out" prompt already reads/writes a `weekly_reviews`
-- table with `wins` / `challenges` / `next_week_priorities` columns —
-- a different feature, different question set, unrelated to Business.
--
-- This creates a correctly-named table for the Business reflection
-- feature and leaves the original `weekly_reviews` alone except for
-- a defensive, additive repair: if `weekly_reviews` only exists
-- because the earlier migration created it fresh (i.e. Friday
-- Close-Out was never actually able to save before now), it will be
-- missing the `wins`/`challenges` columns it actually needs — this
-- adds them if missing. Nothing is dropped or altered destructively.
-- ============================================================

create table if not exists weekly_business_reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  week_start date not null,
  what_worked text,
  what_didnt text,
  needs_attention text,
  next_week_priorities text,
  updated_at timestamptz default now(),
  unique (user_id, week_start)
);

alter table weekly_business_reviews enable row level security;
drop policy if exists "weekly_business_reviews: owner all" on weekly_business_reviews;
create policy "weekly_business_reviews: owner all" on weekly_business_reviews
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Defensive repair of the original table — additive only, safe to run
-- whether or not this was ever actually a problem for you.
alter table weekly_reviews add column if not exists wins text;
alter table weekly_reviews add column if not exists challenges text;
