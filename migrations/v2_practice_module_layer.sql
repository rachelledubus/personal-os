-- ============================================================
-- PRACTICE MODULE — pre-calc/calc study system. Daily queue (new
-- items from the current "learning" topic + spaced-repetition items
-- due today), not the whole bank at once. Spaced-repetition logic
-- itself lives in code (pure, testable function), not in the DB.
-- ============================================================

create table if not exists practice_topics (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  phase text not null,
  status text not null default 'not_started' check (status in ('not_started', 'learning', 'practiced', 'mastered')),
  sort_order integer not null default 0
);
alter table practice_topics enable row level security;
drop policy if exists "practice_topics: owner all" on practice_topics;
create policy "practice_topics: owner all" on practice_topics
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table if not exists practice_problems (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  topic_id uuid references practice_topics(id) on delete cascade not null,
  prompt text not null,
  answer text not null,
  user_answer text,
  is_correct boolean,
  difficulty text not null default 'medium' check (difficulty in ('easy', 'medium', 'hard')),
  source text not null default 'seed' check (source in ('seed', 'generated')),
  next_review_date date,
  review_interval_days integer not null default 1,
  miss_reason text check (miss_reason in ('arithmetic_slip', 'forgot_method', 'concept_gap') or miss_reason is null),
  attempt_count integer not null default 0,
  correct_first_try boolean,
  created_at timestamptz default now()
);
alter table practice_problems enable row level security;
drop policy if exists "practice_problems: owner all" on practice_problems;
create policy "practice_problems: owner all" on practice_problems
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists idx_practice_problems_review on practice_problems (user_id, next_review_date);
create index if not exists idx_practice_problems_topic on practice_problems (topic_id);

create table if not exists practice_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  session_date date not null default current_date,
  problems_attempted integer not null default 0,
  problems_correct integer not null default 0,
  topic_ids uuid[] default '{}'
);
alter table practice_sessions enable row level security;
drop policy if exists "practice_sessions: owner all" on practice_sessions;
create policy "practice_sessions: owner all" on practice_sessions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
