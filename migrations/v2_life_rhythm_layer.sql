-- ============================================================
-- Migration: V2 Life Rhythm Layer
-- Adds recurring schedule TEMPLATES and the small columns needed to
-- (a) materialize them into today's time_blocks automatically, and
-- (b) pack BOS tasks into the resulting work blocks.
--
-- Nothing here duplicates tasks, priorities, or the mission engine.
-- `life_rhythm_blocks` is the ONLY new table with real content — a
-- template row per recurring container (Morning Routine, Cycle Class,
-- Work Block 1, ...). Everything else is additive columns on tables
-- that already exist (`time_blocks`, `tasks`), following the exact
-- pattern v2_foundation_layer.sql already used.
--
-- 100% additive. No existing table altered in a breaking way, no
-- existing row changes.
--
-- HOW TO RUN: Supabase dashboard → SQL Editor → New query → paste
-- this whole file → Run. Run AFTER v2_foundation_layer.sql (depends
-- on time_blocks and tasks existing).
-- ============================================================

-- ---------- Life Rhythm templates ----------
-- One row per recurring container. day_of_week uses JS Date.getDay()
-- convention (0 = Sunday ... 6 = Saturday) so the generator can match
-- `new Date().getDay()` directly with no translation layer.
--
-- is_work_block marks which containers are eligible to receive BOS
-- tasks from the Daily Execution assignment pass (Work Block 1/2,
-- Business + Life Admin day) — routine/workout/meal/reset containers
-- are never task targets, they're just time on the calendar.
create table if not exists life_rhythm_blocks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  day_of_week integer not null check (day_of_week between 0 and 6),
  title text not null,
  block_type text check (block_type in ('routine','workout','work','meal','reset','personal')) not null default 'routine',
  track text check (track in ('personal','business')) not null default 'personal',
  start_time time,
  end_time time,
  is_work_block boolean not null default false,
  sort_order integer not null default 0,
  active boolean not null default true,
  notes text,
  created_at timestamptz default now()
);

alter table life_rhythm_blocks enable row level security;
drop policy if exists "life_rhythm_blocks: owner all" on life_rhythm_blocks;
create policy "life_rhythm_blocks: owner all" on life_rhythm_blocks
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists life_rhythm_blocks_user_day_idx on life_rhythm_blocks (user_id, day_of_week, active);

-- ---------- time_blocks: link generated instances back to their template ----------
-- source_template_id + block_date is how the generator knows "have I
-- already materialized this container for today?" without a separate
-- log table. auto_generated distinguishes rhythm-generated blocks from
-- ones added by hand on the Planner page (both render the same way).
alter table time_blocks add column if not exists source_template_id uuid references life_rhythm_blocks(id) on delete set null;
alter table time_blocks add column if not exists auto_generated boolean not null default false;

-- Prevents the generator from ever double-inserting the same
-- container on the same date, even if called twice (e.g. two tabs
-- open, or a refresh mid-generation).
create unique index if not exists time_blocks_template_date_uidx
  on time_blocks (source_template_id, block_date)
  where source_template_id is not null;

-- ---------- tasks: enough metadata to pack into a block, and to reference one ----------
-- estimated_minutes + priority are what the Daily Execution scorer
-- reads. time_block_id is the assignment itself (many tasks -> one
-- block, mirrors how project_id/goal_id were added). rolled_over_from
-- records the ORIGINAL date a task first appeared in a block, so a
-- task that's been pushed three days running is visibly overdue, not
-- silently rescheduled forever.
alter table tasks add column if not exists estimated_minutes integer;
alter table tasks add column if not exists priority text check (priority in ('Low','Medium','High','Critical')) default 'Medium';
alter table tasks add column if not exists time_block_id uuid references time_blocks(id) on delete set null;
alter table tasks add column if not exists rolled_over_from date;

create index if not exists tasks_time_block_idx on tasks (time_block_id);

-- No data to migrate. life_rhythm_blocks starts empty — the app seeds
-- it once per user on first load (src/services/lifeRhythm.js,
-- seedDefaultLifeRhythmIfEmpty) rather than via SQL insert here, since
-- seeding needs auth.uid() in an authenticated session, not the SQL
-- editor's context. All new/altered columns default to null/false, so
-- every existing tasks/time_blocks row keeps working unchanged.
-- ============================================================
