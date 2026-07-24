-- ============================================================
-- JOY TRACKING
-- energy_logs already exists (energy_level per day, rendered in the
-- Journal mood grid). This just adds the two missing text fields —
-- no new table, same daily row.
-- ============================================================

alter table energy_logs add column if not exists momentum_gain text default null;
alter table energy_logs add column if not exists momentum_drain text default null;
