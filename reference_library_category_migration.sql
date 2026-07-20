-- ============================================================
-- Migration: Reference Library — add 'reference' category
-- Extends the reference_library table's category check constraint
-- to allow a new 'reference' category, used for the CRM spreadsheet's
-- Follow-Up Standards and Maintenance Checklist content (reference
-- material, not a script/prompt/CTA/template).
--
-- Non-destructive: existing rows and categories are untouched, this
-- only widens what's allowed going forward. The app inserts the two
-- new entries itself (client-side, on next login) — no data to
-- insert here.
--
-- HOW TO RUN: Supabase dashboard → SQL Editor → New query → paste
-- this whole file → Run.
-- ============================================================

alter table reference_library drop constraint if exists reference_library_category_check;
alter table reference_library add constraint reference_library_category_check
  check (category in ('voice','cta','script','prompt','template','reference'));

-- No rows are inserted by this migration. The app itself adds the two
-- new "CRM Reference" entries (Follow-Up Standards & Category Reference,
-- CRM Maintenance Checklist) the next time you open the Business tab —
-- see seedAdditionalReferenceContentIfMissing() in index.html. It checks
-- by title first, so it's safe even if you open the app multiple times
-- before or after running this migration.
