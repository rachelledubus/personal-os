-- ============================================================
-- Migration: V2 Business OS Rebuild — Foundation Layer
-- This is not a patch. It closes the gap between the BOS (the real
-- source of truth, still partly living in Google Sheets/Docs) and
-- the app. Every table here retires a document, not just adds a
-- feature. Nothing existing is dropped — additive only, per the
-- standing rule: no important information gets lost.
-- ============================================================

-- ---------- CRM: contacts gets the fields the real spreadsheet has ----------
-- Retires System_07_CRM_Database.xlsx as the thing anyone actually
-- checks. Status and days-until-followup are computed client-side
-- (see contacts.js) rather than stored, so they're never stale.
alter table contacts add column if not exists organization text;
alter table contacts add column if not exists how_we_connected text;
alter table contacts add column if not exists important_personal_details text;
alter table contacts add column if not exists goals text;
alter table contacts add column if not exists concerns text;
alter table contacts add column if not exists preferred_contact_method text check (preferred_contact_method in ('text','email','call_scheduled')) default 'text';

-- Merges 05A (tiers) + 05B (sphere) + 05C (community) + 05D (professional)
-- into one field on the ONE contact list, instead of four separate
-- relationship systems describing the same people.
alter table contacts add column if not exists relationship_tier text check (relationship_tier in ('Tier 1 - Core','Tier 2 - Developing','Tier 3 - Strategic'));

create index if not exists contacts_relationship_tier_idx on contacts (relationship_tier);
create index if not exists contacts_preferred_contact_idx on contacts (preferred_contact_method);

-- ---------- The Weekly Business Dashboard, as real data ----------
-- The four daily boxes (Relationship / Authority / Pipeline /
-- Knowledge) from 0_-_Start_Here.docx — currently only exists as a
-- Google Doc someone has to remember to open and type into.
create table if not exists daily_checkin (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  checkin_date date not null default current_date,
  relationship_done boolean not null default false,
  relationship_note text,
  authority_done boolean not null default false,
  authority_note text,
  pipeline_done boolean not null default false,
  pipeline_note text,
  knowledge_done boolean not null default false,
  knowledge_note text,
  unique (user_id, checkin_date)
);

alter table daily_checkin enable row level security;
drop policy if exists "daily_checkin: owner all" on daily_checkin;
create policy "daily_checkin: owner all" on daily_checkin
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- This week's target numbers (Meaningful conversations, Value
-- published, Pipeline moves, Consultations booked, Knowledge items) —
-- set once Monday morning per the Dashboard's own instructions.
create table if not exists weekly_targets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  week_start date not null,
  conversations_target integer default 10,
  value_published_target integer,
  pipeline_moves_target integer default 0,
  consultations_target integer default 0,
  knowledge_items_target integer default 10,
  unique (user_id, week_start)
);

alter table weekly_targets enable row level security;
drop policy if exists "weekly_targets: owner all" on weekly_targets;
create policy "weekly_targets: owner all" on weekly_targets
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------- Master Build Timeline: real week numbers, not just phases ----------
alter table roadmap_items add column if not exists week_number integer;
alter table roadmap_items add column if not exists date_range text;

-- ---------- Content Engine (03): the real Brief -> Repurpose pipeline ----------
-- content_items/content_logs (existing) stay untouched — nothing that
-- reads them breaks. This is the real system alongside it; the
-- Mission Engine migrates onto it in a later pass.
create table if not exists content_pieces (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  title text not null,
  buyer_question text,
  audience text,
  funnel_stage text check (funnel_stage in ('Awareness','Consideration','Decision')),
  pillar text,
  status text check (status in ('idea','brief','draft','fact_check','published','repurposed')) not null default 'idea',
  published_date date,
  url text,
  created_at timestamptz default now()
);

alter table content_pieces enable row level security;
drop policy if exists "content_pieces: owner all" on content_pieces;
create policy "content_pieces: owner all" on content_pieces
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table if not exists content_repurpose_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  content_piece_id uuid references content_pieces(id) on delete cascade not null,
  format text check (format in ('email','instagram','facebook','video','partner_resource','other')) not null,
  published boolean not null default false,
  published_at timestamptz,
  notes text
);

alter table content_repurpose_items enable row level security;
drop policy if exists "content_repurpose_items: owner all" on content_repurpose_items;
create policy "content_repurpose_items: owner all" on content_repurpose_items
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists content_repurpose_piece_idx on content_repurpose_items (content_piece_id);

-- ---------- CTA / Script / Prompt libraries (13, 14, 15): real lookup data ----------
-- These were prose documents meant to be copy-pasted. They're lookup
-- tables, not reading material.
create table if not exists ctas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  audience text not null,
  stage text check (stage in ('Awareness','Engagement','Website','Social','Partner')),
  cta_text text not null,
  is_primary boolean default false,
  page text,
  created_at timestamptz default now()
);

alter table ctas enable row level security;
drop policy if exists "ctas: owner all" on ctas;
create policy "ctas: owner all" on ctas
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table if not exists scripts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  section text not null,
  situation text not null,
  script_text text not null,
  created_at timestamptz default now()
);

alter table scripts enable row level security;
drop policy if exists "scripts: owner all" on scripts;
create policy "scripts: owner all" on scripts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table if not exists prompts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  code text, -- P1, A6, etc. — matches the manual's own numbering
  category text,
  title text not null,
  prompt_text text not null,
  use_for text,
  created_at timestamptz default now()
);

alter table prompts enable row level security;
drop policy if exists "prompts: owner all" on prompts;
create policy "prompts: owner all" on prompts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists ctas_user_stage_idx on ctas (user_id, stage);
create index if not exists scripts_user_section_idx on scripts (user_id, section);
create index if not exists prompts_user_category_idx on prompts (user_id, category);

-- ---------- Transaction Review Log (00J): a logged event, not a static template ----------
create table if not exists transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  contact_id uuid references contacts(id) on delete set null,
  buyer_or_seller text check (buyer_or_seller in ('Buyer','Seller')),
  property_area text,
  closing_date date,
  referral_source text,
  timeline_notes text,
  biggest_objection text,
  unexpected_question text,
  what_almost_went_wrong text,
  lesson_learned text,
  system_to_update text,
  testimonial_requested boolean default false,
  content_idea_added boolean default false,
  photos_collected boolean default false,
  added_to_past_client_plan boolean default false,
  referral_opportunity_noted text,
  created_at timestamptz default now()
);

alter table transactions enable row level security;
drop policy if exists "transactions: owner all" on transactions;
create policy "transactions: owner all" on transactions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------- Future Roadmap Log (00D): the actual parking lot ----------
-- Decision Rule 4 has said "goes to the future roadmap" this whole
-- time — this is the first version of that log that's ever actually
-- existed as a place you can put something.
create table if not exists future_roadmap_ideas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  idea text not null,
  why_deferred text,
  revisit_at text,
  logged_date date default current_date,
  promoted boolean default false
);

alter table future_roadmap_ideas enable row level security;
drop policy if exists "future_roadmap_ideas: owner all" on future_roadmap_ideas;
create policy "future_roadmap_ideas: owner all" on future_roadmap_ideas
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- No data lost: every new column defaults to null/false, every new
-- table starts empty and gets seeded from the app (see services) with
-- the actual verbatim content from the manual — not placeholder data.
-- ============================================================
