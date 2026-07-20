# TODO / Roadmap

Ordered by recommended priority, not by category. "Done" items are here for
context on how recently they closed, not because they need action.

## ✅ Completed (2026-07-20 — full day's work, now fully closed out)
- Migrate Workouts, Appointments, Bills from localStorage → Supabase
- Build full Contacts CRM from uploaded spreadsheet (replaces Leads tracker,
  covers referral tracking)
- Header: year added, time-of-day greeting
- Motivational quote widget (Home)
- Build Your Own Meal (Nutrition)
- Automated Grocery List (Nutrition)
- Expanded Budget → Finances tab: income tracking, debt payoff, savings
  goals, personal/business split, recurring vs. one-time
- Migrate Today's Priorities, Quick Capture inbox, Routine, and Chores off
  localStorage → Supabase
- Notes tab (new)
- Weekly Reviews tab (new)
- Content Calendar in the Business tab (new)
- Public Tools: Home Match Quiz, Future Home Planner, Neighborhood
  Explorer, Relocation Planner, Buyer Stage Check-in
- Public Tool Submissions review + "Add as contact" flow
- Neighborhood Profiles editor feeding the public Explorer
- UI polish: nav tab icons, section dividers on the Business tab, grouped
  the Contacts add-form — no color changes
- Reference Library: added CRM Reference category + the spreadsheet's
  Follow-Up Standards and Maintenance Checklist content — **this closes
  out the last deliberately-deferred item from the original roadmap**

**Action required from you — run these in the Supabase SQL Editor (any
order), if you haven't already:**
1. `contacts_migration.sql`
2. `grocery_migration.sql`
3. `finance_migration.sql`
4. `remaining_features_migration.sql`
5. `reference_library_category_migration.sql`

## 🔜 Recommended next (nothing urgent — everything planned is built)
1. **Fill in Neighborhood Profiles** — Business tab → "Neighborhood
   Profiles" card. The public Neighborhood Explorer will show blank fields
   until you add real price ranges, vibe, commute, and school notes for
   Cooper City, Pembroke Pines, and Plantation. Content, not code.
2. **Custom domain / branding for Public Tools** — right now the public
   tools live at `yourapp.../#public`. If you want a cleaner link to hand
   out (e.g. on a business card or Instagram bio), that's a hosting/DNS
   question, not an app change — worth a conversation whenever it's
   relevant.

## 🌱 Longer-term (explicitly mentioned as future direction, no immediate action)
- AI assistant integration
- Client portals (would need a second, more restricted auth role/tier)
- Analytics dashboard
- Additional real estate tools

## Housekeeping
- Keep this file, `CHANGELOG.md`, `DATABASE.md`, and `ARCHITECTURE.md`
  updated as part of every feature, not as a separate cleanup pass.
