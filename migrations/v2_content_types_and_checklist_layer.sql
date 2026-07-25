-- ============================================================
-- CONTENT TYPES + QUALITY CHECKLIST
-- Completes Bundle 2. content_type drives the CTA Framework table
-- from the manual (System 03); quality_checklist is the real 7-item
-- pre-publish checklist, stored as a jsonb array of
-- {label, checked} so it can be edited per-piece without a rigid
-- boolean-per-column schema.
-- ============================================================

alter table content_pieces add column if not exists content_type text;
alter table content_pieces add column if not exists quality_checklist jsonb default '[]'::jsonb;
