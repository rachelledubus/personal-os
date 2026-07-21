# Where We're Leaving Off

*Last updated: end of the Control Center follow-up phase (Roadmap/Backlog category wiring, real auto-changelog, real AI autonomy behavior, expanded kawaii pass).*

**How to use this:** paste into a new AI conversation to resume with context. The more current source going forward is Control Center -> Development Memory -> Handoff -> Generate, built from live data.

---

## What this project is

A personal + business operating system for Rachelle, a Southwest Broward real estate agent. React + Vite, Supabase, Netlify, AI via Google Gemini through Netlify functions.

## This session: closing the Control Center gaps

All 4 items from the prior handoff's "recommended next priorities" are done, plus a real kawaii expansion.

**1. Roadmap phases + Backlog categories wired in** — same live-load pattern already proven on Pipeline/Finance. Change a phase name in Control Center -> Categories, it's live in Business -> Roadmap. Backlog category field is now a free-text input backed by a `<datalist>` of managed suggestions (stays free-text on purpose — a one-off category should never be blocked).

**2. Auto-changelog is real now, not partial.** `setCategoryList`, `setFeatureFlag`, `setCustomAiInstructions`, `setAssetSlot`, and `setAutonomyLevel` all write a `dev_log` entry automatically as part of the save itself — not a separate step anyone has to remember. Code-level changes (from a Claude session) still get logged by convention at the end of a session; that part was never going to be automatic, no way for running client software to see a Claude edit.

**3. Asset images: confirmed staying URL-based.** No file upload built, by direct decision — the existing system already does the real job (swap a graphic without code) at zero infrastructure cost.

**4. AI autonomy now does something real, both places:**
- **Pipeline/Dashboard follow-ups:** in "auto" mode, overdue contacts' AI drafts generate themselves on page load — no "✨ Draft" click needed. In "confirm" mode (default), nothing changed, still a manual click.
- **Content repurposing:** in "auto" mode, all 5 repurposed formats auto-mark as "published" the moment they're drafted. In "confirm" mode, each format now has a real "Mark published" button (this was a genuine gap before — `markRepurposed()` existed in the service layer but nothing in the UI ever called it).

**5. Kawaii, actually expanded this time.** New ChibiAccent variants (book, coin, pawprint — on top of cat/sprout/cloud), a gentle sway animation on every chibi everywhere (not just new ones — the whole component got it), and real placement in the tabs that had zero decoration before: Business -> Relationships, Clients, Library, Roadmap; Grow -> Habits, Workouts, Finance; Plan -> Time Blocks; Library -> Documents, Backlog.

## Core architectural decisions (unchanged)

Same as last handoff — Life Rhythm/Tasks/routines stay separate; CRM is the one source of truth with tiers as a filter; Content Engine (`content_pieces`) is real, `content_items` is legacy; every migration additive; every AI call degrades gracefully; not every "category" is safely user-editable (constrained vocabularies stay code-only).

## Known gaps, honestly

- **Renaming a Roadmap phase in Control Center doesn't retroactively update existing `roadmap_items.phase` values.** The list changes; already-created items keep their old phase string until edited individually. Same caveat applies to any category rename anywhere — changing the list is instant, updating past records isn't automatic.
- **Auto-mode follow-up drafting has no rate limiting.** If there are many overdue contacts, "auto" fires one Gemini call per contact simultaneously on every Dashboard load. Fine at personal-app volume; would need throttling if the overdue list ever gets large.
- **No automated test suite still.** Every verification remains manual (Netlify build log + visual spot-check).

## Recommended next priorities

1. If the overdue list ever grows large, add a cap (e.g. only auto-draft the first 5) to the auto-mode Dashboard behavior.
2. Consider whether Roadmap phase renames should prompt "update existing items to match?" — a real but not urgent UX gap.
3. Content/Grocery/other remaining hardcoded dropdowns not yet audited for Control Center wiring, if more turn up.

## Practical notes

- No new migration this session — everything reused tables from `v2_control_center_layer.sql` and `user_preferences`.
- Two env vars: `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` (client), `GOOGLE_AI_API_KEY` (server-only).
- Deploy verification: push -> Netlify build log green -> spot-check preview -> merge to `main`.
- The person building this is non-technical by their own description — plain language, one step at a time, exact file paths, always.
