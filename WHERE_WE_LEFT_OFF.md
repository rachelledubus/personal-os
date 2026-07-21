# Where We're Leaving Off

*Last updated: end of the AuDHD Executive Function sprint, delivered as the first complete-ZIP-only milestone per the new delivery process.*

**Delivery process changed this session:** individual file replacements are done. From here forward, complete ZIP snapshots at milestone completion, validated (imports resolve, routes registered, no orphans, migrations chronological) before packaging.

---

## What this project is

A personal + business operating system for Rachelle, a Southwest Broward real estate agent. React + Vite, Supabase, Netlify, AI via Google Gemini through Netlify functions.

## This session: AuDHD Executive Function audit + implementation

Audited the whole app through the lens of "what still requires remembering, deciding, initiating, transitioning, or noticing problems before they're urgent." Built the 5 highest-leverage gaps, all reusing existing architecture — nothing duplicated.

**1. Transition support (Area 3).** Life Rhythm's existing containers (Morning Routine, Shutdown, Evening Routine) now carry real step checklists instead of just a title. Steps are per-template (edit once, applies to every future occurrence), completion is per-day (yesterday's checks don't carry over). Seeded with reasonable defaults, editable inline from Today.

**2. Hyperfocus awareness (Area 4).** No timer, no new tracking. A work block that ended 30+ minutes ago, isn't marked done, and still has open tasks triggers a small supportive banner — "You've been deep in X, it was set to wrap up at Y, totally fine to keep going." Reuses the block's own `end_time`.

**3. Smart Chores (Area 5).** Real starter seed for a 2BR/2BA townhouse rental with heavy-shedding dogs (not a generic template) across daily/weekly/monthly. Weekly/monthly lists now sort most-overdue-first using actual last-completion dates instead of a flat unordered list.

**4. Relationship Memory (Area 6).** The Inbox's Opportunity action now offers "attach to an existing contact" — search by name, pick the match, the captured note appends to their relationship_notes (dated) and sets a 7-day follow-up automatically. "Jessica mentioned coffee" now actually attaches to Jessica instead of only ever creating a new contact.

**5. Neglected Priorities (Area 1/2).** New Today-page panel that looks across goals (21+ days no update), Tier-1 relationships (45+ days no contact), habits (zero check-ins this week), and maintenance (7+ days overdue) simultaneously — nothing else in the app looked across all four at once. Pure computed queries, no new AI call, capped at 5 so it stays a glance.

**Two nearly-free wins folded in:** goal progress bars (data already existed, just wasn't visualized), and confirmed the Tuesday/Thursday gym arrival-time detail from the latest vision doc was already seeded correctly from an earlier session.

**Explicitly not built, with reasoning:** true device push notifications (Area 8) — needs a service worker, push subscription backend, VAPID keys, genuinely a separate project. Area 9 (system-building balance nudge) — designed but not implemented this pass, time-boxed out; the data to power it (dev_log entries vs. tasks completed) already exists in Control Center if it's wanted next.

## Validation performed before packaging (per the new process)

- Every relative import checked programmatically — found and fixed one real bug (`ControlCenterPage.jsx` had import paths one directory level too shallow, would have failed to build).
- Found and restored 5 files that existed only in the original project source and were missing from this session's rebuilt package (`flows.js`, `preferences.js`, `prompts.js`, plus 3 pre-conversation migrations: `v2_foundation_layer.sql`, `v2_meal_planner.sql`, `v2_missions_layer.sql`). All 5 are now confirmed present.
- All 8 page routes confirmed registered in `App.jsx`, including `/plan/meals` → `MealPlannerPage`.
- All 5 Netlify functions confirmed present.
- 15 migrations confirmed present, chronological.
- **What I did not do:** an actual `npm run build`. No build environment is attached to this conversation. Import resolution and route registration were checked directly; a real build is still the first thing to run after extracting this ZIP.

## Core architectural decisions (unchanged)

Same as every prior handoff — Life Rhythm/Tasks/routines stay separate; CRM is the one source of truth with tiers as a filter; Content Engine is real, `content_items` is legacy; every migration additive; every AI call degrades gracefully; not every "category" is safely user-editable.

## Recommended next priorities

1. Area 9 (system-building balance nudge) if wanted — straightforward, data already exists.
2. A real `npm run build` / lint pass — this project has never had one run against it in this environment.
3. If Area 8 (real notifications) becomes a priority, it's a dedicated milestone on its own — service worker + push backend + VAPID setup, not a corner to cut into a grouped sprint.

## Practical notes

- Extract the ZIP, it drops in as `rachelles-system-v2/` matching your repo structure exactly.
- Run the newest migration: `v2_executive_function_layer.sql`.
- Two env vars: `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` (client), `GOOGLE_AI_API_KEY` (server-only).
- Deploy verification: push → Netlify build log green → spot-check preview → merge to `main`.

---

## Bug-fix pass (immediately after the Executive Function ZIP)

Real bugs reported and status:

1. **Chibi graphics not displaying — FIXED, root cause confirmed.** The `<svg>` elements inside `ChibiAccent` never had explicit width/height; only their wrapper `<div>` was sized. Browsers default an unsized SVG to 300x150, so they were rendering at the wrong size relative to their container instead of the intended small corner accent. Added `.chibi-accent svg { width: 100%; height: 100%; }`.
2. **Floaty smiley face by the capture button — REMOVED, by request.** That was the "companion sprite" — a decorative gold blob with a face, added alongside the capture button in an earlier session. Reverted `GlobalCapture` back to a plain `+` icon, no face, no companion. Also confirmed: this was likely what read as "chibi graphics" too, since it's gold/orange and floats — worth checking after this fix whether real chibi accents (cat/sprout/cloud/book/coin/paw on Business/Grow/Plan/Library cards) are now visible now that #1 is fixed.
3. **Today's Schedule not showing — hardened, most likely cause identified, not 100% confirmed.** Added real error handling: if this happens again, the page will now show *why* instead of staying silently blank. Most likely cause: `v2_executive_function_layer.sql` (adds `steps` to `life_rhythm_blocks`, which `getTodaySchedule()` now selects) hasn't been run yet — if that column doesn't exist, the whole schedule query fails. **Needs confirmation this migration was actually applied in Supabase.**
4. **"Might be worth a look" box not displaying correctly — hardened, not diagnosed.** Same error-visibility treatment added. This one I genuinely don't have enough information to fix blindly — "isn't displaying correctly" could mean empty, broken layout, or an error. The next report on this should include what it actually looks like (empty box? overlapping text? something else?).

---

## Kawaii direction correction

Real feedback from reference screenshots: the corner `ChibiAccent` icons were the wrong idea entirely — too small, too literal, nothing like the illustrated banner aesthetic in real Studio Ghibli/kawaii Notion templates.

**What changed:**
- New `Banner` component — full-width illustrated scene at the top of Today, Business, Grow, Plan, and Library. Each has a themed default SVG scene (sunrise cottage, path & signpost, garden rows, winding hill path, reading nook) that renders when no custom image is assigned — richer and more whimsical than corner doodles, and it's the thing actually carrying the aesthetic now.
- Real artwork support: Control Center → Appearance → **Banners** category lets you paste an image URL (landscape, ~1600×440px) to override any default scene with real sourced art — e.g. from the Notion template/asset packs in the reference images.
- **All corner `ChibiAccent` placements removed** from Business, Grow, Plan, and Library — a banner plus clean cards reads more cohesive than a banner plus six competing doodles. The `ChibiAccent` component itself wasn't deleted (still valid, still available) — just pulled back to unused for now.
- **Found and fixed a dead feature while touching this:** `profile_avatar` and the old mascot slots were assignable in Control Center but nothing ever read them back — `getAssetUrl()` was defined and never called anywhere. Wired `profile_avatar` into SideNav for real; the old single-purpose mascot slots were folded into the new banner system since banners now do that job.

**Explicit boundary, stated once and holding:** I build with SVG + CSS, not image generation, and deliberately did not attempt to generate "Studio Ghibli style" art even stylistically — mimicking a specific studio's distinctive visual style is exactly what the original project brief said not to do. The default scenes take inspiration from the *feeling* (cottage-core, soft gradients, cozy) without copying any specific studio's character design or composition.

---

## Dead-file cleanup

Ran a real orphan-reference check across every JS/JSX file. Deleted (all confirmed zero references before removal):
- `ChibiAccent.jsx` + `.css` — no longer used anywhere since corner decorations were replaced by zone banners.
- `preferences.js` — a generic `user_preferences` wrapper, fully superseded by `settings.js`.
- `futureRoadmap.js` — **worth remembering this one specifically**: real working code for the business "Future Roadmap Log" (System 00D's idea parking lot per Decision Rule 4), but no UI was ever built to use it. Deleted as dead code per request, but if that feature is wanted later, the `future_roadmap_ideas` table still exists in the database — only the service file and a UI page would need rebuilding.
- `INTEGRATION_GUIDE.md`, `PHASE_2_IMPLEMENTATION_GUIDE.md` — described migration steps completed many sessions ago, fully superseded by this document.

Re-ran the full import validation after deleting — nothing broke.

---

## Build warning, missing Inbox header, and the running chibi

**Vite build warning (settings.js mixed import)** — fixed at the source. `contacts.js` and `contentEngine.js` were dynamically importing `settings.js` inside a function while every other file imported it statically at the top — Vite couldn't code-split it either way, hence the warning. Converted both to static imports; the warning is gone, no behavior change (settings.js was never actually going to be a separate chunk regardless).

**Inbox "missing a header"** — real diagnosis: Inbox always had its text title, but it was the only main-zone page without a banner once Today/Business/Grow/Plan/Library all got one. Added a 6th banner scene (`CatchBasket` — a basket catching falling notes, fitting the capture theme) and wired it in.

**Running chibi** — new `RunningChibi` component, four selectable animals (bunny, cat, fox, duck) sharing one animation framework: continuous run-in-place (bob + alternating legs + motion trail), and a CSS breakpoint reposition (top-right → smaller top-right → bottom-left near mobile width) that the browser animates automatically via `transition: top/left`, since both breakpoints are expressed as `top`+`left` rather than mixing in `right`/`bottom`. No JS resize listener needed. Picker lives in Control Center → Appearance, with a live animated preview of each option, gated behind the existing `show_decorations` flag.

**Not addressed, intentionally:** the "chunks larger than 500kB" note is a separate, informational Vite warning about overall bundle size — real code-splitting (route-based `React.lazy`) would address it but wasn't part of what was asked this round. Flagging it as a future backlog item rather than doing unscoped work.

---

## Backlog sprint: meals in Today, drag-and-drop

**Meals in Today** — new Mission Engine fetcher (`fetchMealMissions`) reads today's planned meals (`meal_plan_items` where `plan_date = today`), one mission per meal type present (breakfast/lunch/dinner/snacks), title shows the actual planned foods. Checking it off marks every food item for that meal/day eaten together (new `eaten` column). If nothing's planned for today, nothing shows — no nagging to plan a meal that isn't there.

**Schedule drag-and-drop** — real find: `moveTaskToBlock()` already existed in `dailyExecution.js`, built in an earlier session with a comment literally anticipating "the same function manual drag would use" — it just never had a drag UI. Wired native HTML5 drag-and-drop (no new dependency) onto task rows; dragging a task into a different block's drop zone calls that existing function, with optimistic UI update so it moves instantly rather than waiting on the round-trip. Bonus: moving a task this way also logs as an "edited" AI decision, feeding the same learning-signal system energy-aware planning already reads from.

**Backlog drag-and-drop reordering** — added `sort_order` to `product_backlog_ideas` (didn't exist before), backfilled from creation order. Drag any idea within its category card to reorder; new ideas append to the end rather than jumping to the top.

**Scope note on "drag and drop where it makes sense":** picked these two spots specifically — rearranging your actual day, and prioritizing your own backlog — as the highest-value, lowest-risk fits. Didn't add it everywhere (Roadmap sub-tasks, Pipeline stage-dragging, etc. are plausible future candidates, not done here) since "everywhere" wasn't asked for and would be a much bigger, less-considered pass.
