-- ============================================================
-- Migration: Complete the Business Operating System
-- Builds real, working features for the 16-system BOS instead of
-- static reference text. Covers systems 02, 04, 06, 08, 09, 10, 11, 12
-- (01, 03, 07, 13-16 were already built — Reference Library, Content,
-- Contacts, Pipeline). System 05 gets a new view, not a new table —
-- it's built entirely from Contacts + Reference Library data that
-- already exists.
--
-- Additive only. No existing table is touched.
--
-- HOW TO RUN: Supabase dashboard → SQL Editor → New query → paste
-- this whole file → Run.
-- ============================================================

-- ---------- System 02: Local Knowledge Base ----------
create table if not exists local_knowledge_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  title text not null,
  category text,
  body text not null,
  tags text,
  created_at timestamptz default now()
);

alter table local_knowledge_entries enable row level security;
drop policy if exists "local_knowledge_entries: owner all" on local_knowledge_entries;
create policy "local_knowledge_entries: owner all" on local_knowledge_entries for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------- System 02: Community Intelligence DB ----------
create table if not exists community_resources (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  type text check (type in ('School','HOA','Community Org','Local Business','Event','Other')) default 'Other',
  contact_name text,
  contact_info text,
  notes text,
  created_at timestamptz default now()
);

alter table community_resources enable row level security;
drop policy if exists "community_resources: owner all" on community_resources;
create policy "community_resources: owner all" on community_resources for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------- Systems 02 & 06: Local Intelligence + Research ----------
-- One monthly report covers both — it's the same output your Reference
-- Library's "Monthly Research Checklist" prompt (A1) already describes.
create table if not exists market_updates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  report_date date not null default current_date,
  market_update text,
  development_changes text,
  insurance_updates text,
  school_updates text,
  buyer_takeaway text,
  seller_takeaway text,
  created_at timestamptz default now()
);

alter table market_updates enable row level security;
drop policy if exists "market_updates: owner all" on market_updates;
create policy "market_updates: owner all" on market_updates for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------- System 08: Client Experience & Service Delivery ----------
-- One row per milestone per contact. Seeded with a fixed 8-step journey
-- the first time you open a given Active Client's journey checklist.
create table if not exists client_milestones (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  contact_id uuid references contacts(id) on delete cascade not null,
  milestone text not null,
  completed boolean default false,
  sort_order integer default 0,
  completed_date date,
  created_at timestamptz default now()
);

alter table client_milestones enable row level security;
drop policy if exists "client_milestones: owner all" on client_milestones;
create policy "client_milestones: owner all" on client_milestones for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists client_milestones_contact_idx on client_milestones (contact_id);

-- ---------- System 09: Business Management (Goals) ----------
create table if not exists business_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  title text not null,
  target_metric text,
  target_value numeric,
  current_value numeric default 0,
  target_date date,
  status text check (status in ('Not Started','In Progress','Done')) default 'Not Started',
  created_at timestamptz default now()
);

alter table business_goals enable row level security;
drop policy if exists "business_goals: owner all" on business_goals;
create policy "business_goals: owner all" on business_goals for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------- System 10: Business Performance Review (KPI history) ----------
create table if not exists kpi_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  snapshot_month text not null,
  new_contacts integer default 0,
  referrals integer default 0,
  pipeline_value numeric default 0,
  deals_closed integer default 0,
  notes text,
  created_at timestamptz default now(),
  unique (user_id, snapshot_month)
);

alter table kpi_snapshots enable row level security;
drop policy if exists "kpi_snapshots: owner all" on kpi_snapshots;
create policy "kpi_snapshots: owner all" on kpi_snapshots for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------- System 11: Implementation Priority Roadmap ----------
create table if not exists roadmap_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  phase text check (phase in ('Foundation','Growth','Expansion')) not null,
  title text not null,
  status text check (status in ('Not Started','In Progress','Done')) default 'Not Started',
  notes text,
  sort_order integer default 0,
  created_at timestamptz default now()
);

alter table roadmap_items enable row level security;
drop policy if exists "roadmap_items: owner all" on roadmap_items;
create policy "roadmap_items: owner all" on roadmap_items for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------- System 04: Business Growth (Marketing / Website & SEO) ----------
create table if not exists marketing_campaigns (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  channel text check (channel in ('Social Media','Email','Website/SEO','Print','Event','Referral Program','Other')) default 'Other',
  start_date date,
  end_date date,
  budget numeric,
  status text check (status in ('Planning','Active','Completed','Paused')) default 'Planning',
  results_notes text,
  created_at timestamptz default now()
);

alter table marketing_campaigns enable row level security;
drop policy if exists "marketing_campaigns: owner all" on marketing_campaigns;
create policy "marketing_campaigns: owner all" on marketing_campaigns for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------- System 12: AI Automation ----------
create table if not exists automation_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  description text,
  status text check (status in ('Active','Testing','Paused')) default 'Active',
  time_saved_per_week numeric,
  created_at timestamptz default now()
);

alter table automation_log enable row level security;
drop policy if exists "automation_log: owner all" on automation_log;
create policy "automation_log: owner all" on automation_log for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- No data to migrate — all nine tables start empty. Roadmap Items and
-- Client Milestones seed themselves with sensible defaults from the
-- app on first use (see ARCHITECTURE.md).
-- ============================================================
