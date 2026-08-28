-- ============================================================
-- CONTACTS — next_contact_method. Distinct from the existing
-- preferred_contact_method (a standing preference: "they generally
-- like texts"). This is about the pending outreach specifically:
-- "the next thing I owe this person needs to happen by call, not
-- email." Structured (not free text) so it's filterable for
-- batching similar work together.
-- ============================================================

alter table contacts add column if not exists next_contact_method text
  check (next_contact_method in ('email', 'call', 'mail') or next_contact_method is null);
