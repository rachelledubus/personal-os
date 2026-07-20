# Changelog

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
