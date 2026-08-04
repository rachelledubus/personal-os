-- ============================================================
-- MILESTONE STEPS — breaks each roadmap milestone into concrete,
-- single-sitting sub-steps. A milestone like "Build the first
-- referral asset" doesn't tell you what to physically do right now;
-- this does. Requested multiple times before this got built.
-- ============================================================

create table if not exists milestone_steps (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  milestone_id uuid references milestones(id) on delete cascade not null,
  title text not null,
  sort_order integer not null default 0,
  completed boolean not null default false
);
alter table milestone_steps enable row level security;
drop policy if exists "milestone_steps: owner all" on milestone_steps;
create policy "milestone_steps: owner all" on milestone_steps
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists idx_milestone_steps_milestone on milestone_steps (milestone_id);
