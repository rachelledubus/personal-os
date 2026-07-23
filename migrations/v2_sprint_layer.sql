-- ============================================================
-- Migration: V2 Sprint Layer (Backlog, Inbox category, Roadmap dates)
-- ============================================================

-- ---------- 1. Future Improvements Workspace (software backlog) ----------
-- Deliberately separate from future_roadmap_ideas (System 00D) — that
-- table is BUSINESS strategy ideas deferred per Decision Rule 4. This
-- one is a software feature backlog for the Personal OS app itself.
-- Different domain, different owner, same "don't lose an idea" job.
create table if not exists product_backlog_ideas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  idea text not null,
  category text,
  created_at timestamptz default now()
);

alter table product_backlog_ideas enable row level security;
drop policy if exists "product_backlog_ideas: owner all" on product_backlog_ideas;
create policy "product_backlog_ideas: owner all" on product_backlog_ideas
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists product_backlog_ideas_user_idx on product_backlog_ideas (user_id, created_at desc);

-- ---------- 2. Inbox: buyer_question capture type ----------
-- The Content Engine (System 03) and Prompt A9 both depend on a
-- "Buyer Question Bank" that had no capture mechanism anywhere in the
-- app — the most obvious gap in the existing capture_type list.
alter table capture_items drop constraint if exists capture_items_capture_type_check;
alter table capture_items add constraint capture_items_capture_type_check
  check (capture_type in (
    'task','idea','content_idea','note','research','purchase',
    'reminder','opportunity','thought','buyer_question'
  ));

-- ---------- 3. Roadmap: real calendar dates, so status is computed ----------
-- Previously `status` was a manual field someone had to remember to
-- flip every Monday. These are real dates — status can be inferred
-- from today vs. the window instead of typed.
alter table roadmap_items add column if not exists start_date date;
alter table roadmap_items add column if not exists end_date date;

-- Backfill the 13 real weeks (Master Build Timeline, Jul 20 - Oct 16,
-- 2026) for anyone who already had the timeline seeded before this
-- migration existed. Safe to run even if week_number is null on custom
-- roadmap items — those rows just don't match any case and stay null.
update roadmap_items set start_date = '2026-07-20', end_date = '2026-07-24' where week_number = 1;
update roadmap_items set start_date = '2026-07-27', end_date = '2026-07-31' where week_number = 2;
update roadmap_items set start_date = '2026-08-03', end_date = '2026-08-07' where week_number = 3;
update roadmap_items set start_date = '2026-08-10', end_date = '2026-08-14' where week_number = 4;
update roadmap_items set start_date = '2026-08-17', end_date = '2026-08-21' where week_number = 5;
update roadmap_items set start_date = '2026-08-24', end_date = '2026-08-28' where week_number = 6;
update roadmap_items set start_date = '2026-08-31', end_date = '2026-09-04' where week_number = 7;
update roadmap_items set start_date = '2026-09-07', end_date = '2026-09-11' where week_number = 8;
update roadmap_items set start_date = '2026-09-14', end_date = '2026-09-18' where week_number = 9;
update roadmap_items set start_date = '2026-09-21', end_date = '2026-09-25' where week_number = 10;
update roadmap_items set start_date = '2026-09-28', end_date = '2026-10-02' where week_number = 11;
update roadmap_items set start_date = '2026-10-05', end_date = '2026-10-09' where week_number = 12;
update roadmap_items set start_date = '2026-10-12', end_date = '2026-10-16' where week_number = 13;

-- No data lost: every new column/table is additive, and the backfill
-- only touches rows that already had a week_number (the seeded
-- Timeline rows) — custom roadmap items you've added are untouched.
-- ============================================================
