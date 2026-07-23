-- ============================================================
-- Migration: V2 Backlog Sprint (meals in Today, drag reordering)
-- ============================================================

-- ---------- Meals in Today ----------
-- Grain is per meal_type per day, not per food item — a meal can be
-- multiple food rows (eggs + toast = breakfast), and "eaten" means the
-- whole meal, not each ingredient separately.
alter table meal_plan_items add column if not exists eaten boolean default false;

-- ---------- Backlog drag-to-reorder ----------
alter table product_backlog_ideas add column if not exists sort_order integer default 0;

-- Backfill existing rows with a real sequence based on creation order,
-- so reordering starts from something sensible instead of everything
-- being sort_order 0.
with ordered as (
  select id, row_number() over (partition by user_id order by created_at desc) as rn
  from product_backlog_ideas
)
update product_backlog_ideas p
set sort_order = ordered.rn
from ordered
where p.id = ordered.id;

-- No data lost — both columns are additive with safe defaults.
-- ============================================================
