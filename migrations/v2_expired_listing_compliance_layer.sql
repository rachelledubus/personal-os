-- ============================================================
-- COMPLIANCE INFRASTRUCTURE for the Expired Listing Runbook
-- (System 04A.6). Inert until the runbook's own activation gate is
-- met — this only creates the structures, it does not turn on any
-- outreach. Not legal advice; this reflects the runbook's own
-- stated shape of federal/Florida telemarketing rules, confirm
-- current requirements with your broker and a Florida attorney
-- before relying on it.
--
-- Federal and Florida DNC are separate registries per the runbook
-- ("Federal scrubbing alone is not sufficient here"), so contacts
-- need two independent statuses, not one collapsed field. The
-- existing dnc_status column is left in place, not migrated —
-- guessing how an old single status maps to two new ones would risk
-- getting a real compliance fact wrong.
-- ============================================================

alter table contacts add column if not exists federal_dnc_status text not null default 'not_checked'
  check (federal_dnc_status in ('not_checked', 'clear', 'on_dnc_list'));
alter table contacts add column if not exists federal_dnc_scrub_date date;
alter table contacts add column if not exists florida_dnc_status text not null default 'not_checked'
  check (florida_dnc_status in ('not_checked', 'clear', 'on_dnc_list'));
alter table contacts add column if not exists florida_dnc_scrub_date date;

-- Permanent internal DNC list. Deliberately NOT linked to contacts
-- by foreign key with cascade delete — the runbook requires these
-- rows survive "including when the record is purged elsewhere."
create table if not exists dnc_internal (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name text,
  phone text not null,
  address text,
  date_requested date not null default current_date,
  how_requested text,
  created_at timestamptz default now()
);
alter table dnc_internal enable row level security;
drop policy if exists "dnc_internal: owner select/insert" on dnc_internal;
create policy "dnc_internal: owner select/insert" on dnc_internal
  for select using (auth.uid() = user_id);
create policy "dnc_internal: owner insert" on dnc_internal
  for insert with check (auth.uid() = user_id);
-- Deliberately no update or delete policy — permanent means permanent.

create index if not exists idx_dnc_internal_phone on dnc_internal (user_id, phone);

-- Compliance log — an audit trail, not a current-state table.
-- Every scrub and every call gets its own row.
create table if not exists compliance_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  contact_id uuid references contacts(id) on delete set null,
  phone text,
  federal_check_date date,
  federal_check_result text,
  florida_check_date date,
  florida_check_result text,
  call_date date,
  call_time time,
  duration_minutes integer,
  outcome text,
  stop_request boolean not null default false,
  date_added_to_dnc date,
  created_at timestamptz default now()
);
alter table compliance_log enable row level security;
drop policy if exists "compliance_log: owner select/insert" on compliance_log;
create policy "compliance_log: owner select/insert" on compliance_log
  for select using (auth.uid() = user_id);
create policy "compliance_log: owner insert" on compliance_log
  for insert with check (auth.uid() = user_id);
-- Deliberately no update or delete policy — five-year retention
-- means rows are never deleted, matching the runbook's own rule.

create index if not exists idx_compliance_log_contact on compliance_log (contact_id);
