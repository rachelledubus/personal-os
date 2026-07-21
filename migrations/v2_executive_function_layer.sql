-- ============================================================
-- Migration: V2 Executive Function Layer
-- Transition support (Area 3) reuses Life Rhythm's existing
-- containers — Morning Routine, Shutdown, Evening Routine already
-- exist as time blocks; they just never had steps. This gives them
-- steps, and a place to track today's progress through them.
-- Nothing else in this phase needs new schema — Neglected Priorities,
-- the Hyperfocus nudge, and the Relationship Memory extension are all
-- pure logic on tables that already exist.
-- ============================================================

alter table life_rhythm_blocks add column if not exists steps jsonb default '[]'::jsonb;
alter table time_blocks add column if not exists completed_steps jsonb default '[]'::jsonb;

-- No data lost — both default to empty, every existing block keeps
-- working exactly as before, just with an optional steps list now.
-- ============================================================
