-- ============================================================
-- OPPORTUNITY INBOX (future_roadmap_ideas) — effort/value fields
-- The Master Reference's own note on this item: "add effort/value
-- fields and promote-to-project." The capture + promote-to-roadmap
-- logic already existed (futureRoadmap.js) but had zero UI anywhere
-- in the app — these two fields plus a real screen are what's new.
-- ============================================================

alter table future_roadmap_ideas add column if not exists effort text check (effort in ('Low', 'Medium', 'High'));
alter table future_roadmap_ideas add column if not exists value text check (value in ('Low', 'Medium', 'High'));

-- ============================================================
-- FUTURE ME — genuinely new. A letter to your future self, written
-- now, sealed until a reveal date. Simple by design: this is a
-- reflection tool, not a task system.
-- ============================================================

create table if not exists future_me_letters (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  title text,
  content text not null,
  written_date date default current_date,
  reveal_date date not null,
  opened boolean not null default false,
  opened_at timestamptz
);
alter table future_me_letters enable row level security;
drop policy if exists "future_me_letters: owner all" on future_me_letters;
create policy "future_me_letters: owner all" on future_me_letters
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
