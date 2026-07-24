-- ============================================================
-- LIMITING BELIEF TRACKER
-- Standalone — no relationship to any existing table. A running log
-- of situation -> old belief -> new belief -> supporting evidence.
-- ============================================================

create table if not exists limiting_beliefs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  situation text not null,
  old_belief text,
  new_belief text,
  evidence text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table limiting_beliefs enable row level security;
drop policy if exists "limiting_beliefs: owner all" on limiting_beliefs;
create policy "limiting_beliefs: owner all" on limiting_beliefs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists limiting_beliefs_user_created_idx on limiting_beliefs (user_id, created_at desc);
