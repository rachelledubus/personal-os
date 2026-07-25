-- ============================================================
-- LEAD MAGNET & FUNNEL SYSTEM (Bundle 5 / System 04C)
-- Two real tables:
-- 1. lead_magnets — the guides themselves as entities (previously only
--    existed as strings in a lead-source dropdown).
-- 2. nurture_tracking — the manual explicitly recommends starting with
--    a simple spreadsheet (name / magnet / date / emails sent /
--    replied? / booked?) before automating. This is that spreadsheet,
--    just live instead of static, and it's what makes the Tracking
--    Dashboard (Acquisition/Engagement/Conversion) computable instead
--    of another set of empty manual-entry fields.
-- ============================================================

create table if not exists lead_magnets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  funnel text,
  audience text,
  primary_problem text,
  next_step text,
  whats_inside jsonb default '[]'::jsonb,
  build_phase text,
  status text check (status in ('planned','building','live')) not null default 'planned',
  created_at timestamptz default now()
);
alter table lead_magnets enable row level security;
drop policy if exists "lead_magnets: owner all" on lead_magnets;
create policy "lead_magnets: owner all" on lead_magnets
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table if not exists nurture_tracking (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  contact_id uuid references contacts(id) on delete set null,
  lead_magnet_id uuid references lead_magnets(id) on delete set null,
  lead_name text,
  date_started date default current_date,
  current_email integer not null default 0,
  replied boolean not null default false,
  booked boolean not null default false,
  notes text,
  created_at timestamptz default now()
);
alter table nurture_tracking enable row level security;
drop policy if exists "nurture_tracking: owner all" on nurture_tracking;
create policy "nurture_tracking: owner all" on nurture_tracking
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists nurture_tracking_magnet_idx on nurture_tracking (lead_magnet_id);
