# Integration Guide — Getting V2 (+ everything built since) Live

This walks you from **what's currently live** (the old single-`index.html`
V1 app) to **everything that exists now**: the V2 React/Vite rebuild, Life
Rhythm, Capture Inbox, Projects, Personal Maintenance, and the
Intelligence layer (Fitness Analytics, Energy-Aware Planning, AI Operator).

Follow it top to bottom, in order. Nothing here is optional-but-skippable
except where marked **(optional)**.

---

## 0. Before you touch anything

- [ ] In Supabase: **Database → Backups**, confirm you have a recent
      automatic backup (or trigger a manual one if your plan allows it).
      Every migration below is additive and designed not to touch existing
      rows, but back up anyway — free insurance.
- [ ] In GitHub: create a new branch (`v2-integration` or similar) rather
      than committing straight to `main`. If anything goes sideways, `main`
      still deploys the working V1 site the whole time.
- [ ] Know where your Supabase URL and anon key currently live (they're
      probably hardcoded in the V1 `index.html` right now) — you'll need
      them again in step 3.

---

## 1. Replace the repo structure

Your repo currently holds the V1 flat files (one big `index.html` plus
whatever else). The V2 app is a proper Vite + React project with a real
folder structure. On your new branch:

- [ ] **Delete** the old V1 files from the repo root — `index.html` (the
      old one), and any old flat `.js`/`.css` files that aren't part of
      the V2 structure below. *(Don't delete them from your local machine
      — just move them out of the repo, see step 8 on what to do with
      V1.)*
- [ ] **Add** the V2 folder structure. Everything below either already
      existed in your V2 scaffold, or was added across the three build
      phases (Life Rhythm → Capture/Projects/Maintenance → Intelligence).
      This is the complete, current tree:

```
├── index.html                      (V2's — Vite entry point, NOT the V1 one)
├── package.json
├── vite.config.js
├── netlify.toml
├── netlify/
│   └── functions/
│       ├── classify-capture.js
│       └── ai-replan.js
├── migrations/
│   ├── (your pre-V2 migrations — contacts, grocery, finance, etc.)
│   ├── v2_meal_planner.sql
│   ├── v2_foundation_layer.sql
│   ├── v2_missions_layer.sql
│   ├── v2_life_rhythm_layer.sql
│   ├── v2_capture_and_maintenance_layer.sql
│   └── v2_intelligence_layer.sql
└── src/
    ├── main.jsx
    ├── App.jsx
    ├── global.css
    ├── tokens.css
    ├── lib/
    │   └── supabaseClient.js
    ├── context/
    │   └── AuthContext.jsx
    ├── utils/
    │   ├── date.js
    │   └── macros.js
    ├── services/
    │   ├── contacts.js
    │   ├── flows.js
    │   ├── goals.js
    │   ├── missions.js
    │   ├── preferences.js
    │   ├── prompts.js
    │   ├── timeBlocks.js
    │   ├── lifeRhythm.js
    │   ├── dailyExecution.js
    │   ├── capture.js
    │   ├── maintenance.js
    │   ├── workoutAnalytics.js
    │   ├── energyIntelligence.js
    │   └── aiOperator.js
    ├── components/
    │   ├── ui/
    │   │   ├── Card.jsx / .css
    │   │   ├── Button.jsx / .css
    │   │   ├── Checkbox.jsx / .css
    │   │   ├── EmptyState.jsx / .css
    │   │   ├── Modal.jsx / .css
    │   │   └── ProgressBar.jsx / .css
    │   ├── nav/
    │   │   └── SideNav.jsx / .css
    │   ├── mission/
    │   │   ├── MissionList.jsx / .css
    │   │   └── MissionCard.jsx / .css
    │   ├── schedule/
    │   │   ├── ScheduleView.jsx
    │   │   └── ScheduleBlock.jsx / .css
    │   ├── capture/
    │   │   └── GlobalCapture.jsx / .css
    │   └── intelligence/
    │       ├── EnergyCheckIn.jsx / .css
    │       └── AskAIPanel.jsx / .css
    └── pages/
        ├── AuthScreen.jsx
        ├── Today/
        │   ├── TodayPage.jsx / .css
        │   ├── FocusMode.jsx / .css
        │   └── ResearchMode.jsx
        ├── Plan/
        │   ├── PlannerPage.jsx
        │   ├── ProjectsTab.jsx
        │   ├── MealPlannerPage.jsx / .css
        │   └── WeeklyResetModal.jsx
        ├── Grow/
        │   └── GrowPage.jsx
        ├── Business/
        │   ├── BusinessPage.jsx
        │   └── GuidedFlow.jsx
        ├── Library/
        │   └── LibraryPage.jsx
        └── Inbox/
            └── InboxPage.jsx / .css
```

**What to actually do:** files with no note above are unchanged from your
V2 scaffold — copy them in as-is if you haven't already. Files listed in
the three build phases (`lifeRhythm.js`, `dailyExecution.js`, `capture.js`,
`maintenance.js`, `workoutAnalytics.js`, `energyIntelligence.js`,
`aiOperator.js`, everything in `components/schedule/`, `components/capture/`,
`components/intelligence/`, `pages/Inbox/`, plus the edited versions of
`App.jsx`, `SideNav.jsx`, `TodayPage.jsx`, `PlannerPage.jsx`, `GrowPage.jsx`,
`LibraryPage.jsx`, `missions.js`, `netlify.toml`) are the ones delivered
across our conversation — use those exact versions, they supersede
anything earlier.

---

## 2. Install dependencies

```bash
npm install
```

If `package.json` doesn't already list `react-router-dom` and
`@supabase/supabase-js`, add them:

```bash
npm install react-router-dom @supabase/supabase-js
```

---

## 3. Environment variables

Two separate places need env vars — don't mix them up, one is
public-safe and one must never reach the browser.

### 3a. Netlify (client-safe — these ship to the browser)
Site settings → Environment variables:

| Key | Value |
|---|---|
| `VITE_SUPABASE_URL` | your Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | your Supabase anon/public key |

### 3b. Netlify (server-only — powers the two serverless functions)

| Key | Value |
|---|---|
| `GOOGLE_AI_API_KEY` | your Google AI (Gemini) API key — free, no credit card, from [aistudio.google.com/apikey](https://aistudio.google.com/apikey) |

- [ ] **(optional)** Skip `GOOGLE_AI_API_KEY` for now if you're not ready
      to set it up — the Capture Inbox's "✨ Suggest" button and
      the Today page's "Ask AI to adjust today" panel both fail
      gracefully and say so in the UI. Everything else works with zero
      change.
- [ ] Both functions use **Gemini 2.5 Flash** — the current free-tier
      model as of mid-2026 (10 requests/min, 250/day, plenty for
      personal use). If Google changes free-tier model names again
      later, update the `MODEL` constant at the top of both
      `netlify/functions/classify-capture.js` and
      `netlify/functions/ai-replan.js` — nothing else needs to change.

### 3c. Local dev
Create `.env.local` in the repo root (gitignored) with the same
`VITE_`-prefixed values as 3a, so `npm run dev` works locally.

---

## 4. Run the database migrations — in this exact order

Supabase dashboard → SQL Editor → New query → paste → Run. One at a time,
top to bottom. Each is safe to run even if some of its tables already
exist (`create table if not exists`), so if you're not sure whether an
early one already ran, running it again won't break anything.

1. [ ] Your original pre-V2 migrations (contacts, grocery, finance,
   remaining_features, reference_library_category, bos_completion — from
   the old `TODO.md`). **Skip any you already ran** when V2 was first
   scaffolded.
2. [ ] `v2_meal_planner.sql`
3. [ ] `v2_foundation_layer.sql`
4. [ ] `v2_missions_layer.sql`
5. [ ] `v2_life_rhythm_layer.sql`
6. [ ] `v2_capture_and_maintenance_layer.sql`
7. [ ] `v2_intelligence_layer.sql`

If you genuinely don't know which of #1–4 already ran: open Supabase's
Table Editor and check for `goals`, `projects`, `time_blocks`, and
`custom_missions`. If those four exist, #1–4 are done — start at #5.

---

## 5. Netlify build config

Confirm `netlify.toml` at the repo root matches this (it declares the
functions directory, which is new — without this line the two AI
functions 404):

```toml
[build]
  command = "npm run build"
  publish = "dist"
  functions = "netlify/functions"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

---

## 6. Push and deploy

- [ ] `git add -A && git commit -m "Integrate V2 + Life Rhythm + Capture/Projects/Maintenance + Intelligence"`
- [ ] Push the branch, open a PR (or push straight to `main` if you're
      confident) — Netlify auto-deploys on push the same way it always
      has.
- [ ] Watch the Netlify deploy log for the build. If it fails, it's
      almost always one of: a missing `VITE_` env var, or a typo'd import
      path from the folder structure in step 1.

---

## 7. Verify — walk through every layer once

Open the deployed site and check each one live, in this order (later
ones depend on earlier ones having run once):

- [ ] **Sign in works**, lands on `/today`.
- [ ] **Today page** shows a schedule with today's containers (Morning
      Routine, workout, Work Block 1/2, etc.) — this confirms the Life
      Rhythm seed ran (`seedDefaultLifeRhythmIfEmpty` fires automatically
      on first load).
- [ ] **Floating `+` button** (bottom right, every page) opens the capture
      modal — type something, save it.
- [ ] **Inbox** (left nav) shows what you just captured, unsorted.
      Resolve it to a Task.
- [ ] **Plan → Goals & Projects** tab loads (this is the tab that didn't
      exist before this integration).
- [ ] **Grow → Maintenance** tab loads; add a test reminder.
- [ ] **Grow → Workouts** tab shows the new "+ Log workout" form; log a
      test session with one exercise, confirm it appears under "Recent
      sessions."
- [ ] **Today page energy check-in row** (Low/Medium/High chips) — click
      one, confirm "Adjusting today's plan…" appears briefly.
- [ ] **Today page "Ask AI to adjust today"** — only test this after
      `GOOGLE_AI_API_KEY` is set; type a request, confirm you get a
      proposal back (not the "isn't set up yet" message).
- [ ] **Library → AI Log** tab shows entries after the above steps —
      confirms `ai_decisions` is actually being written.

If any single item fails, it's almost always a migration that didn't run
or a file that didn't make it into the right folder — check the specific
service file that feature depends on (named in this guide's file tree
above) is actually present at that path.

---

## 8. What to do with the V1 files

Don't delete your local V1 copy — keep it somewhere outside the repo (a
`v1-archive/` folder on your machine, or a `v1-archive` git branch that
never gets deployed). Two things still depend on it:

- **The 5 no-login Public Tools** were never ported into V2 (this was a
  known gap from the original scaffold, still true). If those are live
  somewhere and people use them, keep that specific page reachable — a
  separate Netlify site pointed at the V1 archive branch is the cleanest
  way to keep it alive without it interfering with the V2 deploy.
- **Rollback safety net** — until you've run through the Section 7
  checklist successfully on the live site, keep the V1 branch/deploy
  available so you can point DNS back at it in five minutes if something
  in V2 breaks in a way you don't have time to debug immediately.

Once V2 has run clean for a week or two, the V1 archive is just cold
storage — nothing in the new system reads from it.

---

## Troubleshooting

| Symptom | Likely cause |
|---|---|
| Blank page after deploy | Missing `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` in Netlify env vars |
| Today page never shows any blocks | `v2_life_rhythm_layer.sql` didn't run, or `life_rhythm_blocks` seed silently failed — check the browser console for a Supabase error on load |
| Capture button does nothing / errors | `v2_capture_and_maintenance_layer.sql` didn't run (`capture_items` table missing) |
| "✨ Suggest" / "Ask AI" always says unavailable | `GOOGLE_AI_API_KEY` not set, or `netlify.toml` is missing the `functions = "netlify/functions"` line |
| Workouts tab errors on save | `v2_intelligence_layer.sql` didn't run (`workout_exercises` table missing) |
| A task never gets assigned to a block | Check it has `completed = false` and `time_block_id = null` — if it's sitting on a *past* date's block, it needs the rollover pass (happens automatically on next Today page load) |
| 404 on `/.netlify/functions/...` | `functions = "netlify/functions"` missing from `netlify.toml`, or the function file isn't actually in that folder |

---

That's the whole path from where you are to where everything we've built
actually runs. Once Section 7 is fully checked off, you're live.
