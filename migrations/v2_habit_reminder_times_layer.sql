-- ============================================================
-- Migration: Fixed-time habit reminders (second mode alongside interval)
-- ============================================================
-- reminder_mode picks which of the two the habit uses. reminder_times
-- is a plain array of 'HH:MM' strings — deliberately simple, no
-- timezone handling beyond what the browser's local time already
-- gives us, matching how every other time-of-day field in this app
-- works (life_rhythm_blocks.start_time, etc.).
-- ============================================================

alter table habits add column if not exists reminder_mode text not null default 'interval'; -- 'interval' | 'times'
alter table habits add column if not exists reminder_times text[]; -- e.g. ['09:00','13:00','18:00'], only used when reminder_mode = 'times'
