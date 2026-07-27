-- ============================================================
-- COMMUNITY RELATIONSHIP SYSTEM (05C)
-- Organizations/places, not people — the manual's own framing table
-- draws this distinction explicitly from Sphere (05B, people you
-- already know) and Professional Network (05D, referral partners),
-- both of which already fit the existing contacts/tiers model.
-- Community doesn't: a civic organization or a Facebook group isn't
-- a "contact" with a name and phone number.
-- ============================================================

create table if not exists community_relationships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  category text,
  location text,
  contact_person text,
  website_social text,
  how_connected text,
  comfort_ladder_level integer default 1,
  notes text,
  last_engaged_date date,
  created_at timestamptz default now()
);
alter table community_relationships enable row level security;
drop policy if exists "community_relationships: owner all" on community_relationships;
create policy "community_relationships: owner all" on community_relationships
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ============================================================
-- RESEARCH OUTPUT LOG (System 06)
-- The manual is explicit that research without a saved output is
-- wasted time ("creating reports nobody reads" is listed as a thing
-- to avoid) — this is where the three real output types the manual
-- defines actually get kept: Monthly Intelligence Report, Client
-- Talking Points, Content Opportunities.
-- ============================================================

create table if not exists research_outputs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  output_type text not null check (output_type in ('intelligence_report', 'talking_points', 'content_opportunity')),
  title text not null,
  -- Shape depends on output_type — kept as jsonb rather than a wide
  -- sparse table, since the three types have genuinely different fields.
  content jsonb not null default '{}'::jsonb,
  created_at timestamptz default now()
);
alter table research_outputs enable row level security;
drop policy if exists "research_outputs: owner all" on research_outputs;
create policy "research_outputs: owner all" on research_outputs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ============================================================
-- CLIENT DISCOVERY FRAMEWORK (System 08, Phase 1)
-- The manual's 4-area intake structure, attached directly to a
-- contact rather than a separate table — discovery is about one
-- specific lead's situation, not a standalone record.
-- ============================================================

alter table contacts add column if not exists discovery_situation text default null;
alter table contacts add column if not exists discovery_lifestyle_priorities text default null;
alter table contacts add column if not exists discovery_financial_reality text default null;
alter table contacts add column if not exists discovery_decision_factors text default null;

-- ============================================================
-- BUSINESS IMPROVEMENT LOG (System 09)
-- The manual's exact template: Problem / Evidence / Root Cause /
-- Solution / Result, plus the four-way problem-type classification
-- (Activity / Conversion / System / Priority) that determines what
-- kind of fix actually applies.
-- ============================================================

create table if not exists business_improvement_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  problem text not null,
  problem_type text check (problem_type in ('activity', 'conversion', 'system', 'priority')),
  evidence text,
  root_cause text,
  solution text,
  result text,
  resolved boolean not null default false,
  created_at timestamptz default now()
);
alter table business_improvement_log enable row level security;
drop policy if exists "business_improvement_log: owner all" on business_improvement_log;
create policy "business_improvement_log: owner all" on business_improvement_log
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
