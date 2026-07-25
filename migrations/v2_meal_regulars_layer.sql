-- ============================================================
-- MEAL-TYPE TAGGING + REGULARS
-- Two real problems, one migration:
-- 1. Quick-add showed the identical unfiltered list under every meal
--    slot (Breakfast/Lunch/Dinner/Snacks) since foods had no concept
--    of which meal they belong to.
-- 2. As the food/recipe library grows, an arbitrary "first 6" slice
--    gets more useless and more cluttered over time. Rule-based, not
--    adaptive: user explicitly marks something a "regular" for a
--    given meal type; the app never auto-decides that for them.
-- ============================================================

alter table foods add column if not exists meal_types text[] default null;
alter table foods add column if not exists is_regular boolean not null default false;

alter table recipes add column if not exists meal_types text[] default null;
alter table recipes add column if not exists is_regular boolean not null default false;
