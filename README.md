# Rachelle's System — Developer Guide

## Where things stand
**Migrated to Supabase:** Nutrition (`foods`, `meal_logs`, `settings`), Tasks (`tasks`), Habits (`habits`, `habit_logs`). The Home tab's "Today" card pulls live data from all three plus the fixed weekly workout schedule.

**Still on `localStorage`** (next phase, module by module): routine checklists, chores, bills, appointments, and workout set-logging. Nothing breaks by migrating one module at a time — each just needs its own `load/render/save` functions swapped from `storageGet/storageSet` to `supabaseClient.from('table')...` calls, following the pattern in `js/nutrition.js`, `js/tasks.js`, or `js/habits.js`.

**Not built yet:** the Settings page (item 8 of the spec) — so nutrition goals and the workout schedule aren't user-editable yet. Nutrition goals default via the `settings` table (1835 kcal / 150p / 185c / 55f, editable directly in Supabase's Table Editor for now). The workout schedule is hardcoded in `js/dashboard.js` (`WEEKDAY_WORKOUT`) to match the existing Workouts tab.

## Folder structure
```
personal-os/
├── index.html          # Page shell: auth screen + app shell + all tab panels
├── css/
│   └── styles.css       # All styles — original design tokens, unchanged
├── js/
│   ├── supabase-client.js  # Creates the shared Supabase client
│   ├── auth.js              # Sign up / log in / sign out / session handling
│   ├── db.js                 # Shared helpers (todayStr, ensureSettings, etc.)
│   ├── nutrition.js           # Food database + meal log + macro totals (Supabase)
│   ├── tasks.js                # Task manager (Supabase)
│   ├── habits.js                # Habit tracker (Supabase)
│   ├── dashboard.js              # Home "Today" command center
│   └── app.js                     # Tabs, date line, and remaining localStorage features
└── schema.sql            # Run once in Supabase's SQL Editor
```

## How to add a new tab/page
1. Add a `<button class="tab-btn" data-tab="yourtab">Label</button>` inside `nav.tabs` in `index.html`.
2. Add a `<section class="panel" id="panel-yourtab">...</section>` inside `.wrap`.
3. Tab switching is automatic — `switchTab()` in `app.js` toggles `.active` based on `data-tab` matching `panel-<name>`.

## How to add a module (feature)
Keep one function group per feature in `app.js` (or split into its own `js/yourfeature.js` file and add a `<script>` tag for it in `index.html`, loaded after `supabase-client.js`). Each module should expose:
- a `load...()` — reads data (from Supabase once migrated, or localStorage for now)
- a `render...()` — draws it into the DOM
- a `save...()` / `add...()` — writes changes back

Register any new init logic (event listeners, initial render) inside `initApp()` in `app.js`, which auth.js calls once a session exists.

## How storage currently works
`storageGet(key)` / `storageSet(key, value)` in `app.js` wrap `localStorage`, storing JSON strings under fixed keys (e.g. `bills`, `appointments`, `day-log-A`). This is device-local — it won't sync across phone/PC/tablet yet. That's what the Supabase migration (next phase) replaces, table by table, using the schema below.

## How Supabase works here
- `js/supabase-client.js` creates one shared `supabaseClient` using your project URL and **anon/publishable key**. That key is meant to be public in client code — it can't bypass Row Level Security.
- `js/auth.js` handles sign up/in/out with Supabase's built-in email/password auth, and listens for `onAuthStateChange` to show either the auth screen or the app shell.
- Every table in `schema.sql` has a `user_id` column and an RLS policy scoped to `auth.uid()`, so each signed-in user only ever sees their own rows — no manual filtering needed in queries, though it's good practice to filter by `user_id` anyway for clarity.
- Typical query pattern once a module is migrated:
  ```js
  const user = getCurrentUser();
  const { data, error } = await supabaseClient
    .from('tasks')
    .select('*')
    .eq('user_id', user.id)
    .order('due_date');
  ```

## Naming conventions
- Table names: plural, snake_case (`meal_logs`, `weekly_reviews`).
- DOM ids: `kebab-case`, prefixed by feature (`bill-name`, `wk-save-btn`).
- JS functions: `camelCase`, verb-first (`loadBills`, `renderBills`, `addBill`).
- Storage keys (pre-migration): short kebab-case matching the feature (`bills`, `bills-marker`).

## How to add a new database table
1. Add the `create table if not exists ...` block to `schema.sql`, including a `user_id uuid references auth.users(id) on delete cascade`.
2. Add `alter table ... enable row level security;` and an owner-scoped policy, e.g.:
   ```sql
   create policy "yourtable: owner all" on yourtable
     for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
   ```
3. Re-run the file in the Supabase SQL Editor — `create table if not exists` and `drop policy if exists` make it safe to re-run the whole file.

## Deploying
This is a static site (no build step) — drag the `personal-os/` folder into Netlify, or connect it via GitHub. `index.html` is the entry point.
