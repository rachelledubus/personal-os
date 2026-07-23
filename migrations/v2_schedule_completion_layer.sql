-- ============================================================
-- Migration: V2 Schedule Completion Layer
-- time_blocks had no way to be marked done at all — only tasks
-- ASSIGNED to a work block had a checkbox. Routine/workout/meal
-- containers (which aren't tasks) were never completable, which is
-- why there was "nowhere to make it disappear" for those rows.
-- One additive column fixes it for every block type at once.
-- ============================================================

alter table time_blocks add column if not exists completed boolean not null default false;

-- No data to migrate — every existing block just defaults to not
-- completed, same as before this column existed.
-- ============================================================
