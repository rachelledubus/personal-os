-- ============================================================
-- Migration: Content page fields (Sprint B)
-- ============================================================
-- content_pieces tracked title/question/audience/status but had
-- nowhere to hold the actual draft, no fact-check flag, and no goal/
-- trade-off/CTA fields — the brief that the orphaned content_creation
-- guided flow always wanted to capture but never had a button to
-- reach. Folded directly into content_pieces as blocks on one page
-- rather than as a new multi-step flow: a prior session deliberately
-- collapsed content_pieces.status from a 6-stage machine down to
-- idea/drafting/published to reduce friction — adding stage-gating
-- back via a separate flow would undo that. These are just fields on
-- the page now, not new statuses.
-- ============================================================

alter table content_pieces add column if not exists draft_body text;
alter table content_pieces add column if not exists fact_checked boolean not null default false;
alter table content_pieces add column if not exists goal text;
alter table content_pieces add column if not exists trade_off text;
alter table content_pieces add column if not exists cta text;
