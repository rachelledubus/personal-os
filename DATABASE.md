# Database Reference

Backed by Supabase (Postgres). Every table has Row Level Security enabled.
Almost all are scoped to `auth.uid()` (each signed-in user only sees their
own rows) — the two exceptions are `public_submissions` and
`neighborhood_profiles`, which power the Public Tools and are documented
separately below. Full definitions live in `schema.sql` plus the
migration files listed in `CHANGELOG.md` — this file is a plain-English
index of what each table is for.

| Table | Purpose |
|---|---|
| `profiles` | One row per user, auto-created on signup |
| `settings` | Per-user nutrition/habit/dashboard defaults |
| `foods` | Reusable food database |
| `meal_logs` | Daily meal entries |
| `workouts` | Logged lifting sessions (one row per session) |
| `habits` / `habit_logs` | Habit definitions + daily completion |
| `tasks` | General task manager |
| `weekly_reviews` | One entry per week (wins/challenges/lessons/etc) |
| `notes` | Quick freeform notes |
| `checklist_items` / `checklist_logs` | Routine (AM/PM) + Chores (daily/weekly/monthly) — generalized, parameterized by `list_key` |
| `daily_priorities` | Today's top-3 priorities, scoped by date |
| `inbox_items` | Quick Capture inbox |
| `appointments` | Upcoming appointments |
| `bills` | Recurring monthly bills (has a Personal/Business `account` field) |
| `transactions` | Income & expense ledger |
| `debts` | Debt payoff tracker |
| `savings_goals` | Savings goals with progress |
| `leads` | Old simple lead tracker — **deprecated**, data preserved but UI no longer uses it (see `contacts`) |
| `contacts` | Full relationship/CRM tracker (replaces `leads`) |
| `pipeline_deals` | Deal stage tracker |
| `content_items` / `content_logs` | Daily content checklist (repeating) |
| `content_calendar_items` | Forward-looking content calendar (date/platform/status) |
| `reference_library` | Voice/CTA/Script/Prompt/Template library |
| `grocery_items` | Grocery list (checkable, categorized) |
| `public_submissions` | Public Tools visitor capture (see below) |
| `neighborhood_profiles` | Owner-edited, publicly-displayed neighborhood facts (see below) |

Every table above is built and has a working UI as of 2026-07-20. The one
deliberately-unbuilt piece is noted in `TODO.md` (Reference Library
additions for the CRM spreadsheet's Follow-Up Standards / Maintenance
Checklist tabs — optional, low priority).

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

**`reference_library`** — as of 2026-07-20, has a sixth category,
`reference` ("CRM Reference" in the UI), holding the CRM spreadsheet's
Follow-Up Standards and Maintenance Checklist content. Added via
`reference_library_category_migration.sql`, which widens the category
check constraint — additive, no existing rows touched. Unlike every other
piece of seed content (which only inserts for brand-new users on first
load), these two entries insert for *every* user on next login if
missing, checked by title — see `seedAdditionalReferenceContentIfMissing()`
in `ARCHITECTURE.md` for why that's a different pattern from
`seedReferenceLibraryIfEmpty()`.

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

**`checklist_items` / `checklist_logs`** — one generalized pair of tables
replacing what used to be five separate localStorage checklists (Routine
AM, Routine PM, Chores Daily/Weekly/Monthly). `list_key` picks which list
a row belongs to; `period_marker` works exactly like `habit_logs` —
today's date for daily lists, the Monday of the current week for weekly,
`YYYY-MM` for monthly. Follow this same items+logs+marker shape for any
future recurring checklist rather than inventing a new one.

**`daily_priorities`** — scoped by `priority_date`, so unlike the old
localStorage version (which had no reset mechanism at all), a fresh set
of priorities naturally starts each day. History isn't deleted, just not
shown — querying past dates would surface it if that's ever wanted.

**`public_submissions` / `neighborhood_profiles`** — the two exceptions to
"every table is scoped to `auth.uid()`." Both intentionally have **no**
`user_id` column:
- `public_submissions` needs anonymous visitors to be able to insert
  without being signed in at all, so there's no `auth.uid()` to scope to.
  Its RLS instead splits by operation: `insert` is open to everyone,
  everything else (`select`/`update`/`delete`) requires
  `auth.role() = 'authenticated'`.
- `neighborhood_profiles` needs anonymous visitors to be able to *read*
  it (it's rendered on the public Neighborhood Explorer), so `select` is
  open to everyone; only `authenticated` can write.

Both rely on this being a single-owner app — "any authenticated user"
and "the owner" are the same thing in practice. If this app ever supports
multiple independent owners, these two policies are the first thing that
would need to change (to scope by an owner id instead of just checking
"signed in or not").

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
