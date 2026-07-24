-- ============================================================
-- GOALS CASCADE + ALIGNED ACTION FILTER
-- Two backlog items combined into one migration because both are
-- additive columns on the same two tables (goals, projects) —
-- one migration, one review, instead of two touching the same rows.
--
-- Cascade: goals can now optionally declare a timeframe (Year/
-- Quarter/Month/Week) and point at a parent goal, so a Quarter goal
-- can roll up into a Year goal, etc. Nothing existing breaks —
-- timeframe/parent_goal_id are both nullable, so every goal created
-- before this migration just has neither set and behaves exactly as
-- it did (a single flat goal with a target_date).
--
-- Aligned Action Filter: vision_link optionally points at one of the
-- 7 Dream Life sections (see DreamLifeTab.jsx SECTIONS keys — kept as
-- plain text, not a foreign key, since Dream Life content lives in
-- user_preferences, not a table). energy_impact is a lightweight
-- gut-check field, not a computed score.
-- ============================================================

alter table goals add column if not exists timeframe text check (timeframe in ('Year','Quarter','Month','Week')) default null;
alter table goals add column if not exists parent_goal_id uuid references goals(id) on delete set null;
alter table goals add column if not exists vision_link text default null;
alter table goals add column if not exists energy_impact text check (energy_impact in ('Energizing','Neutral','Draining')) default null;

alter table projects add column if not exists vision_link text default null;
alter table projects add column if not exists energy_impact text check (energy_impact in ('Energizing','Neutral','Draining')) default null;

create index if not exists goals_parent_goal_id_idx on goals (parent_goal_id);
