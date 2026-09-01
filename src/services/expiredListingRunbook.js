import { addProject, listProjects, addMilestone, listMilestones, addMilestoneStep, listMilestoneSteps } from './goals.js';

// ============================================================
// EXPIRED LISTING RUNBOOK — Part 1 setup tracker. Extracted directly
// from 04A6_Expired_Listing_Runbook.html (System 04A.6). Marked
// "Built, not active" in the source document — this only tracks
// the real-world setup work, it does not activate anything or
// suggest the underlying compliance rules are being followed
// automatically. Most of Part 1 is action only you can take
// (broker authorization, MLS confirmation, purchasing the Florida
// DNC list) — this just gives you somewhere to check it off as
// you actually do it.
// ============================================================

const PROJECT_TITLE = 'Expired Listing Runbook \u2014 Setup (System 04A.6)';

const SETUP_TASKS = [
  {
    title: '1. Get broker authorization',
    steps: ['Email sent', 'Written approval received and saved'],
  },
  {
    title: '2. Confirm MLS data-use rules',
    steps: ['Written confirmation saved'],
  },
  {
    title: '3. Register for federal DNC access (telemarketing.donotcall.gov)',
    steps: ['SAN issued and logged in \u2014 can run a lookup'],
  },
  {
    title: '4. Buy the Florida DNC list (quarterly)',
    steps: ['Purchased', 'Calendar reminder set to repurchase quarterly'],
  },
  {
    title: '5. Build the CRM tabs (EXPIRED, DNC-INTERNAL, COMPLIANCE-LOG)',
    steps: [
      'EXPIRED working tab with all Part 5 fields',
      'DNC-INTERNAL tab \u2014 permanent, rows never deleted',
      'COMPLIANCE-LOG tab \u2014 5-year retention, rows never deleted',
    ],
  },
  {
    title: '6. Save the MLS searches (Search A weekly, Search B monthly)',
    steps: [
      'Search A saved and named \u2014 Expired+Withdrawn+Cancelled, previous 7 days',
      'Search B saved and named \u2014 same filters, 31 to 90 days out',
      'Zip set verified against current MLS area codes',
    ],
  },
  {
    title: '7. Block the calendar (Mon/Tue/Thu/Fri, recurring 12 weeks)',
    steps: [
      'Monday 45 min \u2014 Expired pull and score',
      'Tuesday 45 min \u2014 Lookup and prep',
      'Thursday 10:00\u201311:15am \u2014 Call block',
      'Friday 40 min \u2014 Second attempts and logging',
    ],
  },
  {
    title: '8. Build the letter and email templates',
    steps: [
      'Letter template saved with phone number included',
      'Email template saved with email address only, no phone',
      'Brokerage name set at or above the size of your name on all print (FREC 61J2-10.025(2))',
      '30 sheets and envelopes printed and stocked',
    ],
  },
  {
    title: '9. Build the vendor sheet (5 trades, 3 names each)',
    steps: [
      'Painter \u2014 3 names', 'Flooring \u2014 3 names', 'Handyman \u2014 3 names',
      'Landscaper \u2014 3 names', 'Cleaner or stager \u2014 3 names',
      'License and insurance verified for every name',
      'Sheet states in writing you receive no compensation for referrals',
    ],
  },
  {
    title: '10. Build the before-and-after board',
    steps: ['6\u20138 paired images with price + DOM outcome, built and printed'],
  },
  {
    title: '11. Add scorecard lines and prompts',
    steps: [
      'Six metrics added to the Friday Weekly Scorecard',
      'Four AI prompts copied verbatim into the Prompt Library',
    ],
  },
];

export async function importExpiredListingRunbookSetup() {
  const existingProjects = await listProjects();
  let project = existingProjects.find(p => p.title === PROJECT_TITLE);
  if (!project) {
    project = await addProject({
      title: PROJECT_TITLE,
      description: 'Part 1 one-time setup from the Expired Listing Runbook. Nothing in Part 2 (the weekly workflow) runs until every task here is checked. Most of this is real-world action \u2014 emails, registrations, purchases \u2014 not app work.',
    });
  }

  const existingMilestones = await listMilestones({ projectId: project.id });
  const existingTitles = new Set(existingMilestones.map(m => m.title));

  let milestonesAdded = 0, stepsAdded = 0;
  for (let i = 0; i < SETUP_TASKS.length; i++) {
    const task = SETUP_TASKS[i];
    let milestone = existingMilestones.find(m => m.title === task.title);
    if (!milestone) {
      await addMilestone({ project_id: project.id, title: task.title, sort_order: i });
      milestonesAdded += 1;
      const refreshed = await listMilestones({ projectId: project.id });
      milestone = refreshed.find(m => m.title === task.title);
    }
    if (!milestone) continue;

    const existingSteps = await listMilestoneSteps(milestone.id);
    const existingStepTitles = new Set(existingSteps.map(s => s.title));
    for (let j = 0; j < task.steps.length; j++) {
      if (existingStepTitles.has(task.steps[j])) continue;
      await addMilestoneStep(milestone.id, task.steps[j], j);
      stepsAdded += 1;
    }
  }

  return { milestonesAdded, stepsAdded, totalTasks: SETUP_TASKS.length };
}
