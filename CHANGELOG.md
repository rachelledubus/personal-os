# Changelog

## 2026-07-20 (4) — Expand Budget tab into a full Finances tab

**Why:** Asked for a "more extensive financial tab." Clarifying questions
narrowed scope to: income tracking, debt payoff tracking, savings goals,
personal vs. business separation, and recurring vs. one-time transactions
— explicitly not spending-by-category analytics or bank/CSV import (manual
entry, decided as "figure out later" so built manual-only for now).

**What changed:**

- **Renamed** the "Budget" tab/nav-card to "Finances" (label text only —
  underlying `data-tab="budget"` / `id="panel-budget"` left unchanged so
  nothing else in the code had to change).
- **New shared Personal/Business filter** at the top of the tab — one set
  of filter pills (same `.ref-filter-btn` pattern used by Reference
  Library and Contacts) that filters Bills, Transactions, Debts, and
  Savings Goals together.
- **Bills** — gained an `account` field (Personal/Business), shown per
  bill and respected by the filter. Everything else about Bills is
  unchanged.
- **New: Income & Expenses ledger** (`transactions` table) — log income
  or expenses with an amount, date, description, account, and whether
  it's recurring (One-time/Weekly/Biweekly/Monthly/Yearly). Shows a
  running "net this month" figure.
- **New: Debt Payoff tracker** (`debts` table) — original vs. current
  balance with a progress bar (reusing the exact `.progress-track`/
  `.progress-fill` styling from the Nutrition macro bars), interest rate,
  minimum payment. Logging a payment reduces the balance **and**
  automatically logs a matching expense in the transactions ledger, so
  the two stay in sync without double entry.
- **New: Savings Goals** (`savings_goals` table) — target vs. current
  amount with the same progress-bar treatment, optional target date,
  "Add contribution" to log progress. Contributions do NOT create a
  transaction (a transfer into savings isn't income or spending — see
  `DATABASE.md` for the reasoning).

**What did NOT change:** no new CSS anywhere — the debt/savings cards
reuse `.exercise`/`.exercise-head`/`.macro-row`/`.progress-track` from the
Workouts and Nutrition tabs; the transaction ledger reuses `.inbox-item`;
everything else reuses `.form-grid`/`.save-bar`/`.pill-btn` like every
other module.

**Action required from you:** run `finance_migration.sql` in the Supabase
SQL Editor — it adds the `account` column to your existing `bills` table
(your current bills default to `'Personal'` automatically, nothing to
re-enter) and creates the three new tables.

---

## 2026-07-20 (3) — Header polish, quote widget, Build Your Own Meal, automated grocery list

**What changed:**

- **Header** — date line now includes the year; "Rachelle's System" in the
  topbar is now a time-of-day greeting ("Good morning, Rachelle" etc,
  recalculated each time the app loads). Browser tab title and the sign-in
  screen still say "Rachelle's System" — only the in-app header changed.
- **Motivational quote widget** (Home tab) — new card, 20 original lines
  (no real-person attribution — written for this app, not sourced), picks
  a new random one on every Home tab visit, plus a manual "shuffle" link.
- **Build Your Own Meal** (Nutrition tab) — new interactive card built
  directly on the existing Meal-Building Framework's five slots
  (Protein/Carb/Soft Veggie/Fat/Flavor). Pick one option per slot or hit
  Shuffle; "Add ingredients to grocery list" pushes the current picks into
  the new Grocery List (below), skipping anything already on it.
- **Automated Grocery List** (Nutrition tab) — replaced the old static,
  uneditable list with a real one: new `grocery_items` table (see
  `grocery_migration.sql`), seeded once per user from the same staples
  that used to be hardcoded, then fully interactive — check items off, add
  your own, "Clear checked items" to reset for next week. Also the landing
  spot for anything added from Build Your Own Meal.
- **Task list** — checked, and it's already fully built (Tasks tab,
  Supabase-backed) — no changes needed there.

**What did NOT change:** no new CSS classes anywhere — Build Your Own Meal
and the Grocery List both reuse `.form-grid`, `.task-row`, `.row-remove`,
`.add-row`, `.reset-bar`, and `.grocery-grid`, all already in the
stylesheet.

**Action required from you:** run `grocery_migration.sql` in the Supabase
SQL Editor — the Grocery List and Build Your Own Meal's "add to grocery
list" button need the `grocery_items` table to exist first.

---

## 2026-07-20 (2) — Build Contacts CRM from uploaded spreadsheet; deprecate Leads

**Why:** Asked to build "referral tracking" from an uploaded spreadsheet
(`System_07__CRM_Database_Google_Sheets.xlsx`). Reading it showed referral
tracking isn't a standalone feature in the source material — it's one
dimension of a full relationship/CRM system (7 contact categories, real
estate–specific fields, computed follow-up status) that's considerably
richer than the app's existing simple Leads tracker. Building referral
tracking properly meant building this system, matching the spreadsheet
as the authoritative source, rather than bolting a narrower feature on
top of a tracker the spreadsheet effectively supersedes.

**What changed:**

- **New table: `contacts`** (`contacts_migration.sql`) — matches the
  spreadsheet's Contacts tab: Basic Info, Relationship Info, Real Estate
  Info, Follow-Up Info. Categories: Lead, Future Client, Active Client,
  Past Client, Sphere, Partner, Agent Referral (replacing the old 5-status
  `leads.status` field). Dropdown option lists (Source, Persona, Location
  Interest, Timeline, Buyer/Seller) copied verbatim from the spreadsheet's
  hidden `Lists` tab.
- **Migration is additive/non-destructive** — `leads` table and its data
  are untouched; the migration copies existing leads into `contacts`
  (status → category mapping documented in the SQL file itself) and can be
  re-run safely without creating duplicates.
- **Business tab UI** — "Lead & Follow-Up Tracker" replaced with
  "Contacts": category filter pills (reusing the existing
  `.ref-filter-btn` style already established by the Reference Library),
  a richer add-contact form, and contact cards showing category badge,
  source, timeline/persona/location, and next action — all built from
  existing CSS classes (`.lead-item`, `.lead-badge`, `.lead-sub`,
  `.lead-actions`, `.ref-add-form`), so **zero new CSS was added**.
- **Business KPIs** — added a "referral relationships" stat (category =
  Agent Referral, or source mentions "referral"); relabeled "new leads"
  → "new contacts" for accuracy; KPI calculations now read from `contacts`
  instead of `leads`.
- **Home tab** "today-business" follow-up count now reads from `contacts`.
- `js/leads.js` module fully replaced by `js/contacts.js` (same file,
  renamed section) — no leftover references to the old functions/IDs
  (`loadLeads`, `lead-status`, etc.) remain anywhere in the codebase;
  verified by search.

**What did NOT change:** the Pipeline and Content Checklist sections of
the Business tab, and no CSS/visual system changes anywhere — every new
UI element reuses existing classes.

**Action required from you:** run `contacts_migration.sql` in the
Supabase SQL Editor before this deploys — the `contacts` table doesn't
exist until that migration runs. The old `leads` table is left in place
and can be dropped later at your discretion (see `DATABASE.md`).

**Architecture decisions made this session (documented, not yet built):**
see `TODO.md` for the Public Tools data-architecture decision and the
Content Calendar recommendation.

---

## 2026-07-20 — Migrate Workouts, Appointments, and Bills off localStorage

**Why:** These three modules had matching tables already defined in
`schema.sql` (`workouts`, `appointments`, `bills`, complete with RLS
policies) but the UI was never wired up to them — it was still reading and
writing to the browser's `localStorage`. That meant this data wasn't synced
across devices and wasn't backed up, unlike every other module in the app.
No schema changes were needed; this was purely a UI/data-layer fix.

**What changed (`index.html` only):**

- **Workouts** — `loadWkDayLog`/`wkDayLogs` (localStorage, keyed by
  `day-log-A/B/C`) replaced with `loadLastWorkoutSession()` /
  `addWorkoutSessionRow()` against the `workouts` table. Each "Save Today's
  Session" click now inserts one row (`workout_date`, `day_key`, `focus`,
  `exercises` jsonb, `completed`). "Last session" prefill now comes from the
  most recent matching row instead of an in-memory history array.
- **Appointments** — `loadAppts`/`saveAppts` (localStorage key
  `appointments`) replaced with `loadAppts()` / `addApptRow()` /
  `deleteApptRow()` against the `appointments` table. Field names updated
  to match the table (`appt_date`/`appt_time` instead of `date`/`time`).
- **Bills** — `loadBills`/`saveBills` (localStorage keys `bills` +
  `bills-marker`) replaced with `loadBills()` / `addBillRow()` /
  `toggleBillPaidRow()` / `deleteBillRow()` against the `bills` table. The
  single global "reset marker" is replaced by the existing `paid_month`
  column on each bill row, checked and lazily reset per-bill on load.

**What did NOT change:** any HTML, CSS, layout, button placement, or visual
behavior. All three tabs look and behave identically from the user's side —
this was purely swapping out where the data lives.

**Verified:** inline JS re-checked with `node --check` after edits (syntax
clean); all call sites for the renamed/async functions reviewed for
consistency with the existing fire-and-forget async pattern used elsewhere
in the app (matches `habits.js`/`tasks.js`/`leads.js` conventions).

**Also added:** initial project documentation (`README.md`,
`ARCHITECTURE.md`, `DATABASE.md`, `TODO.md`) — not present before this
session.

---

## Prior history (undocumented)

Everything before this entry (auth, Nutrition, Habits, Tasks, Leads,
Pipeline, Content Checklist, Reference Library, Business KPIs) was already
built and Supabase-backed before formal changelog tracking began. Treat
2026-07-20 as the baseline going forward.
