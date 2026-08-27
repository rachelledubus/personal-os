-- ============================================================
-- CONTACTS — add a real address field. Property addresses for leads
-- (expired/withdrawn listings, etc.) had nowhere to live except
-- embedded as plain text inside relationship_notes.
-- ============================================================

alter table contacts add column if not exists address text;
