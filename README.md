# Rachelle's System — V2.1

This is your existing V2 app (React + Vite + Supabase) with three additions:
a productivity timer system, a mobile usability pass, and a companion
character engine. Nothing existing was rewritten — see "What changed"
below for the exact diff in plain language.

## Setup

1. **Replace your repo contents with this folder** (or push as a new branch).
2. **Migrations**: if you're already running V2, you're fully caught up —
   **no new migration is required for this update.** The timer system and
   companion both write to tables that already exist (`activity_log`,
   `user_preferences`) rather than adding new ones.
   - If you're setting this up fresh, run the three files in `migrations/`
     in order (`v2_foundation_layer.sql`, `v2_missions_layer.sql`,
     `v2_meal_planner.sql`), plus whatever V1 migrations your project
     already needed (contacts, grocery, finance, etc. — see old TODO.md).
3. **Environment variables** — in Netlify: Site settings → Environment
   variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. **Netlify build settings** — already configured via `netlify.toml`
   (`npm run build`, publish `dist`). Nothing to set manually.
5. Push to GitHub → Netlify builds and deploys automatically.

Local dev: `npm install`, then `npm run dev`.

## What changed

### 1. Productivity Timer System
- `src/services/timer.js` — presets (Pomodoro, Deep Work, Short Focus,
  custom), session logging, today/weekly stats. Uses `activity_log` for
  history and `user_preferences` for custom presets — no new tables.
- `src/context/TimerContext.jsx` — the timer now lives at the app level,
  so it **keeps running across navigation**. Previously, Focus Mode and
  Research Mode each had their own local stopwatch that reset the moment
  you left the page.
- `src/components/timer/TimerWidget.jsx` — the reusable picker + controls
  (Start/Pause/Resume/Reset/Skip, presets, custom duration).
- `src/components/timer/MiniTimerBar.jsx` — a small floating bar that
  shows a running timer from anywhere in the app, with pause/stop.
- `FocusMode.jsx` and `ResearchMode.jsx` now both use the shared timer
  instead of their own duplicate implementations.
- `TodayPage.jsx` gained a small "Focus this week" card (today's total +
  a 7-day bar trend), computed live from `activity_log`.

### 2. Mobile Usability Pass
Targeted fixes, not a redesign — same palette, spacing scale, and layout
shapes throughout. Specific changes:
- Every interactive control (buttons, checkboxes, the mission dismiss ×,
  nav links, remove buttons) now has a real ≥44px touch target — several
  were previously ~26–34px.
- All text inputs are 16px minimum, app-wide — smaller sizes trigger an
  unwanted auto-zoom on focus in iOS Safari.
- `PlannerPage`'s add-block form was a single wrapping row of 5 inputs;
  it's now a responsive grid that stacks cleanly on narrow screens.
- `MealPlannerPage`'s macro grid drops to one column below 480px; the
  action buttons stack full-width instead of squeezing side by side.
- Bottom nav and floating elements (mini timer bar, companion) respect
  `env(safe-area-inset-bottom)` for phones with a home-indicator bar.
- Modal bottom padding accounts for the safe area too.

### 3. Companion Engine
- `src/components/companion/` — a full position + animation engine:
  idle breathing, probabilistic blinking, and a "run" transition that
  plays whenever the companion repositions itself for a new breakpoint
  (desktop top-right → tablet → mobile bottom-right, minimizable).
- **Important**: no illustration tool is available in this build
  environment, so the visual layer is currently a placeholder (a
  layered, CSS-animated SVG fox) — the *engine* is real and finished,
  the *art* is a stand-in. See `public/companion/README.txt` for exactly
  how to drop in your real sprite sheet: it's a one-file swap
  (`companion.config.js`), nothing else changes.

### 4. Small feature-audit addition
- Habit streaks (`GrowPage.jsx`) — computed from your existing
  `habit_logs` history, no schema change. This was already flagged as a
  known gap in the prior README.

## Deliberately not built (with reasons)
- A dedicated Quick Capture/Inbox screen — `LibraryPage`'s Notes tab
  already covers this; duplicating it as a second entry point would be
  the "feature bloat" you asked me to avoid.
- Daily Startup/Shutdown workflows and a full Weekly Review system —
  `WeeklyResetModal` + `prompt_log` already do this (Monday reset,
  Friday close-out, monthly snapshot). Adding parallel new flows would
  duplicate an existing system rather than improve it.
- Energy-based planning and task batching — these need real usage data
  (what kinds of tasks, what energy patterns) to be useful rather than
  decorative; better to revisit once the timer/activity data has a few
  weeks of signal in it.

## Cleanup steps
None required — this is a straight replace of your existing V2 source,
same repo structure, same build process.
