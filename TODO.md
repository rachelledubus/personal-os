# TODO / Roadmap

Ordered by recommended priority, not by category. "Done" items are here for
context on how recently they closed, not because they need action.

User-requested Additions:
- "Build Your Own Meal" feature based on the meal-building framework
- Automated grocery list
- Automated task list if not already added
- A bit more extensive financial tab. Ask clarification questions to help me determine what else I need.

## ✅ Just completed (2026-07-20)
- Migrate Workouts, Appointments, Bills from localStorage → Supabase

## 🔜 Recommended next (not started, no personal preference needed to begin)
1. **Migrate the remaining localStorage modules**: Today's Priorities,
   Quick Capture inbox, Routine (morning/evening), Chores. These need small
   new tables (none exist yet — `schema.sql` has no equivalent). Lower
   urgency than Workouts/Appointments/Bills was, since these are more
   "disposable" day-to-day items, but same underlying risk (not backed up,
   not synced across devices).
2. **Notes tab UI** — the `notes` table already exists and is unused. Quick
   win: a simple capture + list view, same pattern as every other module.
3. **Weekly Reviews UI** — the `weekly_reviews` table already exists and is
   unused. A simple form (wins/challenges/lessons/etc, one per week) plus a
   list of past reviews.

## 🧭 Needs your input before starting (flagging now, not deciding for you)
- **Public Tools** (Home Match Quiz, Future Home Planner, Neighborhood
  Explorer, Relocation Planner, Buyer Dashboard) — these are public-facing,
  meaning no login required, which is a different security model than
  everything else in this app (which is entirely behind auth + RLS). Before
  building these I'll want to confirm: should results/submissions from
  these tools be saved anywhere (e.g. to turn a quiz-taker into a lead in
  your `leads` table), and if so, what should be public vs. private about
  that data. This is an architecture decision, not just a feature — flagging
  per your instructions before treating it as a "just build it" task.
- **Referral tracking** — you listed this under Business, but there's no
  dedicated table for it yet. Worth checking: is this meant to be a new
  status/field on `leads` (e.g. "source: referral" — which already exists
  as a free-text `source` field), or a genuinely separate tracker with its
  own relationships (who referred whom, reciprocal referrals, etc)? The
  answer changes whether this is a 10-minute change or a new table.
- **Content Calendar** — you listed this separately from the existing
  "Content Checklist" (which is a daily repeating task list, not a
  calendar). Worth confirming these are meant to be two different things
  before I build a second content-related feature that might overlap.

## 🌱 Longer-term (explicitly mentioned as future direction, no immediate action)
- AI assistant integration
- Finance tracking (beyond bills — budgets, spending categories, etc.)
- Client portals (would need a second, more restricted auth role/tier)
- Analytics dashboard
- Additional real estate tools

## Housekeeping
- Keep this file, `CHANGELOG.md`, `DATABASE.md`, and `ARCHITECTURE.md`
  updated as part of every feature, not as a separate cleanup pass.
