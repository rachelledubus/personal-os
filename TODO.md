# TODO / Roadmap

Ordered by recommended priority, not by category. "Done" items are here for
context on how recently they closed, not because they need action.

## ✅ Just completed (2026-07-20)
- Migrate Workouts, Appointments, Bills from localStorage → Supabase
- Build full Contacts CRM from uploaded spreadsheet (replaces Leads tracker,
  covers referral tracking) — **run `contacts_migration.sql` in Supabase
  before this goes live**
- Header: year added, time-of-day greeting
- Motivational quote widget (Home)
- Build Your Own Meal (Nutrition)
- Automated Grocery List (Nutrition) — **run `grocery_migration.sql` in
  Supabase before this goes live**
- Confirmed Task list already fully built — no action needed
- Expanded Budget → Finances tab: income tracking, debt payoff, savings
  goals, personal/business split, recurring vs. one-time — **run
  `finance_migration.sql` in Supabase before this goes live**

## 🔜 Recommended next (not started, no personal preference needed to begin)
1. **Migrate the remaining localStorage modules**: Today's Priorities,
   Quick Capture inbox, Routine (morning/evening), Chores. These need small
   new tables (none exist yet — `schema.sql` has no equivalent).
2. **Notes tab UI** — the `notes` table already exists and is unused. Quick
   win: a simple capture + list view, same pattern as every other module.
3. **Weekly Reviews UI** — the `weekly_reviews` table already exists and is
   unused. A simple form (wins/challenges/lessons/etc, one per week) plus a
   list of past reviews.
4. **Content Calendar** — my recommendation: build this as a genuinely new
   table/feature (e.g. `content_calendar`: a date, a platform, a content
   piece, a status like Idea/Drafted/Scheduled/Posted), separate from the
   existing "Content Checklist" (which is a *repeating daily* task list —
   "did I post today," reset every day — not a forward-looking calendar of
   what to post when). Keeping them separate avoids overloading one feature
   with two different jobs. Not started yet — flagging as the next
   reasonable milestone after Notes/Weekly Reviews, rather than building
   three sizable things in one session.
5. **Reference Library additions** — the uploaded CRM spreadsheet's
   "Follow-Up Standards" and "Maintenance Checklist" tabs are reference
   material, not data-entry tables. They'd fit naturally as a few new
   entries in the existing Reference Library (which already has a
   `category` field and free-text body) rather than as new UI. Low
   priority, easy to add whenever.

## 🧭 Decided this session
- **Public Tools data architecture** (Home Match Quiz, Future Home Planner,
  Neighborhood Explorer, Relocation Planner, Buyer Dashboard) — my call, as
  requested. Plan: these stay public/no-login pages, separate from the
  authenticated app. Any submission (quiz answers, planner inputs) will
  write to a new insert-only table via a public RLS policy that allows
  anonymous *inserts* but not reads/edits/deletes — so a stranger can submit
  a quiz, but only you, signed in, can see results. From your dashboard, a
  submission can then be reviewed and turned into a `contacts` row with one
  click (category defaulting to "Lead", source noting which tool it came
  from) rather than auto-creating a contact for every anonymous visitor.
  This is a decision, not yet built — flagging as a future milestone,
  since it's a new architectural surface (first public-facing part of the
  app) worth building deliberately rather than rushed alongside other work.

## 🌱 Longer-term (explicitly mentioned as future direction, no immediate action)
- AI assistant integration
- Finance tracking (beyond bills — budgets, spending categories, etc.)
- Client portals (would need a second, more restricted auth role/tier)
- Analytics dashboard
- Additional real estate tools

## Housekeeping
- Keep this file, `CHANGELOG.md`, `DATABASE.md`, and `ARCHITECTURE.md`
  updated as part of every feature, not as a separate cleanup pass.
