# Phase 2 — Business OS Foundation: Relationship Tracking

## What "Phase 2" turned out to mean
Checked both roadmaps that use that name. Rachelle's actual business plan (System 11) has its own Phase 2 — but her own docs say that shouldn't be planned until the Week 13 review (mid-October), based on what actually works. We're in Week 1. Building that now would jump her own process.

The *technical* Phase 2 — "Business OS Foundation" — was the legitimate one to work on. Audited all 5 of its building blocks against the real app:
- Contact System ✅ already built
- Follow-up System ✅ already built
- Business Tasks ✅ already built
- Weekly Scorecard ✅ already built
- **Relationship Tracking ⚠️ the one real gap** — flattened into a single growing text field, not a real structured history

## Setup — run this migration
`migrations/v2_relationship_tracking_layer.sql` — safe to run once or multiple times. Creates the `interactions` table and automatically backfills existing `relationship_notes` into it as one "legacy" entry per contact, so no history is lost.

## What changed
- **New `interactions` table** — real rows (type: call/text/email/meeting/note, notes, date) instead of one flat text blob per contact.
- **New `interactions.js` service** — `addInteraction()` is the one real entry point going forward. It writes the structured row *and* keeps `relationship_notes`/`last_contact_date` in sync automatically, so nothing already reading those fields (AI follow-up drafts, etc.) needed to change.
- **New relationship timeline UI** — expand any contact in Business → Pipeline, you'll now see its full logged history with a "+ Log interaction" button, instead of nothing.
- **Fixed a real data-loss bug** — the Consultation flow used to *overwrite* `relationship_notes` completely every time you ran it on the same contact. Running two consultations back to back silently destroyed the first one's notes. Now each consultation logs as its own "meeting" entry — nothing gets lost anymore.
- **Consistency fix** — the Inbox's "attach note to existing contact" flow now goes through the same system instead of hand-rolling its own note-append logic.

## Testing checklist
- [ ] Business → Pipeline: expand a contact, confirm you see their history (including a "legacy" entry if they had old notes)
- [ ] Log a new interaction (pick a type, add a note) — confirm it appears immediately and persists on refresh
- [ ] Run a Consultation flow on a contact twice — confirm both show up as separate entries, neither overwrites the other
- [ ] Inbox → capture an Opportunity note, attach to an existing contact — confirm it shows up in that contact's timeline
- [ ] Delete an interaction — confirm it's actually gone on refresh

## Known limitations
- Timeline only added to the Pipeline tab's expanded view, not yet to the Relationships tab (same contacts, just not surfaced there too — small follow-up if wanted)
- No interaction editing yet, only add/delete
