-- ============================================================
-- Migration: V2 Foundation Layer (Goals / Projects / Time Blocks / Preferences)
-- Unchanged from the prior V2 pass. Included here for a complete,
-- ready-to-run migrations folder — skip if you've already run it.
-- ============================================================

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

alter table tasks add column if not exists project_id uuid references projects(id) on delete set null;
alter table tasks add column if not exists goal_id uuid references goals(id) on delete set null;

create index if not exists tasks_project_idx on tasks (project_id);

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
  recurrence_rule jsonb,
  created_at timestamptz default now()
);

alter table time_blocks enable row level security;
drop policy if exists "time_blocks: owner all" on time_blocks;
create policy "time_blocks: owner all" on time_blocks
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists time_blocks_user_date_idx on time_blocks (user_id, block_date);

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

create table if not exists activity_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  source_table text not null,
  source_id uuid,
  event_type text not null,
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
