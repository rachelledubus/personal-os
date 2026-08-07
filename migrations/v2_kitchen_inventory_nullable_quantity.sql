-- ============================================================
-- KITCHEN INVENTORY — allow quantity to be genuinely null. Needed to
-- distinguish "not yet counted" (auto-populated from a recipe/food
-- ingredient, waiting on a real count) from "counted, and there's
-- none" (quantity = 0) — those are different things and the UI
-- needs to tell them apart.
-- ============================================================

alter table kitchen_inventory alter column quantity drop not null;
alter table kitchen_inventory alter column quantity drop default;
