-- ============================================================
-- CONTACTS — a boolean for whether this contact's number has been
-- checked against the Do Not Call registry, a real compliance step
-- before cold-calling leads (expired/withdrawn listings especially).
-- ============================================================

alter table contacts add column if not exists dnc_checked boolean not null default false;
