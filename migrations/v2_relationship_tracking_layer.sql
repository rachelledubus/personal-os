-- ============================================================
-- Migration: Relationship Tracking (Phase 2 — Business OS Foundation)
-- ============================================================
-- Closes the one real gap in the Business OS Foundation: relationship
-- activity currently lives as a single growing text field
-- (contacts.relationship_notes) and one overwritable date
-- (last_contact_date) — exactly the "separate entities flattened into
-- one column" anti-pattern the architecture docs warn against.
--
-- interactions becomes the real system of record for relationship
-- activity (calls, texts, emails, meetings, notes) going forward.
-- relationship_notes and last_contact_date are NOT removed — three
-- existing files (flows.js, capture.js, draft-followup.js) read/write
-- them for AI context and quick display, and ripping them out now
-- would be a much bigger blast radius than this phase needs. Instead,
-- addInteraction() (see interactions.js) keeps them in sync
-- automatically, so nothing existing breaks.
-- ============================================================

create table if not exists interactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  contact_id uuid references contacts(id) on delete cascade not null,
  type text check (type in ('call','text','email','meeting','note')) default 'note',
  notes text,
  occurred_at date not null default current_date,
  created_at timestamptz default now()
);

alter table interactions enable row level security;
drop policy if exists "interactions: owner all" on interactions;
create policy "interactions: owner all" on interactions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists interactions_contact_idx on interactions (contact_id, occurred_at desc);

-- ---------- One-time backfill: existing relationship_notes -> a legacy interaction row ----------
-- Only for contacts that have real note content AND don't already have
-- an interaction logged (so this is safe to run more than once — the
-- second run finds nothing left to backfill and does nothing).
insert into interactions (user_id, contact_id, type, notes, occurred_at)
select c.user_id, c.id, 'note', c.relationship_notes,
    coalesce(c.last_contact_date, c.created_at::date, current_date)
  from contacts c
  where c.relationship_notes is not null and trim(c.relationship_notes) <> ''
  and not exists (select 1 from interactions i where i.contact_id = c.id);
