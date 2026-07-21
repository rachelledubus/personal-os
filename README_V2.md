# Rachelle's System — V2

A rebuilt version of the app: React + Vite (build step) + your existing
Supabase project, deployed the same way (GitHub → Netlify). Nothing about
your existing data changes — every migration below is additive.

## What this is, honestly

This is a real, working scaffold covering all five zones from the new IA
(Today, Plan, Grow, Business, Library), with the Mission Engine, Meal
Planner, Guided Flows, and Weekly Reset auto-prompt fully wired to real
data. It is a first full pass, not a finished, polished product — Grow
and Library in particular reuse simpler, denser UI than Today/Plan/
Business, since that's genuinely where the new logic lives. Treat this as
the real foundation to keep iterating on, not a one-and-done drop.

## Setup

1. **Copy this whole folder into your GitHub repo** (replacing the old
   `index.html`-based version, or as a new branch — your call).
2. **Run the migrations**, in this order, in the Supabase SQL Editor —
   skip any you've already run from before:
   - Everything already listed in the old `TODO.md` (contacts, grocery,
     finance, remaining_features, reference_library_category,
     bos_completion)
   - `migrations/v2_meal_planner.sql`
   - `migrations/v2_foundation_layer.sql` (Goals/Projects/Time Blocks/
     Preferences — see notes below)
   - `migrations/v2_missions_layer.sql`
3. **Environment variables** — in Netlify: Site settings → Environment
   variables, add:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   (same values you're already using — just re-entered as env vars
   instead of hardcoded, since the anon key now lives in a public repo).
4. **Netlify build settings** — already configured via `netlify.toml`:
   build command `npm run build`, publish directory `dist`. Nothing to
   set manually.
5. Push to GitHub → Netlify builds and deploys automatically, same as
   before.

## Architecture, for future you (or a future AI layer)

Per your instruction to keep this extensible without hardcoding around
future automation:

- **Tasks, Time Blocks, and recurring routines are three separate
  concepts** — `tasks` (one-time/project work), `time_blocks` (calendar-
  scheduled), habits/chores/content_items (self-resetting routines).
  Don't collapse these into one table later; a future scheduler needs
  them distinguishable.
- **Goals → Projects → Tasks** is a real foreign-key chain
  (`goals.id` ← `projects.goal_id`, `projects.id` ← `tasks.project_id`),
  both optional at every level, so nothing is forced into a hierarchy it
  doesn't need.
- **`user_preferences`** is the one place personal context should be
  written going forward — schema-light (`category` + `key` + jsonb
  `value`) specifically so a future AI feature can read/write it without
  a migration every time a new preference type shows up.
- **`activity_log`** is a generic, append-only event log
  (`source_table` + `source_id` + `event_type` + `metadata`) any module
  can write to. This is the seam a future "reason over historical
  patterns" feature would read from — it doesn't exist yet, but the log
  it would need does.
- **The Mission Engine (`src/services/missions.js`) reads existing
  tables live** rather than duplicating their data into a new "missions"
  table. This matters for AI-readiness: whoever/whatever reasons over
  "today's missions" later is reasoning over the same tables everything
  else already trusts, not a stale mirror of them.
- **Guided Flows (`src/services/flows.js`)** are defined as plain data
  (steps + fields + an `onComplete` function) rather than hardcoded
  component trees — adding a new SOP flow later means adding one object
  to `FLOWS`, not writing a new page.

## Known gaps in this pass (next iteration)

- Grow and Library zones are functionally complete but visually plainer
  than Today/Plan/Business — habit garden/streak visuals from the design
  spec aren't built yet, currently a straightforward checklist.
- Workouts tab shows last-session dates but not full set/rep logging UI
  yet (data model already supports it — `workouts` table unchanged from
  V1).
- Public Tools (the 5 no-login tools) aren't ported into V2 yet — they
  still work as-is if you keep the V1 `index.html` reachable, or can be
  rebuilt as a second Vite entry point in a follow-up pass.
- Kawaii decorative layer is only lightly applied (EmptyState icons) —
  celebration animations and streak visuals from Phase 3 aren't built.
