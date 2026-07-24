-- ============================================================
-- Migration: manual roadmap status override
-- ============================================================
-- Real gap found in usage: status was purely date-inferred with no
-- way to say "I'm working on this week now" ahead of schedule, or
-- "not yet" if running behind. This adds the override, protected from
-- the passive syncRoadmapStatuses() sweep the same way completed
-- items already are.
-- ============================================================

alter table roadmap_items add column if not exists status_manual boolean not null default false;
