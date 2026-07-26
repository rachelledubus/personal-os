-- ============================================================
-- PUSH SUBSCRIPTIONS
-- One row per browser/device that's granted notification permission
-- and subscribed. A user can have more than one (phone + desktop),
-- so this isn't a single column on a settings table.
-- ============================================================

create table if not exists push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  endpoint text not null unique,
  keys_p256dh text not null,
  keys_auth text not null,
  created_at timestamptz default now()
);
alter table push_subscriptions enable row level security;
drop policy if exists "push_subscriptions: owner all" on push_subscriptions;
create policy "push_subscriptions: owner all" on push_subscriptions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
