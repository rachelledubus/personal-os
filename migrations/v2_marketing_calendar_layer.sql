-- ============================================================
-- Migration: Marketing Calendar (Realtor OS Phase 1 — Marketing
-- module, Tier 3 start)
-- ============================================================
-- PRD doc 02 Module 4 splits Marketing into three categories: Content
-- Marketing, Relationship Marketing, and Farming Activities. Content
-- Marketing already has a real, working home in content_pieces /
-- ContentTab (brief -> repurpose pipeline). This table intentionally
-- covers what ContentTab does not: dated, non-content marketing
-- activities — check-ins, events, client appreciation, farming,
-- networking, campaigns — so the two systems don't describe the same
-- thing twice. Additive only; nothing existing changes.
-- ============================================================

create table if not exists marketing_activities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  title text not null,
  category text not null,
  activity_date date,
  status text check (status in ('planned', 'completed')) not null default 'planned',
  notes text,
  created_at timestamptz default now()
);

alter table marketing_activities enable row level security;
drop policy if exists "marketing_activities: owner all" on marketing_activities;
create policy "marketing_activities: owner all" on marketing_activities
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Added after the initial version of this file — safe to run whether
-- you're applying this for the first time or already ran the version
-- without this column.
alter table marketing_activities add column if not exists goal_id uuid references goals(id) on delete set null;

create index if not exists marketing_activities_goal_idx on marketing_activities (goal_id);
create index if not exists marketing_activities_date_idx on marketing_activities (user_id, activity_date);
