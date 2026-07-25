-- ============================================================
-- DEPENDENCY-BASED SCHEDULING (Tier 4, Phase A)
-- Every column is nullable / defaulted so existing blocks behave
-- exactly as before (schedule_mode defaults to 'fixed', which is
-- today's literal start_time/end_time behavior, untouched).
-- ============================================================

alter table life_rhythm_blocks add column if not exists schedule_mode text
  check (schedule_mode in ('fixed','anchored','commute')) not null default 'fixed';
alter table life_rhythm_blocks add column if not exists depends_on_block_id uuid references life_rhythm_blocks(id) on delete set null;
alter table life_rhythm_blocks add column if not exists estimated_duration_minutes integer;
alter table life_rhythm_blocks add column if not exists target_arrival_time time;
alter table life_rhythm_blocks add column if not exists travel_minutes integer;
alter table life_rhythm_blocks add column if not exists is_anchor boolean not null default false;

-- Today's generated instance needs to record the day's ACTUAL anchor
-- time (e.g. real wake time) separately from the template's default,
-- and whether the chain is currently in conflict (running behind a
-- fixed commute/arrival point) — both computed fresh each generation,
-- never hand-edited directly.
alter table time_blocks add column if not exists chain_conflict boolean not null default false;
