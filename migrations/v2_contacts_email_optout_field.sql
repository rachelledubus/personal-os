-- ============================================================
-- CONTACTS — opted_out_of_emails, independent of dnc_status. Phone
-- consent (DNC) and email consent are different channels; someone
-- can be clear to call but opted out of emails, or vice versa.
-- ============================================================

alter table contacts add column if not exists opted_out_of_emails boolean not null default false;
