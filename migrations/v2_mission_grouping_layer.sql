-- ============================================================
-- Migration: Real Mission grouping (Naming Dictionary alignment)
-- ============================================================
-- Resolves a real terminology conflict: the Naming & Terminology
-- Dictionary defines "Mission" as an optional higher-level grouping
-- of several Tasks under one outcome (e.g. "Prepare for consultation"
-- containing 3 tasks) — but the code previously used "mission" to mean
-- a single item on Today's list. That code-level concept has been
-- renamed to "Today Items" (see todayItems.js) — this migration adds
-- the actual grouping concept the dictionary describes, previously
-- missing entirely.
--
-- Deliberately NOT nested under Milestones — the dictionary's full
-- chain is Goal -> Milestones -> Missions -> Tasks, but Milestones
-- already exists for a different purpose (Business Roadmap sub-tasks,
-- some tied directly to goals). Forcing a 4-layer hierarchy nobody
-- asked for isn't worth the complexity; Mission just optionally
-- attaches straight to a Goal, matching the dictionary's own "Official
-- Use: Optional higher-level grouping" language.
-- ============================================================

create table if not exists missions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  goal_id uuid references goals(id) on delete set null,
  title text not null,
  status text not null default 'active', -- 'active' | 'completed'
  created_at timestamptz default now(),
  completed_at timestamptz
);

alter table missions enable row level security;
drop policy if exists "missions: owner all" on missions;
create policy "missions: owner all" on missions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists missions_user_idx on missions (user_id, goal_id);

alter table tasks add column if not exists mission_id uuid references missions(id) on delete set null;
