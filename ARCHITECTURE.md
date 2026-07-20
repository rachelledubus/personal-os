# Architecture

## Big picture

`index.html` is a single file containing markup, CSS, and JS. The JS is
organized into clearly-commented "modules" (each headed by a
`/* ---- js/xyz.js ---- */` comment) — a holdover naming convention from an
earlier multi-file version, kept because it makes the file easy to navigate
with search/find. Treat each commented block as its own module even though
it currently lives in one file.

## Data flow pattern (used consistently across every feature)

Every feature module follows the same shape:

1. **Load function(s)** — `async function loadX()` — queries Supabase,
   scoped to the current user via `.eq('user_id', user.id)` (belt-and-suspenders
   alongside RLS), returns an array or object.
2. **Write function(s)** — `addXRow()`, `updateXRow()`, `deleteXRow()`,
   `toggleXRow()` — each a thin wrapper around one Supabase call.
3. **Render function** — `async function renderX()` — calls the load
   function, rebuilds the relevant DOM container from scratch
   (`container.innerHTML = ...` then `appendChild` per row), and wires up
   event listeners per row (checkbox toggle, delete button, etc).
4. **Init function** — `async function initXModule()` — wires up the
   "add new" form controls once, then calls the render function.

Init functions are called once from `initApp(user)` in `js/app.js`, which
runs after a Supabase auth session is confirmed (see `js/auth.js`).

Following this same pattern for new features (rather than inventing a new
shape each time) is what keeps the codebase maintainable — copy the nearest
similar module (e.g. `habits.js` or `leads.js`) as your starting point.

## Two data layers currently coexist — see TODO.md

Most modules are fully migrated to Supabase. A handful of older ones
(Routine, Quick Capture inbox, Chores, Today's Priorities) still use a
generic `localStorage`-backed helper (`createChecklist()` /
`storageGet`/`storageSet` in `js/app.js`). This is called out explicitly in
`TODO.md` — it's not hidden debt, it's tracked debt, and the plan for
closing it is documented there.

## "Today" summary (Home tab)

`js/dashboard.js`'s `renderTodaySummary()` pulls a snapshot from several
modules (nutrition totals, habit completion, lead follow-ups due, today's
fixed workout by weekday) into the Home tab's top card. Any module that
changes user data relevant to "today" should call
`window.refreshTodaySummary()` after writing, so the Home card stays in
sync — follow the existing call sites as examples.

## Reference Library seeding

`reference_library` is seeded client-side, once per user, from the
`SEED_LIBRARY` constant in `js/reference-library.js` the first time that
user opens the Business tab (`seedReferenceLibraryIfEmpty()`). This keeps
every user's copy independently editable rather than sharing one static
global table. If the seed content itself needs updating in the future,
editing `SEED_LIBRARY` only affects *new* users — existing users' rows
must be updated via a migration if they need the same change retroactively.

## Adding a new feature — checklist

1. Does a table already exist in `schema.sql` for this data? If yes, reuse
   it. If not, write the migration (see `DATABASE.md`) before touching the UI.
2. Copy the nearest existing module's load/write/render/init shape.
3. Add the HTML container(s) inside the relevant `<section class="panel">`,
   reusing existing CSS classes (`.card`, `.task-row`, `.add-row`, etc.) —
   don't introduce new classes unless the existing vocabulary genuinely
   doesn't fit.
4. Wire the init function into `initApp()`.
5. Update `DATABASE.md`, `CHANGELOG.md`, and `TODO.md`.
