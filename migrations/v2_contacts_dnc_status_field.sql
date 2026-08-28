-- ============================================================
-- CONTACTS — dnc_status replaces dnc_checked as the real field.
-- The boolean could only say "have I checked," not "can I call
-- them" — those are different facts, and a compliance-relevant field
-- needs to represent both without contradiction. Three real states:
-- not_checked (default), clear, on_dnc_list.
--
-- dnc_checked is deliberately left in place, not dropped or
-- auto-migrated — guessing "checked = clear" would risk marking
-- someone actually on the DNC list as safe to call, which is a real
-- compliance risk, not just a data-quality one. Existing checked
-- contacts start at not_checked under the new field and need a
-- real look, not an inferred one.
-- ============================================================

alter table contacts add column if not exists dnc_status text not null default 'not_checked'
  check (dnc_status in ('not_checked', 'clear', 'on_dnc_list'));
