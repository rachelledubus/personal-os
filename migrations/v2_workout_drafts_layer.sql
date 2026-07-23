-- ============================================================
-- Migration: Cross-device workout drafts
-- ============================================================
-- Replaces the earlier localStorage-only draft (device-local, doesn't
-- sync). One draft row per user+day_key, upserted as you type
-- (debounced client-side, not literally every keystroke) — a genuine
-- crash/refresh/device-switch mid-workout won't lose numbers, since
-- they're already in the database, not just this browser's storage.
--
-- Separate from `workouts`/`workout_exercises` on purpose — those
-- represent a real completed, logged session (feeds Guardian XP,
-- streaks, insights). A draft is provisional and shouldn't count as
-- any of that until the real Save happens.
-- ============================================================

create table if not exists workout_drafts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  day_key text not null,
  entries jsonb not null default '{}',
  updated_at timestamptz default now(),
  unique (user_id, day_key)
);

alter table workout_drafts enable row level security;
drop policy if exists "workout_drafts: owner all" on workout_drafts;
create policy "workout_drafts: owner all" on workout_drafts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
