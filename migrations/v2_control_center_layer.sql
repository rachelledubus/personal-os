-- ============================================================
-- Migration: V2 Control Center Layer
--
-- Three new tables. Category lists and feature flags need NO new
-- schema — they're built entirely on `user_preferences`
-- (category='category_lists'/'feature_flags'), which has existed
-- since the very first foundation migration specifically for this
-- purpose.
--
-- Note on asset_slots: this is a URL-based "swap the image" system,
-- not a file-upload system. True upload needs a Supabase Storage
-- bucket with its own setup step outside this migration — pasting a
-- URL to an already-hosted image (Google Drive share link, Imgur,
-- etc.) needs zero extra setup and covers the same real goal
-- ("change a graphic without asking Claude to edit code"). True
-- upload is a reasonable future upgrade, not done here.
-- ============================================================

create table if not exists asset_slots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  slot_key text not null,
  label text,
  image_url text,
  updated_at timestamptz default now(),
  unique (user_id, slot_key)
);

alter table asset_slots enable row level security;
drop policy if exists "asset_slots: owner all" on asset_slots;
create policy "asset_slots: owner all" on asset_slots
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------- Development memory: changelog + decisions ----------
-- Honest framing: this app can automatically log changes made
-- THROUGH the app (a setting changed, a category renamed) because it
-- can see those. It cannot automatically log code changes Claude
-- makes in a separate development session — there's no way for
-- running client-side software to observe that. Code-level entries
-- get added by convention (Claude logs them at the end of a session
-- with real changes), same discipline as the old WHERE_WE_LEFT_OFF.md
-- file, just living in the app now instead of a delivered document.
create table if not exists dev_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  entry_type text check (entry_type in ('feature','removal','fix','change','config')) not null,
  summary text not null,
  detail text,
  logged_at timestamptz default now()
);

alter table dev_log enable row level security;
drop policy if exists "dev_log: owner all" on dev_log;
create policy "dev_log: owner all" on dev_log
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table if not exists decisions_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  what_changed text not null,
  why text,
  logged_at timestamptz default now()
);

alter table decisions_log enable row level security;
drop policy if exists "decisions_log: owner all" on decisions_log;
create policy "decisions_log: owner all" on decisions_log
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists dev_log_user_date_idx on dev_log (user_id, logged_at desc);
create index if not exists decisions_log_user_date_idx on decisions_log (user_id, logged_at desc);

-- No data lost — all three tables are new and start empty.
-- ============================================================
