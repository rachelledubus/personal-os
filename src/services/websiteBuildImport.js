import { addProject, addMilestone, listProjects } from './goals.js';

// One-time import from the Website-Build Master Tracker (Milestone
// Edition). Reuses the existing Projects/Milestones system instead of
// building a separate website-specific tracker — a milestone with a
// checkbox and a due date is exactly what this already is. Each title
// is prefixed with its milestone group (M1-M5) since the milestones
// table has no native phase/group field, and the tracker's own rule
// ("ONE MILESTONE AT A TIME — everything below your current milestone
// does not exist") is preserved by leaving group 2+ items unchecked
// and undated rather than scheduling them all at once.

const MILESTONE_ITEMS = [
  // M1 — Launchable Website
  'M1: Set up Google Business Profile (claim, photos, service areas, categories, website link)',
  'M1: Fix Start Here bottom CTA link',
  'M1: De-duplicate the two "not sure where you fit" sections',
  'M1: Add selling-card line + city-card descriptors',
  'M1: Rename "Buyer Roadmap" \u2192 "6-12 Month Home Buyer Roadmap" everywhere',
  'M1: Local Content Collection day #1 \u2014 Cooper City photos + short video clips',
  'M1: Build Cooper City page from template + snippets',
  'M1: FAQ with schema on Cooper City page (Snippet 11)',
  'M1: Run Published-Page QA Checklist on Cooper City',
  'M1: Publish Cooper City page',
  'M1: Search Console \u2014 verify site, submit sitemap, request indexing',
  'M1: Ask for Google reviews (check brokerage/local rules; prioritize closings)',
  // M2 — Relocation Funnel Live
  'M2: Audit existing Relocation Guide page against its wireframe',
  'M2: Publish Relocation Starter Guide as a Google Doc',
  'M2: Test the form end-to-end + confirm email sequence fires',
  'M2: Build simple thank-you page ("check your email" + neighborhood links)',
  'M2: Build Conversion Landing Page (Buyer Consultation, template 03)',
  'M2: Build Trust & About Page (Work With Rachelle) + RealEstateAgent schema + Rich Results Test',
  'M2: QA checklist on both conversion pages',
  // M3 — Three Neighborhood Authority Pages
  'M3: Local Content Collection day #2 \u2014 Plantation + Pembroke Pines',
  'M3: Build Plantation and Pembroke Pines guides back-to-back',
  'M3: QA checklist on each; request indexing',
  'M3: Cross-link all three cities via Compare Nearby cards',
  // M4 — Buyer Education Funnel
  'M4: Build 6-12 Month Buyer Roadmap page + Google Doc + Sequence B + thank-you page',
  'M4: Build Start Planning Ahead page + Future Home Plan Google Doc + Sequence A + thank-you page',
  'M4: QA checklist on both',
  // M5 — Scale & Optimize
  'M5: First-Time Homebuyer Guide as Google Doc + Sequence C',
  'M5: Selling Strategy landing page + Google Doc + Sequence D (seller funnel)',
  'M5: Build Resources page (indexes everything)',
  'M5: Canva batch \u2014 redesign all five lead magnets, swap Doc links for PDFs',
  'M5: First blog post \u2014 "Cooper City vs Plantation," links both guides',
  'M5: Work the Version 2 list in batches',
];

export const PUBLISHED_PAGE_QA_CHECKLIST = [
  'SEO title + meta description set',
  'Exactly one H1',
  'Internal links: every page pushes to at least 2 other pages (mandatory, not optional)',
  'Every image has real alt text (place + city)',
  'At least one clear CTA / next step',
  'Schema pasted where applicable (FAQ, RealEstateAgent, etc.) and checked in Rich Results Test',
];

export async function importWebsiteBuildProject() {
  const existing = await listProjects();
  const already = existing.find(p => p.title === 'Website Build');
  if (already) return { created: false, project: already };

  const project = await addProject({ title: 'Website Build', status: 'Active' });
  for (const title of MILESTONE_ITEMS) {
    await addMilestone({ project_id: project.id, title });
  }
  return { created: true, project, count: MILESTONE_ITEMS.length };
}
