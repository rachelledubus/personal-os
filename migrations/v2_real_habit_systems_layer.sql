-- ============================================================
-- REAL HABIT-SYSTEM GROUPING
-- Previously "Habits -> Systems" was a rename only — a habit and a
-- system were the same flat row. This adds an actual parent: a
-- system is its own real entity (e.g. "Health Identity System"),
-- and individual habits optionally nest under one.
-- ============================================================

create table if not exists habit_systems (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  description text,
  sort_order integer not null default 0,
  archived boolean not null default false,
  created_at timestamptz default now()
);
alter table habit_systems enable row level security;
drop policy if exists "habit_systems: owner all" on habit_systems;
create policy "habit_systems: owner all" on habit_systems
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

alter table habits add column if not exists system_id uuid references habit_systems(id) on delete set null;
