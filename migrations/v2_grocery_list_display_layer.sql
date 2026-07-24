-- ============================================================
-- GROCERY LIST — DISPLAY LAYER
-- grocery_items already existed and was being written to from 4
-- places, but nothing ever read it back — confirmed real gap, not a
-- missing UI on top of a complete model. Needed one column to make a
-- checkable list actually useful: mark bought without deleting
-- outright (so a duplicate-name check against "still needed" items
-- keeps working correctly).
-- ============================================================

alter table grocery_items add column if not exists purchased boolean not null default false;
alter table grocery_items add column if not exists created_at timestamptz default now();
