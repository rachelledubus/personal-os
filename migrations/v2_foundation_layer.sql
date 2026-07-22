-- ============================================================
-- Migration: V2 Foundation Layer (Goals / Projects / Time Blocks / Preferences)
-- This does NOT add any AI functionality. It exists purely so the data
-- model has the right shape for one to be added later without a
-- schema rewrite — clean relationships, clear ownership, and one
-- place (user_preferences) a future AI layer can read personal
-- context from instead of having to infer it.
--
-- Additive only. No existing table touched, no existing behavior
-- changes. `tasks` gains two nullable columns; everything else new
-- tables.
--
-- ARCHITECTURE NOTES (why it's shaped this way):
-- - Tasks vs. Time Blocks vs. Recurring routines stay three separate
--   concepts, per your instruction:
--     * `tasks`        = one-time or project work, no fixed time
--     * `time_blocks`  = calendar-scheduled, has a start/end time
--     * habits/chores/content_items (existing tables) = recurring
--       routines that reset on a cadence — untouched, already correct
-- - `goals` -> `projects` -> `tasks` is a clean one-way chain (a task
--   can belong to a project, a project can belong to a goal, neither
--   is required) — this is exactly the "Goals connect to projects and
--   outcomes" / "Projects can contain related tasks" requirement.
-- - `user_preferences` is deliberately generic (jsonb `value`, a
--   `category` and `key`) rather than a rigid column-per-setting
--   table, so new preference types can be added later without a
--   migration — this is the main thing a future AI layer would read
--   from to personalize anything.
-- - Every new table follows the exact same RLS pattern as every
--   existing table in this app (auth.uid() = user_id) — no exceptions,
--   nothing here needs to be readable cross-user.
--
-- HOW TO RUN: Supabase dashboard → SQL Editor → New query → paste
-- this whole file → Run.
-- ============================================================

-- ---------- Goals ----------
create table if not exists goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  title text not null,
  description text,
  category text check (category in ('Personal','Business','Health','Financial','Other')) default 'Other',
  target_date date,
  status text check (status in ('Not Started','In Progress','Achieved','Paused','Abandoned')) default 'Not Started',
  target_metric text,
  target_value numeric,
  current_value numeric default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table goals enable row level security;
drop policy if exists "goals: owner all" on goals;
create policy "goals: owner all" on goals
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------- Projects (belong to a goal, optional) ----------
create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  goal_id uuid references goals(id) on delete set null,
  title text not null,
  description text,
  status text check (status in ('Planning','Active','Blocked','Done','Archived')) default 'Planning',
  due_date date,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table projects enable row level security;
drop policy if exists "projects: owner all" on projects;
create policy "projects: owner all" on projects
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists projects_user_goal_idx on projects (user_id, goal_id);

-- ---------- Extend existing `tasks` table (additive columns only) ----------
-- Nullable, defaults to null — every existing task keeps working exactly
-- as before. A task can now optionally belong to a project and/or link
-- directly to a goal (for tasks that serve a goal without a project
-- layer in between).
alter table tasks add column if not exists project_id uuid references projects(id) on delete set null;
alter table tasks add column if not exists goal_id uuid references goals(id) on delete set null;

create index if not exists tasks_project_idx on tasks (project_id);

-- ---------- Time Blocks (calendar-scheduled, separate from tasks) ----------
-- A time block CAN reference a task (turning a task into a scheduled
-- block on the calendar) but doesn't have to — it can also be a plain
-- scheduled block with its own title (e.g. "Research Block"). This is
-- what the Planner's day/week view is actually built on, distinct from
-- `appointments` (external, fixed commitments) and `tasks` (work with
-- no fixed time until scheduled).
create table if not exists time_blocks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  task_id uuid references tasks(id) on delete cascade,
  title text not null,
  block_date date not null,
  start_time time,
  end_time time,
  track text check (track in ('personal','business')) default 'personal',
  is_recurring boolean default false,
  recurrence_rule jsonb, -- e.g. {"freq":"weekly","days":["mon","wed","fri"]} — read by a future scheduler, not parsed anywhere yet
  created_at timestamptz default now()
);

alter table time_blocks enable row level security;
drop policy if exists "time_blocks: owner all" on time_blocks;
create policy "time_blocks: owner all" on time_blocks
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists time_blocks_user_date_idx on time_blocks (user_id, block_date);

-- ---------- Milestones (belong to a project OR a goal) ----------
create table if not exists milestones (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  project_id uuid references projects(id) on delete cascade,
  goal_id uuid references goals(id) on delete cascade,
  title text not null,
  due_date date,
  completed boolean default false,
  completed_date date,
  sort_order integer default 0,
  created_at timestamptz default now()
);

alter table milestones enable row level security;
drop policy if exists "milestones: owner all" on milestones;
create policy "milestones: owner all" on milestones
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------- User Preferences (generic, future-AI-readable) ----------
-- Deliberately schema-light: category + key + jsonb value. This is
-- the one place a future AI layer reads "how does Rachelle like this
-- handled" from, rather than that logic being hardcoded into
-- individual components. Examples of rows this could hold later:
--   ('nutrition', 'default_macro_split', {"protein":150,"carbs":185,"fat":55})
--   ('mission_engine', 'morning_start_time', {"time":"07:00"})
--   ('communication', 'tone', {"style":"warm, direct, no fluff"})
-- No rows are inserted by this migration — this just creates the
-- shape so features can start writing to it incrementally.
create table if not exists user_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  category text not null,
  key text not null,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz default now(),
  unique (user_id, category, key)
);

alter table user_preferences enable row level security;
drop policy if exists "user_preferences: owner all" on user_preferences;
create policy "user_preferences: owner all" on user_preferences
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------- Historical snapshot log (generic, for future pattern-finding) ----------
-- A single append-only table any module can log a dated snapshot to,
-- rather than each feature inventing its own history table (kpi_snapshots
-- already does this for one case — this generalizes the pattern for
-- everything else, without replacing kpi_snapshots itself).
create table if not exists activity_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  source_table text not null,
  source_id uuid,
  event_type text not null, -- e.g. 'completed', 'created', 'skipped', 'snoozed'
  event_date date not null default current_date,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

alter table activity_log enable row level security;
drop policy if exists "activity_log: owner all" on activity_log;
create policy "activity_log: owner all" on activity_log
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists activity_log_user_date_idx on activity_log (user_id, event_date);
create index if not exists activity_log_source_idx on activity_log (source_table, source_id);

-- No data to migrate — every new table starts empty, and the two new
-- columns on `tasks` default to null, so no existing row changes.
-- ============================================================
