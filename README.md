# Rachelle's System — Personal & Business Operating System

A single-page web app (`index.html`) backed by Supabase, combining a personal
life-management dashboard with a real-estate business operating system.

## What it does today

**Personal**
- Dashboard (today's top 3 priorities, quick-capture inbox, morning/evening routine)
- Tasks (categorized, prioritized, due dates)
- Habits (daily checklist, resets each day)
- Nutrition (food database, meal log, daily macro targets/progress)
- Workouts (3-day lifting split, logs sets/reps, shows your last session per exercise)
- Chores (daily/weekly/monthly checklists)
- Budget (recurring bills, paid status resets monthly)
- Appointments (upcoming list + "today" surfaced on Home)

**Business (SW Broward real estate)**
- Lead & follow-up tracker
- Deal pipeline (stage tracking)
- Content checklist (daily social/content tasks)
- Reference Library (Voice Guide, CTA/Script/Prompt/Template libraries — searchable, editable)
- Business KPIs (auto-computed from leads + pipeline)

## Tech stack
- Plain HTML/CSS/JS, no build step, no framework
- Supabase (Postgres + Auth + Row Level Security) for all persisted data
- Every table is scoped to the signed-in user via RLS — see `schema.sql`

## File map
- `index.html` — the entire app (markup, styles, and all JS modules, inlined)
- `schema.sql` — the full Supabase schema (run once in the Supabase SQL editor)
- `ARCHITECTURE.md` — how the code is organized internally
- `DATABASE.md` — table-by-table reference
- `CHANGELOG.md` — dated log of what changed and why
- `TODO.md` — known gaps and the recommended order to close them

## Status
See `TODO.md` for what's connected to the real database vs. still using
temporary browser storage, and what's the recommended next step.
