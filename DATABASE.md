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
| `bills` | Recurring monthly bills | ✅ Finances tab *(migrated + `account` column added — see Changelog)* |
| `transactions` | Income & expense ledger | ✅ Finances tab *(added — see Changelog)* |
| `debts` | Debt payoff tracker | ✅ Finances tab *(added — see Changelog)* |
| `savings_goals` | Savings goals with progress | ✅ Finances tab *(added — see Changelog)* |
| `leads` | Old simple lead tracker | ⚠️ **Deprecated.** Data preserved, UI no longer uses it — see `contacts` below |
| `contacts` | Full relationship/CRM tracker (replaces `leads`) | ✅ Business tab *(added — see Changelog)* |
| `pipeline_deals` | Deal stage tracker | ✅ Business tab |
| `content_items` / `content_logs` | Daily content checklist | ✅ Business tab |
| `reference_library` | Voice/CTA/Script/Prompt/Template library | ✅ Business tab |
| `grocery_items` | Grocery list (checkable, categorized) | ✅ Nutrition tab *(added — see Changelog)* |

## Not yet backed by any table (still `localStorage`)

These currently persist only in the browser and are **not** synced across
devices or backed up. See `TODO.md` for the plan.

- Today's Priorities (Dashboard, capped at 3)
- Quick Capture inbox (Dashboard)
- Routine — Morning / Evening checklists (Dashboard)
- Chores — Daily / Weekly / Monthly checklists

## Notes on specific tables

**`contacts`** — the real CRM, modeled directly on the uploaded spreadsheet
("System 07 — Database, CRM & Follow-Up System"). Seven categories (`Lead`,
`Future Client`, `Active Client`, `Past Client`, `Sphere`, `Partner`,
`Agent Referral`) replace the old five-status `leads` model. Referral
tracking isn't a separate table — it's `category = 'Agent Referral'` plus
sources like `Sphere Referral` / `Partner Referral`, surfaced as a
"referral relationships" KPI on the Business tab (counts any contact whose
category is Agent Referral, or whose source mentions "referral"). Fields
mirror the spreadsheet's four blocks (Basic Information, Relationship
Information, Real Estate Information, Follow-Up Information); the
spreadsheet's computed `Days Until Follow-Up` and `Status` columns aren't
stored — they're calculated live in the UI from `next_follow_up_date`,
same approach as the existing `daysFromToday()` helper already used
elsewhere in the app.

**`leads`** — deprecated but not deleted. See `contacts_migration.sql`,
which is additive-only: it creates `contacts` and copies every existing
lead into it, without touching or dropping the `leads` table. Nothing was
lost. `leads` can be dropped manually later, once you've confirmed the new
Contacts view has everything — see the commented-out `drop table` line at
the bottom of the migration file.

**`transactions` / `debts` / `savings_goals`** — the Finances tab (the tab
formerly labeled "Budget"). All three, plus `bills`, share an `account`
column (`'Personal'` or `'Business'`), and the Finances tab has one filter
pill row at the top that filters all four sections at once. Logging a debt
payment or a bill doesn't just update that table — a debt payment also
inserts a matching `Expense` row into `transactions`, so the Income &
Expenses ledger and the Debt Payoff tracker never drift apart. Savings
contributions do NOT create a transaction (treated as a transfer, not
income/spending, to avoid double-counting net cash flow).

**`grocery_items`** — seeded once per user (same pattern as
`reference_library`/`habits`) from the staples that used to be a static,
uneditable list. "Build Your Own Meal" writes into this table too, via
`addGroceryItemIfMissing()`, so picking ingredients there and shopping for
them are the same list.

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
