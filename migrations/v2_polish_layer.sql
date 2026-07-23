-- ============================================================
-- Migration: V2 Polish Layer
-- Three fixes, all additive:
--   1. checklist_completions — makes Chores actually interactive with
--      correct reset behavior per cadence, instead of a static list.
--   2. roadmap_items.link_to + milestones.roadmap_item_id — lets a
--      roadmap item link to the relevant page AND have sub-tasks,
--      reusing the existing milestones table/UI pattern rather than
--      building a parallel one.
--   3. workout_exercise_templates + workout_exercises.sets_detail —
--      the preset-exercises-per-day structure from the old workout
--      tab, with real per-set logging.
-- ============================================================

-- ---------- Chores: real per-cadence completion tracking ----------
-- period_marker is computed client-side and means different things per
-- cadence: daily -> today's date, weekly -> Monday of the current week
-- (reuses the existing mondayOfWeek() convention), monthly -> "YYYY-MM".
-- A chore is "done" if a completion row exists for the CURRENT period —
-- once the period rolls over, the old row just stops matching, which is
-- the reset, with no cron job or scheduled task needed.
create table if not exists checklist_completions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  checklist_item_id uuid references checklist_items(id) on delete cascade not null,
  period_marker text not null,
  completed_at timestamptz default now(),
  unique (user_id, checklist_item_id, period_marker)
);

alter table checklist_completions enable row level security;
drop policy if exists "checklist_completions: owner all" on checklist_completions;
create policy "checklist_completions: owner all" on checklist_completions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists checklist_completions_item_period_idx on checklist_completions (checklist_item_id, period_marker);

-- ---------- Roadmap: link to the relevant page + sub-tasks ----------
alter table roadmap_items add column if not exists link_to text;

-- Reuses milestones (already has project_id/goal_id, both nullable) —
-- adding a third optional parent instead of a new sub-task table.
alter table milestones add column if not exists roadmap_item_id uuid references roadmap_items(id) on delete cascade;

create index if not exists milestones_roadmap_idx on milestones (roadmap_item_id);

-- ---------- Workouts: exercise templates per day + per-set logging ----------
-- The fixed exercise list per lifting day (Tue/Thu/Sat) — editable, not
-- hardcoded, so a program change doesn't need a code deploy.
create table if not exists workout_exercise_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  day_key text check (day_key in ('A','B','C')) not null,
  exercise_name text not null,
  target_sets integer,
  target_reps text, -- free text on purpose: "6-8", "10-12/leg", "AMRAP" all need to fit
  sort_order integer default 0,
  active boolean not null default true,
  created_at timestamptz default now()
);

alter table workout_exercise_templates enable row level security;
drop policy if exists "workout_exercise_templates: owner all" on workout_exercise_templates;
create policy "workout_exercise_templates: owner all" on workout_exercise_templates
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists workout_exercise_templates_user_day_idx on workout_exercise_templates (user_id, day_key, active);

-- Per-set weight/reps, e.g. [{"set":1,"weight":135,"reps":8}, ...].
-- The existing weight/reps/sets columns stay as a "top set" summary so
-- workoutAnalytics.js (PRs, progression, volume) keeps working
-- unchanged — they get filled from the heaviest set in sets_detail.
alter table workout_exercises add column if not exists sets_detail jsonb;

-- No data to migrate — every new table starts empty, every new column
-- defaults to null, existing rows unaffected.
-- ============================================================
