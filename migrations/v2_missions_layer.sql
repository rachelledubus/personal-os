-- ============================================================
-- Migration: V2 Missions Layer — unchanged from the prior V2 pass.
-- Included for a complete migrations folder; skip if already run.
-- ============================================================

create table if not exists custom_missions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  title text not null,
  track text check (track in ('personal', 'business')) not null default 'personal',
  mission_date date not null default current_date,
  done boolean default false,
  sort_order integer default 0,
  created_at timestamptz default now()
);

alter table custom_missions enable row level security;
drop policy if exists "custom_missions: owner all" on custom_missions;
create policy "custom_missions: owner all" on custom_missions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists custom_missions_user_date_idx on custom_missions (user_id, mission_date);

create table if not exists mission_item_state (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  source_table text not null,
  source_id uuid not null,
  mission_date date not null default current_date,
  dismissed boolean default false,
  snoozed_to date,
  sort_order integer,
  created_at timestamptz default now(),
  unique (user_id, source_table, source_id, mission_date)
);

alter table mission_item_state enable row level security;
drop policy if exists "mission_item_state: owner all" on mission_item_state;
create policy "mission_item_state: owner all" on mission_item_state
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table if not exists prompt_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  prompt_type text check (prompt_type in ('weekly_reset', 'weekly_closeout', 'monthly_snapshot')) not null,
  period_marker text not null,
  shown_at timestamptz default now(),
  completed boolean default false,
  unique (user_id, prompt_type, period_marker)
);

alter table prompt_log enable row level security;
drop policy if exists "prompt_log: owner all" on prompt_log;
create policy "prompt_log: owner all" on prompt_log
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table if not exists quarterly_focus (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  quarter text not null,
  audience_focus text,
  theme text,
  notes text,
  created_at timestamptz default now(),
  unique (user_id, quarter)
);

alter table quarterly_focus enable row level security;
drop policy if exists "quarterly_focus: owner all" on quarterly_focus;
create policy "quarterly_focus: owner all" on quarterly_focus
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table if not exists guided_flow_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  flow_key text not null,
  contact_id uuid references contacts(id) on delete set null,
  current_step integer default 0,
  answers jsonb default '{}'::jsonb,
  completed boolean default false,
  started_at timestamptz default now(),
  completed_at timestamptz
);

alter table guided_flow_runs enable row level security;
drop policy if exists "guided_flow_runs: owner all" on guided_flow_runs;
create policy "guided_flow_runs: owner all" on guided_flow_runs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists guided_flow_runs_user_flow_idx on guided_flow_runs (user_id, flow_key, completed);
