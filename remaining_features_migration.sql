-- ============================================================
-- Migration: Remaining features
-- Adds every table needed for this session's work:
--   - Routine & Chores checklists (replaces localStorage)
--   - Today's Priorities (replaces localStorage)
--   - Quick Capture inbox (replaces localStorage)
--   - Content Calendar (Business tab)
--   - Public Tools: submissions + the owner-editable neighborhood
--     profiles shown on the public Neighborhood Explorer
--
-- Additive only — no existing table is touched.
--
-- HOW TO RUN: Supabase dashboard → SQL Editor → New query → paste
-- this whole file → Run.
-- ============================================================

-- ---------- Routine & Chores checklists ----------
-- Generalized version of the habits/content-checklist pattern:
-- one items table + one logs table, parameterized by list_key
-- instead of five separate copies of the same two tables.
create table if not exists checklist_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  list_key text check (list_key in ('routine-morning','routine-evening','chores-daily','chores-weekly','chores-monthly')) not null,
  name text not null,
  sort_order integer default 0,
  archived boolean default false,
  created_at timestamptz default now()
);

alter table checklist_items enable row level security;
drop policy if exists "checklist_items: owner all" on checklist_items;
create policy "checklist_items: owner all" on checklist_items for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table if not exists checklist_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  item_id uuid references checklist_items(id) on delete cascade not null,
  period_marker text not null,
  completed boolean default true,
  unique (item_id, period_marker)
);

alter table checklist_logs enable row level security;
drop policy if exists "checklist_logs: owner all" on checklist_logs;
create policy "checklist_logs: owner all" on checklist_logs for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists checklist_logs_user_marker_idx on checklist_logs (user_id, period_marker);

-- ---------- Today's Priorities ----------
create table if not exists daily_priorities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  priority_date date not null default current_date,
  content text not null,
  done boolean default false,
  created_at timestamptz default now()
);

alter table daily_priorities enable row level security;
drop policy if exists "daily_priorities: owner all" on daily_priorities;
create policy "daily_priorities: owner all" on daily_priorities for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists daily_priorities_user_date_idx on daily_priorities (user_id, priority_date);

-- ---------- Quick Capture inbox ----------
create table if not exists inbox_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  content text not null,
  created_at timestamptz default now()
);

alter table inbox_items enable row level security;
drop policy if exists "inbox_items: owner all" on inbox_items;
create policy "inbox_items: owner all" on inbox_items for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------- Content Calendar ----------
create table if not exists content_calendar_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  title text not null,
  platform text,
  scheduled_date date,
  status text check (status in ('Idea','Drafted','Scheduled','Posted')) default 'Idea',
  notes text,
  created_at timestamptz default now()
);

alter table content_calendar_items enable row level security;
drop policy if exists "content_calendar_items: owner all" on content_calendar_items;
create policy "content_calendar_items: owner all" on content_calendar_items for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists content_calendar_user_date_idx on content_calendar_items (user_id, scheduled_date);

-- ============================================================
-- PUBLIC TOOLS — the first no-login surface in the app.
-- These two tables are NOT scoped by user_id (this is a single-owner
-- app; there's no per-tenant separation to enforce), so their RLS
-- policies work differently from every other table above:
-- ============================================================

-- ---------- Public submissions (quiz/planner/etc. results) ----------
-- Anyone (including anonymous visitors) can INSERT. Only a signed-in
-- user can SELECT/UPDATE/DELETE — reviewed from the Business tab's
-- "Public Tool Submissions" card.
create table if not exists public_submissions (
  id uuid primary key default gen_random_uuid(),
  tool_name text not null,
  name text,
  email text,
  phone text,
  answers jsonb,
  summary text,
  converted boolean default false,
  created_at timestamptz default now()
);

alter table public_submissions enable row level security;

drop policy if exists "public_submissions: anyone can insert" on public_submissions;
create policy "public_submissions: anyone can insert" on public_submissions
  for insert
  with check (true);

drop policy if exists "public_submissions: authenticated can manage" on public_submissions;
create policy "public_submissions: authenticated can manage" on public_submissions
  for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- ---------- Neighborhood profiles (owner-editable, publicly readable) ----------
-- Filled in from the Business tab's "Neighborhood Profiles" card;
-- displayed as-is on the public Neighborhood Explorer tool. Anyone
-- can read; only a signed-in user can write.
create table if not exists neighborhood_profiles (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  price_range text,
  vibe text,
  commute_notes text,
  schools_notes text,
  best_for text,
  updated_at timestamptz default now()
);

alter table neighborhood_profiles enable row level security;

drop policy if exists "neighborhood_profiles: anyone can read" on neighborhood_profiles;
create policy "neighborhood_profiles: anyone can read" on neighborhood_profiles
  for select
  using (true);

drop policy if exists "neighborhood_profiles: authenticated can manage" on neighborhood_profiles;
create policy "neighborhood_profiles: authenticated can manage" on neighborhood_profiles
  for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- No data to migrate — Routine/Chores/Priorities/Inbox all start
-- empty and self-seed with the same defaults the old localStorage
-- versions used, the first time you open each tab. Content Calendar,
-- Public Submissions, and Neighborhood Profiles are brand new.
-- ============================================================
