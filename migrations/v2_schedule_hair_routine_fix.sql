-- ============================================================
-- Migration: Fix gym/shower timing + add curly hair routine notes
-- ============================================================
-- Why: the weekly schedule template (life_rhythm_blocks) is only
-- auto-seeded once, the first time the app runs for a user. Since
-- Rachelle's rows already exist, changing the JS template alone
-- won't update what's already saved — this migration updates the
-- existing rows directly to match.
--
-- What changes:
--   - Tue/Thu gym blocks: 30min "arrival window" -> real 2hr session,
--     everything after cascade-shifted +1hr, same durations kept.
--   - Sat Posterior Chain Workout: 1hr -> 2hr, new Shower block added
--     after it (didn't exist before).
--   - Shower blocks on Mon/Tue/Wed/Thu/Sat get a hair-routine note
--     (clarifying / hydrating / rinse-only / deep-condition), a
--     starting-point guess — edit the `notes` values below (or in the
--     app once a template editor exists) if this isn't the real
--     rotation.
--
-- Safe to run once. Matches by day_of_week + title, only touches rows
-- that already exist — does not insert new Tue/Thu rows, does insert
-- one new Saturday Shower row since none existed before.
-- ============================================================

-- Tuesday
update life_rhythm_blocks set end_time = '08:00', notes = 'Full session'
  where day_of_week = 2 and title = 'Gym: Upper Body';
update life_rhythm_blocks set start_time = '08:00', end_time = '08:45',
    notes = 'Hair: clarifying shampoo (post-sweat day) — adjust if this isn''t your real rotation'
  where day_of_week = 2 and title = 'Shower / Recovery';
update life_rhythm_blocks set start_time = '08:45', end_time = '09:15'
  where day_of_week = 2 and title = 'Breakfast';
update life_rhythm_blocks set start_time = '09:30', end_time = '13:00'
  where day_of_week = 2 and title = 'Work Block 1';
update life_rhythm_blocks set start_time = '13:00', end_time = '13:30'
  where day_of_week = 2 and title = 'Lunch / Reset';
update life_rhythm_blocks set start_time = '13:30', end_time = '19:00'
  where day_of_week = 2 and title = 'Work Block 2';
update life_rhythm_blocks set start_time = '19:00', end_time = '19:15'
  where day_of_week = 2 and title = 'Shutdown';

-- Thursday (identical shift)
update life_rhythm_blocks set end_time = '08:00', notes = 'Full session'
  where day_of_week = 4 and title = 'Gym: Lower Body / Quads';
update life_rhythm_blocks set start_time = '08:00', end_time = '08:45',
    notes = 'Hair: clarifying shampoo (post-sweat day) — adjust if this isn''t your real rotation'
  where day_of_week = 4 and title = 'Shower / Recovery';
update life_rhythm_blocks set start_time = '08:45', end_time = '09:15'
  where day_of_week = 4 and title = 'Breakfast';
update life_rhythm_blocks set start_time = '09:30', end_time = '13:00'
  where day_of_week = 4 and title = 'Work Block 1';
update life_rhythm_blocks set start_time = '13:00', end_time = '13:30'
  where day_of_week = 4 and title = 'Lunch / Reset';
update life_rhythm_blocks set start_time = '13:30', end_time = '19:00'
  where day_of_week = 4 and title = 'Work Block 2';
update life_rhythm_blocks set start_time = '19:00', end_time = '19:15'
  where day_of_week = 4 and title = 'Shutdown';

-- Monday / Wednesday — notes only, no timing change (not strength days)
update life_rhythm_blocks set notes = 'Hair: hydrating shampoo + conditioner'
  where day_of_week = 1 and title = 'Shower / Recovery';
update life_rhythm_blocks set notes = 'Hair: rinse / light refresh only'
  where day_of_week = 3 and title = 'Shower / Recovery';

-- Saturday: extend workout, add the shower block that didn't exist before
update life_rhythm_blocks set end_time = '10:00', notes = 'Full session'
  where day_of_week = 6 and title = 'Posterior Chain Workout';

insert into life_rhythm_blocks (user_id, day_of_week, title, block_type, track, start_time, end_time, notes, sort_order)
select user_id, 6, 'Shower / Recovery', 'routine', 'personal', '10:00', '11:00',
    'Hair: deep conditioner / mask day — most time available this day', 2
  from life_rhythm_blocks src
  where day_of_week = 6 and title = 'Posterior Chain Workout'
  and not exists (
    select 1 from life_rhythm_blocks existing
    where existing.user_id = src.user_id and existing.day_of_week = 6 and existing.title = 'Shower / Recovery'
  );

-- Existing Saturday "Personal / Life Day" row keeps its sort_order of 2,
-- which now collides with the new Shower row above — bump it to 3.
update life_rhythm_blocks set sort_order = 3
  where day_of_week = 6 and title = 'Personal / Life Day';
