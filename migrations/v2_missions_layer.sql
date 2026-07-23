-- ============================================================
-- Migration: V2 Missions Layer
-- Adds a thin layer on top of your EXISTING tables so the Mission
-- Engine can pull one unified daily sequence without duplicating
-- data that already lives in contacts, tasks, habits, content_items,
-- daily_priorities, appointments, etc.
--
-- Design: the mission list itself is computed at read-time in
-- src/services/missions.js by querying your existing tables — this
-- migration only adds the small amount of NEW state that doesn't
-- exist anywhere yet: custom one-off missions, per-item ordering
-- overrides, dismissals/snoozes, and the weekly/monthly prompt log.
--
-- 100% additive. No existing table is altered, renamed, or dropped.
--
-- HOW TO RUN: Supabase dashboard → SQL Editor → New query → paste
-- this whole file → Run.
-- ============================================================

-- ---------- Custom one-off missions (things with no home table) ----------
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

-- ---------- Per-item state: dismissed / snoozed / reordered ----------
-- source_table + source_id identifies which existing row this refers to
-- (e.g. source_table='contacts', source_id=<contact uuid>). This lets the
-- Mission Engine remember "I snoozed this follow-up to tomorrow" without
-- ever touching the contacts table itself.
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

-- ---------- Weekly Reset / Monthly Snapshot prompt log ----------
-- Tracks whether the auto-prompt has already fired for a given
-- Monday/Friday/month-start, so it interrupts once, not every reload.
create table if not exists prompt_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  prompt_type text check (prompt_type in ('weekly_reset', 'weekly_closeout', 'monthly_snapshot')) not null,
  period_marker text not null, -- Monday date / month string, matches existing period_marker convention
  shown_at timestamptz default now(),
  completed boolean default false,
  unique (user_id, prompt_type, period_marker)
);

alter table prompt_log enable row level security;
drop policy if exists "prompt_log: owner all" on prompt_log;
create policy "prompt_log: owner all" on prompt_log
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------- Quarterly business focus (was: Annual Campaign Calendar doc) ----------
create table if not exists quarterly_focus (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  quarter text not null, -- e.g. '2026-Q3'
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

-- ---------- Guided Flow progress (Consultation / New Lead / Content SOPs) ----------
create table if not exists guided_flow_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  flow_key text not null, -- 'new_lead_intake' | 'consultation' | 'content_creation' | 'phone_boundaries'
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

-- No data to migrate — every table above is brand new and starts empty.
-- The Mission Engine reads your EXISTING tables (contacts, tasks, habits,
-- habit_logs, appointments, daily_priorities, content_items, content_logs,
-- roadmap_items) live, at request time — see src/services/missions.js.
-- ============================================================
