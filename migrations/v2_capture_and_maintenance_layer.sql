-- ============================================================
-- Migration: V2 Capture & Maintenance Layer
-- Three additions, all additive:
--   1. capture_items    — universal quick-capture inbox (unsorted -> resolved)
--   2. project_resources — links/files/references attached to a project
--   3. maintenance_items — variable-interval personal/home reminders
-- Plus small additive columns: notes gets project_id/goal_id so a note
-- can attach to a project; tasks gets capture_type for provenance only
-- (never touches the existing category/priority/etc columns).
--
-- Nothing here duplicates goals/projects/milestones/tasks/contacts/
-- notes/content_items — capture_items is a HOLDING PEN that gets
-- resolved INTO those tables, then marked resolved. Once resolved, the
-- capture_items row is just a record of where something came from.
--
-- HOW TO RUN: Supabase dashboard -> SQL Editor -> New query -> paste
-- this whole file -> Run. Run after v2_foundation_layer.sql and
-- v2_life_rhythm_layer.sql (depends on tasks, projects, goals).
-- ============================================================

-- ---------- Universal Capture Inbox ----------
create table if not exists capture_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  raw_text text not null,
  capture_type text check (capture_type in (
    'task','idea','content_idea','note','research','purchase',
    'reminder','opportunity','thought'
  )),
  status text check (status in ('unsorted','organized','archived')) not null default 'unsorted',

  -- AI or manual suggestions — never authoritative until acted on
  suggested_type text,
  suggested_category text,
  suggested_project_id uuid references projects(id) on delete set null,
  suggested_goal_id uuid references goals(id) on delete set null,
  suggested_system text, -- e.g. "CRM", "Content Engine" — free text, matches BOS system names
  suggestion_reasoning text,
  suggested_at timestamptz,

  -- where it ended up once organized — the actual system of record
  resolved_to_table text, -- 'tasks' | 'notes' | 'contacts' | 'content_items' | 'maintenance_items'
  resolved_to_id uuid,
  resolved_at timestamptz,

  created_at timestamptz default now()
);

alter table capture_items enable row level security;
drop policy if exists "capture_items: owner all" on capture_items;
create policy "capture_items: owner all" on capture_items
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists capture_items_user_status_idx on capture_items (user_id, status);

-- ---------- Project resources (links/files/references) ----------
-- Deliberately a link/reference table, not a file-upload table — the
-- rest of the system already links out to Google Docs/Drive rather
-- than hosting files, so this matches that pattern instead of adding
-- a new one.
create table if not exists project_resources (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  project_id uuid references projects(id) on delete cascade not null,
  title text not null,
  url text,
  notes text,
  created_at timestamptz default now()
);

alter table project_resources enable row level security;
drop policy if exists "project_resources: owner all" on project_resources;
create policy "project_resources: owner all" on project_resources
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists project_resources_project_idx on project_resources (project_id);

-- ---------- notes: let a note attach to a project or goal ----------
alter table notes add column if not exists project_id uuid references projects(id) on delete set null;
alter table notes add column if not exists goal_id uuid references goals(id) on delete set null;

create index if not exists notes_project_idx on notes (project_id);

-- ---------- tasks: provenance only, doesn't touch existing columns ----------
alter table tasks add column if not exists capture_type text;

-- ---------- Personal Maintenance (variable-interval reminders) ----------
-- Distinct from `habits` (daily) and `checklist_items` (fixed daily/
-- weekly/monthly chore lists) on purpose: this is for things on an
-- irregular or long interval — medication refills, renewals, HVAC
-- filters, vet visits — where "due soon" matters more than "did it
-- today". Surfaced as a nudge, never force-scheduled into a block.
create table if not exists maintenance_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  title text not null,
  area text check (area in ('home','personal','health','pet','vehicle','finance','other')) not null default 'other',
  interval_days integer, -- null = one-off / no recurrence, just a due date
  last_completed_date date,
  next_due_date date,
  reminder_lead_days integer not null default 3,
  notes text,
  active boolean not null default true,
  created_at timestamptz default now()
);

alter table maintenance_items enable row level security;
drop policy if exists "maintenance_items: owner all" on maintenance_items;
create policy "maintenance_items: owner all" on maintenance_items
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists maintenance_items_user_due_idx on maintenance_items (user_id, next_due_date);

-- No data to migrate. Every new table starts empty; every new column
-- defaults to null, so no existing row (tasks, notes) changes.
-- ============================================================
