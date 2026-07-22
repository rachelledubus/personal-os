-- ============================================================
-- Migration: Guardian Technical Foundation (Phase 3, Stage 1)
-- ============================================================
-- Per the Guardian Integration Architecture doc's own sequencing:
-- "Phase 1 — Technical Foundation: Guardian data model, event system,
-- XP system, progression logic. No major art work yet." This migration
-- is exactly that scope — no cosmetic/unlock content, no personality
-- dialogue trees, just the real data model and the ledger that will
-- feed it.
--
-- Guardians are NOT seeded here — seeding happens in guardians.js,
-- matching the app's existing "seed if empty" convention (life rhythm,
-- chores, library timeline all do this in JS, not SQL).
-- ============================================================

create table if not exists guardians (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  guardian_key text not null,                 -- 'productivity' | 'business' | 'health' — stable, code references this, not the display name
  name text not null,
  theme text,
  element text,
  role text,
  personality_values text[] default '{}',
  level integer not null default 1,
  experience_points integer not null default 0,
  growth_stage text not null default 'Seedling',
  mood text not null default 'content',
  bond_level integer not null default 0,
  recent_events jsonb not null default '[]',   -- capped rolling list, most recent first — for the reaction framework, not a full history (xp_transactions is that)
  unlocked_features jsonb not null default '[]', -- empty for now — unlocks are a Phase 4 (Gamification) concern, this column just exists so Phase 4 doesn't need a migration
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (user_id, guardian_key)
);

alter table guardians enable row level security;
drop policy if exists "guardians: owner all" on guardians;
create policy "guardians: owner all" on guardians
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------- XP ledger — append-only, the real audit trail ----------
-- guardians.experience_points is a running total for fast reads;
-- xp_transactions is the system of record if that total is ever wrong
-- and needs recomputing, and gives "why did this Guardian grow" a real
-- answer instead of just a number going up.
create table if not exists xp_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  guardian_id uuid references guardians(id) on delete cascade not null,
  amount integer not null,
  source_table text not null,
  source_id uuid,
  event_type text not null,
  created_at timestamptz default now()
);

alter table xp_transactions enable row level security;
drop policy if exists "xp_transactions: owner all" on xp_transactions;
create policy "xp_transactions: owner all" on xp_transactions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists xp_transactions_guardian_idx on xp_transactions (guardian_id, created_at desc);
