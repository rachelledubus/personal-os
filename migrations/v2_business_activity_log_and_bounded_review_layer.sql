-- ============================================================
-- BUSINESS ACTIVITY LOG — shared by Quick Touch Logger and the
-- Weekly Business Scorecard. One log, two consumers, per spec.
-- Same lightweight shape as energy_logs — a single tap writes one
-- row, no required fields beyond type and timestamp.
-- ============================================================

create table if not exists business_activity_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  type text not null check (type in ('conversation', 'partner_touch', 'content_published', 'follow_up')),
  timestamp timestamptz not null default now(),
  related_contact_id uuid references contacts(id) on delete set null,
  related_lead_id uuid references contacts(id) on delete set null,
  notes text,
  channel text check (channel in ('call', 'text', 'email', 'unspecified')) default 'unspecified'
);
alter table business_activity_log enable row level security;
drop policy if exists "business_activity_log: owner all" on business_activity_log;
create policy "business_activity_log: owner all" on business_activity_log
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists idx_business_activity_log_timestamp on business_activity_log (user_id, timestamp);

-- ============================================================
-- BOUNDED WEEKLY REVIEW — reflection answers stored as selected
-- chips (an array, since more than one can apply), paired with the
-- EXISTING free-text columns (what_worked, what_didnt,
-- needs_attention, next_week_priorities) which become optional
-- instead of the only way to answer.
-- ============================================================

alter table weekly_business_reviews add column if not exists what_worked_chips text[] default '{}';
alter table weekly_business_reviews add column if not exists what_didnt_chips text[] default '{}';
alter table weekly_business_reviews add column if not exists needs_attention_chips text[] default '{}';
alter table weekly_business_reviews add column if not exists next_week_priorities_chips text[] default '{}';

