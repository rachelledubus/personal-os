-- ============================================================
-- Migration: Periodic habit reminders (Sora's domain, revised)
-- ============================================================
-- Replaces the earlier standalone "frequently forgotten" list concept
-- (never shipped/run) — flags live on the actual habits themselves
-- instead of a separate list, so there's one place to manage a habit,
-- not two. AI suggests the interval per habit (drink water might be
-- hourly, take vitamins might be once) rather than a single global
-- cadence for everything.
-- ============================================================

alter table habits add column if not exists remind_periodically boolean not null default false;
alter table habits add column if not exists reminder_interval_minutes integer;
alter table habits add column if not exists last_reminded_at timestamptz;
