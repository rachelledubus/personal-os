-- ============================================================
-- Migration: Lead Stage (Realtor OS Phase 1 — Pipeline gap closure)
-- ============================================================
-- Closes the one real gap between the PRD's Lead Pipeline (a funnel:
-- New Lead -> Contact Attempted -> Conversation Started -> Nurture ->
-- Consultation Scheduled -> Active Client -> Closed) and what
-- `contacts` actually stores today.
--
-- `category` (Lead / Future Client / Active Client / ...) is a
-- contact-type bucket, not a funnel position, and `status` (computed
-- in contacts.js) is follow-up urgency, not funnel position either.
-- Neither answers "where is this lead in the funnel" — that's the gap
-- this migration closes.
--
-- Additive only: nullable, no CHECK constraint (same pattern as every
-- other field backed by a Control Center-editable CATEGORY_LISTS
-- entry — see settings.js). Existing contacts are unaffected; nothing
-- that reads `contacts` today breaks.
-- ============================================================

alter table contacts add column if not exists lead_stage text;

create index if not exists contacts_lead_stage_idx on contacts (lead_stage);
