-- ============================================================
-- Migration: V2 Friction Reduction Pass
-- Content pieces had 6 status values (idea/brief/draft/fact_check/
-- published/repurposed) requiring up to 4 clicks to advance through,
-- each click moving a label with no distinct action behind it.
-- Collapsing to 3: idea -> drafting -> published. Repurposing is
-- already tracked per-format in content_repurpose_items, so a
-- separate top-level "repurposed" status was duplicate information —
-- the real repurposing progress lives in the child rows, not a label
-- on the parent.
-- ============================================================

-- Remap existing data BEFORE changing the constraint, so no row ever
-- momentarily violates it.
update content_pieces set status = 'drafting' where status in ('brief', 'draft', 'fact_check');
update content_pieces set status = 'published' where status = 'repurposed';

alter table content_pieces drop constraint if exists content_pieces_status_check;
alter table content_pieces add constraint content_pieces_status_check
  check (status in ('idea', 'drafting', 'published'));

-- ============================================================
