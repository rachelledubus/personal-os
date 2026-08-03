import { addProject, addMilestone, listProjects, listMilestones, toggleMilestone, deleteMilestone } from './goals.js';
import { supabase } from '../lib/supabaseClient.js';

async function getUserId() {
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id;
}

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

// ============================================================
// POST-BUILD CHECKLIST — added once the site moved from build mode
// into operate mode (Milestone 5 transition). Deliberately does NOT
// re-add "Canva batch" or "First blog post" (already in M5) or
// Google Business Profile / basic Search Console setup (already in
// M1) — only what's genuinely new: the required QA pass, 8 specific
// verified-not-assumed loose threads from the build sessions, and a
// more specific Search Console follow-up than the original M1 item.
// ============================================================

const POST_BUILD_ITEMS = [
  'QA: Run the Published-Page QA Checklist on every live page in one clean pass \u2014 a lot got edited piecemeal, worth not trusting memory here',
  'Verify: Homepage Cooper City card \u2014 "top-rated schools" language removed (fair housing)',
  'Verify: Homepage "BUYING SOON" card links to the buyer roadmap, not the relocation guide',
  'Verify: Relocation Guide + Start Planning Ahead \u2014 consultation link points to /consultation/, not the broken /buyer-consultation/',
  'Verify: Pembroke Pines guide \u2014 the three leftover "Plantation" text references are fixed',
  'Verify: Pembroke Pines guide \u2014 GreatSchools link points to Pembroke Pines coordinates, not Plantation\u2019s',
  'Verify: Selling Strategy Guide\u2019s closing CTA buttons are wired to real URLs, not YOUR-CONSULTATION-URL / YOUR-GUIDE-URL placeholders',
  'Verify: all five lead-magnet forms use the corrected Kit CSS (unscoped selectors) and actually render styled',
  'Verify: all five Kit automations (tag \u2192 sequence) are switched Active, not just saved',
  'Google Search Console \u2014 specifically request indexing for Cooper City, Start Here, and Resources pages',
];

export async function importPostBuildChecklist() {
  const existing = await listProjects();
  const project = existing.find(p => p.title === 'Website Build');
  if (!project) return { created: false, reason: 'No "Website Build" project found \u2014 import the original milestones first.' };

  const currentMilestones = await listMilestones({ projectId: project.id });
  const existingTitles = new Set(currentMilestones.map(m => m.title));
  const missing = POST_BUILD_ITEMS.filter(t => !existingTitles.has(t));

  for (const title of missing) {
    await addMilestone({ project_id: project.id, title });
  }

  const userId = await getUserId();
  const { data: existingNotes } = await supabase.from('notes').select('id').eq('project_id', project.id).ilike('content', 'Weekly rhythm%').limit(1);
  if (!existingNotes || existingNotes.length === 0) {
    await supabase.from('notes').insert({
      user_id: userId,
      project_id: project.id,
      content: 'Weekly rhythm once live (per Master Tracker): ~35% lead gen & follow-up, ~25% website/SEO, ~20% content, ~10% local content collection, ~10% admin/analytics. Monthly: review Search Console (impressions, clicks, indexing).\n\nVersion 2 list rule: anything that occurs to you now ("I should tweak this") goes on the Opportunity Inbox (Business \u2192 Roadmap), not back into active work immediately. Publish over perfect, edit later in batches \u2014 don\u2019t let a fresh urge to polish pull you back into build mode before the site\u2019s had a chance to generate a lead.',
    });
  }

  return { created: true, count: missing.length, skipped: POST_BUILD_ITEMS.length - missing.length };
}

// ============================================================
// Marks M1-M4 complete \u2014 the actual site-build milestones \u2014
// reflecting the confirmed fact that the website is done. M5 (Canva
// batch, blog post, Resources page, Version 2 list) is left alone
// since only the Canva batch was confirmed as current active work,
// not the rest of M5.
// ============================================================
export async function markSiteBuildComplete() {
  const existing = await listProjects();
  const project = existing.find(p => p.title === 'Website Build');
  if (!project) return { updated: 0, reason: 'No "Website Build" project found.' };

  const milestones = await listMilestones({ projectId: project.id });
  const toComplete = milestones.filter(m => /^M[1-4]:/.test(m.title) && !m.completed);
  for (const m of toComplete) {
    await toggleMilestone(m.id, true);
  }
  return { updated: toComplete.length };
}

/** Real business/website progress for the Business \u2192 Roadmap
 *  redesign \u2014 grouped by phase (M1-M5 or P1-P4 prefix), with
 *  completion stats per phase. This replaces the old software-roadmap
 *  phase cards, which tracked the app's own build (not something
 *  actionable day-to-day for the person actually running the
 *  business). */
export async function getWebsiteBuildProgress() {
  const existing = await listProjects();
  const project = existing.find(p => p.title === 'Website Build');
  if (!project) return null;

  const milestones = await listMilestones({ projectId: project.id });
  const phases = {};
  for (const m of milestones) {
    const match = m.title.match(/^(M[1-5]|P[1-4]):\s*(.+)/);
    const phase = match ? match[1] : 'Other';
    const label = match ? match[2] : m.title;
    (phases[phase] ||= []).push({ ...m, label });
  }

  const PHASE_NAMES = {
    M1: 'Launchable Website', M2: 'Relocation Funnel', M3: 'Neighborhood Guides', M4: 'Buyer Education Funnel',
    P1: 'Finish the last mile', P2: 'Get real leads moving', P3: 'Build the operating rhythm', P4: 'Build authority & scale',
  };

  const PHASE_ORDER = ['M1', 'M2', 'M3', 'M4', 'M5', 'P1', 'P2', 'P3', 'P4', 'Other'];
  const phaseList = Object.keys(phases).sort((a, b) => PHASE_ORDER.indexOf(a) - PHASE_ORDER.indexOf(b)).map(key => ({
    key, name: PHASE_NAMES[key] || key, items: phases[key],
    doneCount: phases[key].filter(m => m.completed).length,
    total: phases[key].length,
  }));

  return { projectId: project.id, phases: phaseList };
}

// ============================================================
// THE NEW ROADMAP — replaces the old, generic M5 "Scale & Optimize"
// catch-all with 4 concrete phases reflecting where things actually
// are: the site is live, the automation engine exists but needs real
// verification, and the actual work now is finishing the last
// pieces, getting real leads through the system, and building the
// habits that make it a business instead of a project. One picture,
// not two separate trackers for "finish the site" and "grow the
// business" \u2014 those were never really separate things.
// ============================================================

const OLD_M5_TITLES_TO_RETIRE = [
  'M5: First-Time Homebuyer Guide as Google Doc + Sequence C',
  'M5: Selling Strategy landing page + Google Doc + Sequence D (seller funnel)',
  'M5: Build Resources page (indexes everything)',
  'M5: Canva batch \u2014 redesign all five lead magnets, swap Doc links for PDFs',
  'M5: First blog post \u2014 "Cooper City vs Plantation," links both guides',
  'M5: Work the Version 2 list in batches',
];

const NEW_ROADMAP_ITEMS = [
  // P1 — Finish the last mile (migrates the still-real M5 work + the one thing that actually needs verifying)
  'P1: Confirm the automation system sent a real email end to end \u2014 not just "enrolled," an actual received email',
  'P1: Finish the Canva batch \u2014 all five lead magnets redesigned, real PDF links live',
  'P1: Build the Resources page (indexes everything)',
  'P1: First-Time Homebuyer Guide live as a Google Doc + Sequence C',
  'P1: Selling Strategy Guide live as a Google Doc + Sequence D',
  'P1: Verify the 8 loose-thread items from the post-build checklist are actually resolved',
  // P2 — Get real leads moving
  'P2: First 10 real contacts enrolled in an automation',
  'P2: Confirm tags are applying correctly on real form submissions',
  'P2: Log every real conversation/follow-up in the CRM as it happens',
  // P3 — Build the operating rhythm
  'P3: Complete the first Weekly Business Review',
  'P3: Two consecutive weeks of a completed Weekly Business Review',
  'P3: Two consecutive weeks of Business Momentum habits actually done',
  // P4 — Build authority & scale
  'P4: First blog post live ("Cooper City vs Plantation")',
  'P4: Second blog post live',
  'P4: One local content collection session completed',
  'P4: Revisit the Version 2 list and pull in 1-2 items',
];

export async function buildNewRoadmap() {
  const existing = await listProjects();
  const project = existing.find(p => p.title === 'Website Build');
  if (!project) return { created: false, reason: 'No "Website Build" project found.' };

  const currentMilestones = await listMilestones({ projectId: project.id });

  // Retire the old, vague M5 catch-all items that are being replaced
  // by more specific versions in the new phases \u2014 only the ones
  // that were never actually completed, so nothing real gets lost.
  let retired = 0;
  for (const m of currentMilestones) {
    if (OLD_M5_TITLES_TO_RETIRE.includes(m.title) && !m.completed) {
      await deleteMilestone(m.id);
      retired += 1;
    }
  }

  const existingTitles = new Set(currentMilestones.map(m => m.title));
  const toAdd = NEW_ROADMAP_ITEMS.filter(t => !existingTitles.has(t));
  for (const title of toAdd) {
    await addMilestone({ project_id: project.id, title });
  }

  return { retired, added: toAdd.length, skipped: NEW_ROADMAP_ITEMS.length - toAdd.length };
}


