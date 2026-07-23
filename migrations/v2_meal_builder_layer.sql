-- ============================================================
-- Migration: V2 Meal Builder Layer
-- One additive column. The "Build Your Own Meal" framework (Protein +
-- Carb + Soft Veggie + Fat + Flavor) needs foods categorized by which
-- slot they fill — this is that tag. A food with no slot just doesn't
-- show up in the builder's dropdowns until tagged; nothing breaks.
-- ============================================================

alter table foods add column if not exists meal_slot text check (meal_slot in (
  'protein','carb','soft_veggie','fat','flavor'
));

create index if not exists foods_meal_slot_idx on foods (meal_slot);

-- No data to migrate — every existing food just has meal_slot = null
-- until tagged from the Meal Builder.
-- ============================================================
