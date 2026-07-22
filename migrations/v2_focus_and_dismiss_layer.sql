-- ============================================================
-- Migration: Focus session tracking + per-block dismiss
-- ============================================================
-- Two independent, additive changes bundled together since both are
-- small and both belong to the "hyperfocus notice was firing on days
-- I wasn't even working" fix:
--
-- 1. focus_sessions — logs only when Focus Mode is actually open, so
--    the hyperfocus nudge can tell real focused work apart from a
--    block that simply ran long for some other reason.
-- 2. time_blocks.dismissed — lets any block (not just via the
--    hyperfocus banner) be waved off from today's schedule without
--    marking it complete. Only affects today's generated row, not the
--    underlying weekly template.
-- ============================================================

create table if not exists focus_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  started_at timestamptz not null default now(),
  ended_at timestamptz
);

alter table focus_sessions enable row level security;
drop policy if exists "focus_sessions: owner all" on focus_sessions;
create policy "focus_sessions: owner all" on focus_sessions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists focus_sessions_user_date_idx on focus_sessions (user_id, started_at);

alter table time_blocks add column if not exists dismissed boolean not null default false;
