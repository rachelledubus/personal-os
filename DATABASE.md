# Database Reference

Backed by Supabase (Postgres). Every table has Row Level Security enabled,
scoped to `auth.uid()`, so each signed-in user only ever sees their own rows.
Full definitions live in `schema.sql` — this file is a plain-English index
of what each table is for and whether the UI is actually connected to it yet.

| Table | Purpose | UI connected? |
|---|---|---|
| `profiles` | One row per user, auto-created on signup | ✅ (auth only, no dedicated UI) |
| `settings` | Per-user nutrition/habit/dashboard defaults | ✅ Nutrition goals |
| `foods` | Reusable food database | ✅ Nutrition tab |
| `meal_logs` | Daily meal entries | ✅ Nutrition tab |
| `workouts` | Logged lifting sessions (one row per session) | ✅ Workouts tab *(migrated — see Changelog)* |
| `habits` / `habit_logs` | Habit definitions + daily completion | ✅ Habits tab |
| `tasks` | General task manager | ✅ Tasks tab |
| `weekly_reviews` | Weekly reflection entries | ❌ Table exists, no UI yet |
| `notes` | Quick freeform notes | ❌ Table exists, no UI yet |
| `appointments` | Upcoming appointments | ✅ Appointments tab *(migrated — see Changelog)* |
| `bills` | Recurring monthly bills | ✅ Budget tab *(migrated — see Changelog)* |
| `leads` | Lead & follow-up tracker | ✅ Business tab |
| `pipeline_deals` | Deal stage tracker | ✅ Business tab |
| `content_items` / `content_logs` | Daily content checklist | ✅ Business tab |
| `reference_library` | Voice/CTA/Script/Prompt/Template library | ✅ Business tab |

## Not yet backed by any table (still `localStorage`)

These currently persist only in the browser and are **not** synced across
devices or backed up. See `TODO.md` for the plan.

- Today's Priorities (Dashboard, capped at 3)
- Quick Capture inbox (Dashboard)
- Routine — Morning / Evening checklists (Dashboard)
- Chores — Daily / Weekly / Monthly checklists

## Notes on specific tables

**`workouts`** — one row per logged session, not one row per exercise. The
`exercises` jsonb column holds an array like
`[{ "id": "squat", "sets": [{ "weight": "135", "reps": "8" }, ...] }, ...]`.
"Last session" shown in the UI is simply the most recent row for a given
`day_key` (A/B/C). The exercise *definitions* (names, target reps, set
counts) are intentionally NOT in the database — they're app configuration
hardcoded in `js/app.js` (`DAYS` constant), since they're not user data.

**`bills`** — `paid_month` (e.g. `'2026-07'`) replaces what used to be a
single global "last reset" marker in localStorage. Each bill independently
remembers the month it was paid; on load, any bill whose `paid_month`
doesn't match the current month gets flipped back to unpaid automatically.

**`appointments`** — column names are `appt_date` / `appt_time` (not
`date`/`time`) to avoid reserved-word ambiguity in Postgres/PostgREST.

## Making schema changes

- Always additive/non-destructive where possible (`add column`, new table)
  rather than dropping or renaming existing columns in place.
- Write changes as a runnable SQL block, note it in `CHANGELOG.md`, and
  actually apply it in the Supabase SQL Editor — I cannot run migrations
  against your live database myself.
- New tables should follow the existing pattern exactly: `id uuid primary
  key default gen_random_uuid()`, `user_id uuid references auth.users(id)
  on delete cascade not null`, RLS enabled, `for all using (auth.uid() =
  user_id) with check (auth.uid() = user_id)`.
