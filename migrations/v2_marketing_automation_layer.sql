-- ============================================================
-- MARKETING AUTOMATION ENGINE
-- Form submits -> contact created/tagged -> enrolled in an
-- automation -> a scheduled function checks next_send <= now() every
-- 15 minutes, sends the current step's email, advances to the next
-- step, computes the new next_send from that step's delay_days.
-- No AI involved — this is a deterministic state machine, exactly as
-- specced.
-- ============================================================

alter table contacts add column if not exists tags text[] default '{}';

create table if not exists email_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  subject text not null,
  body text not null,
  created_at timestamptz default now()
);
alter table email_templates enable row level security;
drop policy if exists "email_templates: owner all" on email_templates;
create policy "email_templates: owner all" on email_templates
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table if not exists automations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  description text,
  active boolean not null default true,
  created_at timestamptz default now()
);
alter table automations enable row level security;
drop policy if exists "automations: owner all" on automations;
create policy "automations: owner all" on automations
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table if not exists automation_steps (
  id uuid primary key default gen_random_uuid(),
  automation_id uuid references automations(id) on delete cascade not null,
  step_order integer not null,
  delay_days integer not null default 0,
  template_id uuid references email_templates(id) on delete set null,
  unique (automation_id, step_order)
);
alter table automation_steps enable row level security;
drop policy if exists "automation_steps: owner via automation" on automation_steps;
create policy "automation_steps: owner via automation" on automation_steps
  for all using (exists (select 1 from automations a where a.id = automation_id and a.user_id = auth.uid()))
  with check (exists (select 1 from automations a where a.id = automation_id and a.user_id = auth.uid()));

create table if not exists automation_enrollments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  contact_id uuid references contacts(id) on delete cascade not null,
  automation_id uuid references automations(id) on delete cascade not null,
  current_step integer not null default 0,
  next_send timestamptz,
  status text not null default 'active' check (status in ('active', 'completed', 'cancelled')),
  enrolled_at timestamptz default now(),
  last_sent_at timestamptz
);
alter table automation_enrollments enable row level security;
drop policy if exists "automation_enrollments: owner all" on automation_enrollments;
create policy "automation_enrollments: owner all" on automation_enrollments
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists idx_automation_enrollments_next_send on automation_enrollments (next_send) where status = 'active';
