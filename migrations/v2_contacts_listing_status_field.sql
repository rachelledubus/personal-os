-- ============================================================
-- CONTACTS — a dedicated listing_status field, for leads tied to a
-- real property listing (expired, withdrawn, cancelled, etc.).
-- Named distinctly from the existing computed `status` (follow-up
-- on-track/overdue) already returned by computeStatus() in
-- contacts.js, to avoid colliding with it.
-- ============================================================

alter table contacts add column if not exists listing_status text;
