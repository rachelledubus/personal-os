-- ============================================================
-- MORNING ALIGNMENT ROUTINE
-- The 5-prompt daily check-in: What am I creating? Who am I
-- becoming? What matters today? What action moves me forward? What
-- am I grateful for? One row per day — same "one entry per date"
-- shape as the existing daily check-in system.
-- ============================================================

create table if not exists morning_alignment_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  entry_date date not null default current_date,
  creating text,
  becoming text,
  matters_today text,
  next_action text,
  grateful_for text,
  completed_at timestamptz,
  unique (user_id, entry_date)
);
alter table morning_alignment_entries enable row level security;
drop policy if exists "morning_alignment_entries: owner all" on morning_alignment_entries;
create policy "morning_alignment_entries: owner all" on morning_alignment_entries
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
