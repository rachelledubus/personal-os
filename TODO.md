# TODO / Roadmap

## ✅ Status: the full 16-system BOS is built

Every system from the original SW Broward BOS spreadsheet now has a real,
working feature behind it — not reference text. See `CHANGELOG.md` for
the full build history.

| # | System | Feature |
|---|---|---|
| 01 | Brand Identity | Reference Library (Voice & Audience) |
| 02 | Local Knowledge | Local Knowledge Base, Community Resources, Market Updates |
| 03 | Content Engine | Content Checklist + Content Calendar |
| 04 | Business Growth | Pipeline, Marketing Campaigns, Public Tools (lead magnets) |
| 05 | Relationship Growth | Contacts (Sphere/Partner/Referral) + Outreach Playbook view |
| 06 | Research | Market Updates |
| 07 | Marketing/Database | Contacts |
| 08 | Client Experience | Client Journey checklist per Active Client |
| 09 | Business Management | Business Goals |
| 10 | Performance Review | Business KPIs + KPI Snapshots (history) |
| 11 | Implementation Roadmap | Interactive phase-based Roadmap |
| 12 | AI Automation | Automation Log |
| 13–16 | CTA/Script/Prompt/Template | Reference Library |

**Action required from you — run every SQL file below in the Supabase SQL
Editor (order doesn't matter, skip any already run):**
1. `contacts_migration.sql`
2. `grocery_migration.sql`
3. `finance_migration.sql`
4. `remaining_features_migration.sql`
5. `reference_library_category_migration.sql`
6. `bos_completion_migration.sql`

## 🔜 Nothing structural left — only content/data entry
- **Fill in Neighborhood Profiles** (Business tab) — 3 blank rows waiting
  for your real local knowledge, feeds the public Neighborhood Explorer.
- **Fill in Local Knowledge Base, Community Resources, Roadmap status** —
  all working, just start empty (or seeded with generic defaults for
  Roadmap) and get more useful the more you use them.

## 🌱 Longer-term (explicitly mentioned as future direction, no immediate action)
- AI assistant integration
- Client portals (would need a second, more restricted auth role/tier)
- Custom domain/branding for Public Tools
- Additional real estate tools

## Housekeeping
- Keep this file, `CHANGELOG.md`, `DATABASE.md`, and `ARCHITECTURE.md`
  updated as part of every feature, not as a separate cleanup pass.
