-- ============================================================
-- Migration: V2 Intelligence Layer
-- Three additions, all additive, none touching existing behavior:
--   1. Fitness — workouts gets session-level columns; ONE new child
--      table (workout_exercises) for the per-exercise data your spec
--      needs. No exercises/sets table existed before this — confirmed
--      by reading every query against `workouts` in the app; nothing
--      duplicated.
--   2. Energy-aware planning — tasks.energy_type, tasks.rollover_count
--      (rolled_over_from already existed but only ever stored the
--      FIRST push date, not a count — needed to detect "avoided"),
--      and a new energy_logs table for check-ins.
--   3. AI decision log — ai_decisions records what the system decided,
--      why, and whether the user accepted/edited/rejected it. This is
--      what "learns over time" actually reads from, not a vague
--      aspiration.
--
-- HOW TO RUN: Supabase dashboard -> SQL Editor -> New query -> paste
-- this whole file -> Run. Run after the three prior V2 migrations
-- (depends on `tasks`, `time_blocks`, `workouts`).
-- ============================================================

-- ---------- Fitness: workouts (session-level, additive columns) ----------
alter table workouts add column if not exists workout_type text;
alter table workouts add column if not exists duration_minutes integer;
alter table workouts add column if not exists completed boolean not null default true;

-- ---------- Fitness: per-exercise data (the new table) ----------
create table if not exists workout_exercises (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  workout_id uuid references workouts(id) on delete cascade not null,
  exercise_name text not null,
  sets integer,
  reps integer,
  weight numeric,
  notes text,
  effort_rating integer check (effort_rating between 1 and 10),
  sort_order integer default 0,
  created_at timestamptz default now()
);

alter table workout_exercises enable row level security;
drop policy if exists "workout_exercises: owner all" on workout_exercises;
create policy "workout_exercises: owner all" on workout_exercises
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists workout_exercises_workout_idx on workout_exercises (workout_id);
-- Powers every analytics query in workoutAnalytics.js (progression,
-- PRs, trends are all "give me this exercise's history, ordered").
create index if not exists workout_exercises_user_name_idx on workout_exercises (user_id, exercise_name);

-- ---------- Energy-aware planning ----------
alter table tasks add column if not exists energy_type text check (energy_type in (
  'Deep Focus','Creative','Social','Administrative','Low Energy'
));
alter table tasks add column if not exists rollover_count integer not null default 0;

create table if not exists energy_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  log_date date not null,
  logged_at timestamptz default now(),
  energy_level text check (energy_level in ('Low','Medium','High')) not null,
  notes text
);

alter table energy_logs enable row level security;
drop policy if exists "energy_logs: owner all" on energy_logs;
create policy "energy_logs: owner all" on energy_logs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists energy_logs_user_date_idx on energy_logs (user_id, log_date, logged_at);

-- ---------- AI decision log ----------
-- Every automated decision (a task assignment, a rollover, a
-- suggested reprioritization) gets one row. user_response is how the
-- system "learns" — not a black box, a queryable history of what was
-- proposed vs. what actually happened.
create table if not exists ai_decisions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  decision_type text check (decision_type in (
    'task_assignment','rollover','energy_adjustment','ai_replan','priority_change'
  )) not null,
  source_table text,
  source_id uuid,
  reasoning text not null,
  inputs_snapshot jsonb default '{}'::jsonb,
  proposed_at timestamptz default now(),
  user_response text check (user_response in ('accepted','edited','rejected')),
  responded_at timestamptz
);

alter table ai_decisions enable row level security;
drop policy if exists "ai_decisions: owner all" on ai_decisions;
create policy "ai_decisions: owner all" on ai_decisions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists ai_decisions_user_date_idx on ai_decisions (user_id, proposed_at desc);

-- No data to migrate. All new/altered columns default to null/0/true
-- where sensible, so every existing workouts/tasks row keeps working
-- unchanged.
-- ============================================================
