-- ============================================================
-- RECIPES <-> MEAL PLANNER INTEGRATION
-- meal_plan_items only ever linked to `foods`. Recipes lived in their
-- own separate table, fully disconnected from day/week planning —
-- confirmed real gap, not a UI oversight. One nullable column: a
-- plan row now has either food_id OR recipe_id set (never both),
-- everything existing that reads food_id keeps working unchanged.
-- ============================================================

alter table meal_plan_items add column if not exists recipe_id uuid references recipes(id) on delete cascade;
