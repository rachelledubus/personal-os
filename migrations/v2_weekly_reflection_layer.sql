-- ============================================================
-- Migration: Weekly Reflection (Realtor OS Phase 1 — Weekly
-- Business Review gap closure)
-- ============================================================
-- The Weekly Business Review module (PRD doc 02, Module 5) has two
-- halves: Activity/Metrics and Reflection. daily_checkin + weekly_targets
-- (v2_business_os_rebuild_layer.sql) already cover the first half in
-- real, working form. The second half — the four reflection questions
-- (What worked? What didn't? What needs attention? What should I
-- prioritize next week?) — has never had anywhere to live. This closes
-- that gap. Additive only; nothing existing changes.
-- ============================================================

create table if not exists weekly_reviews (
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

alter table weekly_reviews enable row level security;
drop policy if exists "weekly_reviews: owner all" on weekly_reviews;
create policy "weekly_reviews: owner all" on weekly_reviews
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
