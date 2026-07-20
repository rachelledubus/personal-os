-- ============================================================
-- Migration: Contacts CRM
-- Adds a full contact/relationship table matching the uploaded CRM
-- spreadsheet (System 07 — Database, CRM & Follow-Up System).
--
-- NON-DESTRUCTIVE: the existing `leads` table and every row in it
-- are left completely untouched. This migration only ADDS a new
-- table and copies your existing leads into it (once — safe to
-- re-run, it won't create duplicates).
--
-- HOW TO RUN: Supabase dashboard → SQL Editor → New query → paste
-- this whole file → Run.
-- ============================================================

create table if not exists contacts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  phone text,
  email text,
  category text check (category in ('Lead','Future Client','Active Client','Past Client','Sphere','Partner','Agent Referral')) default 'Lead',
  source text,
  date_added date not null default current_date,
  buyer_seller text check (buyer_seller in ('Buyer','Seller','Both')),
  timeline text check (timeline in ('Now (0-3 mo)','Soon (3-6 mo)','Future (6-12 mo)','Long Term (12+ mo)')),
  persona text,
  location_interest text,
  relationship_notes text,
  next_action text,
  next_follow_up_date date,
  last_contact_date date,
  last_conversation text,
  created_at timestamptz default now()
);

alter table contacts enable row level security;
drop policy if exists "contacts: owner all" on contacts;
create policy "contacts: owner all" on contacts for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists contacts_user_followup_idx on contacts (user_id, next_follow_up_date);
create index if not exists contacts_user_category_idx on contacts (user_id, category);

-- ------------------------------------------------------------
-- One-time copy of existing `leads` rows into `contacts`, so
-- nothing you've already entered is lost. Category mapping:
--   leads.status 'Client'    -> contacts.category 'Active Client'
--   leads.status 'Nurturing' -> contacts.category 'Future Client'
--   anything else (New/Contacted/Lost) -> 'Lead'
--     ('Lost' is noted inside the notes field, since 'Lost' isn't
--      one of the CRM's seven categories)
-- Safe to re-run: skips any lead that already has a matching
-- contact (same user + name + email).
-- ------------------------------------------------------------
insert into contacts (user_id, name, phone, email, category, source, next_follow_up_date, last_contact_date, relationship_notes, date_added)
select
  l.user_id, l.name, l.phone, l.email,
  case l.status
    when 'Client' then 'Active Client'
    when 'Nurturing' then 'Future Client'
    else 'Lead'
  end,
  l.source, l.next_follow_up_date, l.last_contact_date,
  trim(coalesce(l.notes,'') || case when l.status = 'Lost' then ' (prior status: Lost)' else '' end),
  coalesce(l.created_at::date, current_date)
from leads l
where not exists (
  select 1 from contacts c
  where c.user_id = l.user_id
    and c.name = l.name
    and coalesce(c.email,'') = coalesce(l.email,'')
);

-- ------------------------------------------------------------
-- The `leads` table itself is NOT dropped by this migration.
-- Once you've confirmed the new Contacts view in the Business tab
-- looks right, `leads` is safe to leave as an unused legacy table
-- indefinitely, or you can drop it later with:
--   drop table if exists leads;
-- (Not run automatically — your call, and only after you're sure.)
-- ============================================================
