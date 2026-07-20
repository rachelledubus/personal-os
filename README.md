# Rachelle's System — Personal & Business Operating System

A single-page web app (`index.html`) backed by Supabase, combining a personal
life-management dashboard with a real-estate business operating system.

## What it does today

**Personal**
- Dashboard (today's top 3 priorities, quick-capture inbox, morning/evening routine, motivational quote)
- Tasks (categorized, prioritized, due dates)
- Habits (daily checklist, resets each day)
- Nutrition (food database, meal log, daily macro targets/progress, Build Your Own Meal, automated grocery list)
- Workouts (3-day lifting split, logs sets/reps, shows your last session per exercise)
- Chores (daily/weekly/monthly checklists)
- Finances (bills, income & expenses, debt payoff, savings goals — split by Personal/Business)
- Appointments (upcoming list + "today" surfaced on Home)
- Notes (quick freeform capture)
- Weekly Reviews (wins/challenges/lessons, one per week, with history)

**Business (SW Broward real estate)**
- Contacts CRM — full relationship tracker (Lead, Future Client, Active
  Client, Past Client, Sphere, Partner, Agent Referral), modeled on the
  "System 07" CRM spreadsheet. Referral tracking lives here as a category
  + a Business KPI, not as a separate feature.
- Deal pipeline (stage tracking)
- Content checklist (daily social/content tasks) + Content Calendar (forward-looking, what/when/status)
- Reference Library (Voice Guide, CTA/Script/Prompt/Template libraries — searchable, editable)
- Business KPIs (auto-computed from contacts + pipeline, including a
  referral-relationships count)
- Public Tool Submissions review (turn a public tool visitor into a real Contact)
- Neighborhood Profiles editor (feeds the public Neighborhood Explorer)

**Public Tools** (no login required — reached via a link on the sign-in screen)
- Home Match Quiz, Future Home Planner, Neighborhood Explorer, Relocation
  Planner, and a Buyer Stage Check-in. Every tool can capture a visitor's
  name/email, which shows up in the authenticated app for you to review
  and convert into a Contact.

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
As of 2026-07-20, every planned personal and business module is built and
Supabase-backed — nothing left running on localStorage. See `TODO.md` for
the one deliberately-deferred item (Reference Library additions from the
CRM spreadsheet's Follow-Up Standards / Maintenance Checklist tabs) and
`CHANGELOG.md` for full details of what shipped and when.
