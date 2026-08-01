import { supabase } from '../lib/supabaseClient.js';

async function getUserId() {
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id;
}

// ============================================================
// LEAD MAGNETS — originally seeded from the abstract Operating
// Standards manual (System 04C). The actual Website-Build project
// has real, further-along content for these — full page-by-page
// guide drafts and complete 3-email sequences, not just topic
// one-liners. This seed now reflects that real content.
//
// One thing NOT silently resolved: "Real Payment Guide" (the
// original seed) and "Future Home Plan" (from Website-Build) target
// the same audience description almost word-for-word — this is very
// likely the same magnet renamed as the project evolved, not two
// different ones. Left both in rather than guess-merge them; worth
// reviewing and archiving whichever one didn't survive.
// ============================================================

const SEED_LEAD_MAGNETS = [
  {
    name: 'Southwest Broward Relocation Starter Guide', funnel: 'Southwest Broward Relocation', build_phase: 'Phase 1', status: 'building',
    audience: 'Moving from out of state \u2014 work, family, weather, or a reset',
    primary_problem: "We don't know where we should live, or what life actually costs here.",
    next_step: 'Relocation Planning Call / Virtual Tour',
    whats_inside: [
      "Broward in five minutes \u2014 where it is, the anchor city, who moves here, the honest sell vs. Miami",
      'East to West \u2014 how Broward is organized in bands (coastal / established suburbs / newer master-planned)',
      'City profile spread \u2014 one page per city, identical layout, for direct comparison',
      'Moving timeline checklist \u2014 the section most older relocation guides are missing',
    ],
  },
  {
    name: '6-12 Month Home Buyer Roadmap', funnel: '6-12 Month Buyer Roadmap', build_phase: 'Phase 1', status: 'building',
    audience: 'Buying within the next year \u2014 a real window, not a someday',
    primary_problem: "I have a timeline but don't know what order to do things in.",
    next_step: 'Free 30-minute consultation \u2014 map out your specific plan',
    whats_inside: [
      'The roadmap at a glance \u2014 5 phases from Months 12\u20139 (Foundation) to Final weeks (Under Contract \u2192 Keys)',
      "Month-by-month checklists, each marked with what can't be skipped if your window compresses",
      'Built for both a 12-month reader and a 6-month reader \u2014 phases compress, order stays the same',
    ],
  },
  {
    name: 'Future Home Plan', funnel: 'Start Planning Ahead', build_phase: 'Phase 1', status: 'building',
    audience: 'Renters/future buyers 6\u201318 months out \u2014 not ready yet, and that\u2019s the point',
    primary_problem: "I'm not ready to buy, but I don't know what to actually do in the meantime.",
    next_step: 'Soft door-open to a consultation, or the neighborhood guides if not ready',
    whats_inside: [
      'Find your starting point \u2014 12\u201318 / 6\u201312 / 0\u20136 months out, each with its own job to do',
      'Foundation-building checklist \u2014 credit report (not just score), automatic payments, home fund savings',
      'No pressure, no deadlines \u2014 explicitly organized around the reader\u2019s own timeline',
    ],
  },
  {
    name: 'First-Time Homebuyer Guide', funnel: 'First-Time Homebuyer Guide', build_phase: 'Phase 1', status: 'building',
    audience: 'Learning the process for the first time \u2014 near-term or far-out',
    primary_problem: "I don't know what actually happens when you buy a home, and I don't want to ask a dumb question.",
    next_step: 'Routes by readiness \u2014 consultation, Future Home Plan, or neighborhood guides',
    whats_inside: [
      'The whole process on one page \u2014 8 steps, pre-approval through closing day',
      'Plain-English definition boxes scattered throughout \u2014 the guide\u2019s signature element',
      'The 20% down payment myth, addressed directly \u2014 what buyers actually need varies by situation',
    ],
  },
  {
    name: 'Home Selling Strategy Guide', funnel: 'Home Selling', build_phase: 'Phase 1', status: 'building',
    audience: 'Homeowners considering selling \u2014 listing in two months or two years',
    primary_problem: "I don't know what actually affects my home's price, or what's worth fixing before I sell.",
    next_step: 'Free CMA (comparable sales market analysis) \u2014 the guide\u2019s entire conversion mechanism',
    whats_inside: [
      'The selling process at a glance \u2014 6 steps, know your number through closing',
      "What actually affects your price \u2014 location, condition, comparable sales, timing, presentation",
      'Deliberately leaner and calmer than the buyer guides \u2014 sellers skew older/more established',
    ],
  },
  {
    name: 'Community Match Quiz', funnel: 'Community Match', build_phase: 'Phase 2', status: 'planned',
    audience: 'Know they want Southwest Broward, don\u2019t know where they fit',
    primary_problem: 'Which community matches our lifestyle?',
    next_step: 'Community Planning Call',
    whats_inside: [
      'Lifestyle \u2014 suburban vs. more convenient location, community feel, amenities',
      'Budget \u2014 target price range, monthly comfort level',
      'Home Preferences \u2014 newer vs. older, single-family vs. townhome, HOA preference',
      'Priorities \u2014 schools, commute, space, location',
    ],
  },
];

export async function seedLeadMagnetsIfEmpty() {
  const userId = await getUserId();
  if (!userId) return;
  const { count } = await supabase.from('lead_magnets').select('id', { count: 'exact', head: true }).eq('user_id', userId);
  if (count) return;
  await supabase.from('lead_magnets').insert(SEED_LEAD_MAGNETS.map(m => ({ ...m, user_id: userId })));
}

/** Same lesson as the Library sync (Bundle 1): seedIfEmpty only fires
 *  on a genuinely empty table. Anyone who already seeded the original
 *  3-magnet version needs this instead — checks by name, inserts only
 *  what's missing. */
export async function syncLeadMagnetGaps() {
  const userId = await getUserId();
  if (!userId) return { added: 0 };
  const { data: existing } = await supabase.from('lead_magnets').select('name').eq('user_id', userId);
  const existingNames = new Set((existing || []).map(m => m.name));
  const missing = SEED_LEAD_MAGNETS.filter(m => !existingNames.has(m.name));
  if (missing.length) await supabase.from('lead_magnets').insert(missing.map(m => ({ ...m, user_id: userId })));
  return { added: missing.length };
}

export async function deleteLeadMagnet(id) {
  const { error } = await supabase.from('lead_magnets').delete().eq('id', id);
  if (error) throw error;
}

export async function listLeadMagnets() {
  const userId = await getUserId();
  const { data, error } = await supabase.from('lead_magnets').select('*').eq('user_id', userId).order('build_phase');
  if (error) throw error;
  return data || [];
}

export async function updateLeadMagnetStatus(id, status) {
  const { error } = await supabase.from('lead_magnets').update({ status }).eq('id', id);
  if (error) throw error;
}

// ============================================================
// LANDING PAGE STANDARDS — System 04C. Fixed 5-part template, same
// for every magnet. Static reference, not per-magnet data.
// ============================================================

export const LANDING_PAGE_STANDARDS = [
  { element: 'Problem-focused headline', standard: 'Lead with the question they already have \u2014 "What does buying a home in Broward really cost each month?"' },
  { element: 'Clear audience', standard: '"This guide is for you if\u2026" moving from another state, buying your first home, planning within a year' },
  { element: 'Value preview', standard: 'Show exactly what they receive \u2014 comparisons, checklists, examples, planning tools' },
  { element: 'Simple form', standard: 'Required: name, email. Optional: timeline, current location, area interest' },
  { element: 'Immediate next step', standard: 'Thank-you page continues the relationship \u2014 "Not ready yet? Start your Future Home Plan."' },
];

// ============================================================
// EMAIL NURTURE SEQUENCES. The two under "First-Time Buyer + Future
// Homeowner" and "Southwest Broward Relocation" are the original
// topic-line-only reference from the Operating Standards manual.
// The four below them are the REAL, complete sequences from the
// Website-Build project (subject + full body, send timing built in:
// Email 1 immediate, Email 2 day 3\u20135, Email 3 day 10\u201314) \u2014
// meaningfully more finished than the originals. Manual sending is
// fine to start, per the source doc's own implementation note.
// ============================================================

export const NURTURE_SEQUENCES = {
  'First-Time Buyer + Future Homeowner': [
    { subject: 'The number most buyers forget when planning' },
    { subject: 'What a home actually costs beyond the mortgage' },
    { subject: 'Why Florida homes require a different buying approach' },
    { subject: 'Cooper City vs. Pembroke Pines vs. Plantation: what actually changes?' },
    { subject: "Let's create your personalized home plan" },
  ],
  'Southwest Broward Relocation': [
    { subject: 'The biggest mistake people make when moving to Florida' },
    { subject: 'What buyers should understand before shopping' },
    { subject: 'Why Southwest Broward cities feel different' },
    { subject: "How to choose an area when you can't visit yet" },
    { subject: 'Want help planning your move?' },
  ],
  'Start Planning Ahead': [
    { subject: 'your future home plan is inside', body: "Here's your Future Home Plan: [download link]\n\nMy suggestion: don't try to do everything in it. Find your timeline section (12\u201318 months, 6\u201312, or 0\u20136), pick ONE thing from it, and start there. Small steps now beat a scramble later.\n\nIf you ever have a question while you're working through it \u2014 even a small one \u2014 just reply. I answer these myself." },
    { subject: 'the step most people skip', body: "Quick one: of everything in the plan, the step people most often skip is checking their credit report early. Not their score \u2014 the actual report. Errors are common, and fixing one takes months, which is exactly the kind of thing you want to find NOW and not during an application.\n\nIt's free at annualcreditreport.com (the official one). That's it \u2014 no homework beyond that this week." },
    { subject: 'whenever you\u2019re ready (no rush)', body: "No pitch here \u2014 just leaving the door open. Some people find it helpful to have a quick conversation early, even a year out, just to sanity-check their plan. Others prefer to work through it solo until they're close. Both are completely fine.\n\nIf a 20-minute chat would help you feel more confident about your timeline: [booking link]\n\nAnd if not \u2014 the neighborhood guides on my site are a good next thing to explore when you're curious: [neighborhoods link]" },
  ],
  '6-12 Month Buyer Roadmap': [
    { subject: 'your 6-12 month buyer roadmap', body: "Here's your roadmap: [download link]\n\nStart with the month-by-month breakdown and find where you are right now \u2014 that's your page. Everything before it, you can skim. Everything after it, don't worry about yet.\n\nQuestions as you go? Just reply." },
    { subject: 'one thing that saves buyers the most time', body: "If you're 6\u201312 months out, the single highest-leverage thing you can do this month is have a short call with a lender \u2014 not to commit, just to get a realistic read on your number. Buyers who do this early shop with confidence. Buyers who skip it often fall for homes outside their range and have to start over.\n\nIf you don't have a lender, I'm happy to share a couple I trust who are good with first-time buyers \u2014 no obligation to use them. Just reply and ask." },
    { subject: 'want to map out your specific plan?', body: "The roadmap covers what to do in general. A consultation covers what to do for YOU \u2014 your budget, your timeline, which Broward neighborhoods actually fit what you're looking for.\n\nIt's free, about 30 minutes, and you'll leave with a specific plan whether or not we ever work together: [booking link]\n\nIf you're not there yet, that's fine too \u2014 I'll be here when you are." },
  ],
  'First-Time Homebuyer Guide': [
    { subject: 'your first-time homebuyer guide', body: "Here's the guide: [download link]\n\nIf the whole process feels like a lot \u2014 that's normal, and it's exactly why I made this. Read it in order once, then keep it around as a reference for whichever step you're on.\n\nOne promise: there's no such thing as a dumb question. If anything in there is confusing, reply and ask. I'd genuinely rather explain it twice than have you feel lost." },
    { subject: 'the #1 first-timer misconception', body: "The thing that surprises first-time buyers most: you don't need 20% down. That number scares a lot of people into waiting years longer than they need to. There are loan options with much lower down payments, and Florida has assistance programs many buyers never hear about.\n\nWhat you actually need varies by situation \u2014 which is why the guide covers the options rather than one number. Worth a read if you skipped that section." },
    { subject: 'where are you in the process?', body: "Quick check-in \u2014 people download this guide at very different stages, so here's a next step for wherever you are:\n\nBuying in the next year? Let's talk \u2014 a free 30-minute consultation gets you a plan specific to your situation: [booking link]\nStill a ways out? The Future Home Plan is built for exactly that \u2014 what to do 6\u201318 months before you're ready: [Future Home Plan link]\nJust exploring Broward? Start with the neighborhood guides: [link]\n\nWhichever it is \u2014 no rush, no pressure." },
  ],
  'Home Selling': [
    { subject: 'your home selling strategy guide', body: "Here's your guide: [download link]\n\nIt walks through the selling process, what actually affects your home's value here in Broward, and how to prep without over-spending on the wrong things.\n\nOne thing the guide can't do is tell you what YOUR home is worth. If you'd like a specific read, I put together free market analyses (a CMA \u2014 real comparable sales from your neighborhood, not an online estimate). Just reply with your address and I'll get started. No obligation, no listing pressure." },
    { subject: 'before you spend money on repairs', body: "The most expensive seller mistake I see: renovating things buyers don't pay for. Not every project returns its cost, and some homes sell better with a lighter touch than owners expect.\n\nBefore you spend anything on prep \u2014 paint, repairs, anything \u2014 it's worth knowing your home's realistic range first, so you can decide what's actually worth doing. That's exactly what the free market analysis is for. Reply with your address anytime and I'll put one together." },
    { subject: 'whenever the timing is right', body: "No pressure from me on timing \u2014 some people sell within months of downloading that guide, others sit on it for a year or more while life sorts itself out. Both are normal.\n\nWhenever you want to talk it through \u2014 the market, your home's value, or how selling and buying at the same time works \u2014 I'm here: [booking or contact link]" },
  ],
};

// ============================================================
// NURTURE TRACKING — the live spreadsheet replacement: name / magnet /
// date started / emails sent / replied? / booked?
// ============================================================

export async function listNurtureTracking() {
  const userId = await getUserId();
  const { data, error } = await supabase.from('nurture_tracking').select('*, contacts(name), lead_magnets(name, funnel)')
    .eq('user_id', userId).order('date_started', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function addNurtureTracking(fields) {
  const userId = await getUserId();
  const { error } = await supabase.from('nurture_tracking').insert({ ...fields, user_id: userId });
  if (error) throw error;
}

export async function updateNurtureTracking(id, fields) {
  const { error } = await supabase.from('nurture_tracking').update(fields).eq('id', id);
  if (error) throw error;
}

export async function deleteNurtureTracking(id) {
  const { error } = await supabase.from('nurture_tracking').delete().eq('id', id);
  if (error) throw error;
}

/** Tracking Dashboard (Acquisition/Engagement/Conversion) — computed
 *  from real nurture_tracking rows instead of more manual-entry
 *  fields, since this data already has to exist for the tracker to be
 *  useful at all. */
export async function getFunnelDashboardStats() {
  const rows = await listNurtureTracking();
  return {
    downloads: rows.length,
    replied: rows.filter(r => r.replied).length,
    booked: rows.filter(r => r.booked).length,
    inProgress: rows.filter(r => r.current_email > 0 && r.current_email < 5).length,
    completedSequence: rows.filter(r => r.current_email >= 5).length,
  };
}
