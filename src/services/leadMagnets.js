import { supabase } from '../lib/supabaseClient.js';

async function getUserId() {
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id;
}

// ============================================================
// THE THREE CORE FUNNELS — System 04C, seeded once (like the content
// pillars) so the pipeline has real magnets to attach nurture tracking
// to, instead of starting from a blank table.
// ============================================================

const SEED_LEAD_MAGNETS = [
  {
    name: 'Real Payment Guide', funnel: 'First-Time Buyer + Future Homeowner', build_phase: 'Phase 1', status: 'planned',
    audience: "Want to buy first home, currently renting, planning 6\u201318 months ahead",
    primary_problem: "I don't know what buying will actually cost or whether I'm ready.",
    next_step: 'Future Home Plan',
    whats_inside: [
      'Purchase price education \u2014 what different price points buy, examples across all three cities',
      'Monthly cost breakdown \u2014 mortgage, taxes, insurance, HOA, maintenance',
      'Buyer preparation \u2014 savings goals, credit prep, timeline planning',
    ],
  },
  {
    name: 'Southwest Broward Relocation Starter Guide', funnel: 'Southwest Broward Relocation', build_phase: 'Phase 1', status: 'planned',
    audience: 'Moving from NY, NJ, CA, DC/VA, GA, other high-cost areas',
    primary_problem: "We don't know where we should live.",
    next_step: 'Relocation Planning Call / Virtual Tour',
    whats_inside: [
      'Community comparisons across Cooper City, Pembroke Pines, Plantation',
      'Lifestyle differences \u2014 community feel, commute patterns, housing options, trade-offs',
      'Buyer education \u2014 insurance expectations, HOA, older-home considerations, school verification',
      'Moving checklist \u2014 first steps, local transition, preparation timeline',
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
// EMAIL NURTURE SEQUENCES — System 04C, verbatim. Reference templates
// (what each of the 5 emails should cover), keyed by which funnel they
// belong to. The manual recommends manual sending to start — this is
// the "what to write" reference; nurture_tracking (below) is the
// "who's on which email" tracker.
// ============================================================

export const NURTURE_SEQUENCES = {
  'First-Time Buyer + Future Homeowner': [
    'Deliver resource \u2014 "The number most buyers forget when planning."',
    'Cost education \u2014 "What a home actually costs beyond the mortgage."',
    'Home condition \u2014 "Why Florida homes require a different buying approach."',
    'Community education \u2014 "Cooper City vs. Pembroke Pines vs. Plantation: what actually changes?"',
    'Invitation \u2014 "Let\'s create your personalized home plan."',
  ],
  'Southwest Broward Relocation': [
    'Deliver guide \u2014 "The biggest mistake people make when moving to Florida."',
    'Insurance education \u2014 "What buyers should understand before shopping."',
    'Community education \u2014 "Why Southwest Broward cities feel different."',
    'Neighborhood education \u2014 "How to choose an area when you can\'t visit yet."',
    'Invitation \u2014 "Want help planning your move?"',
  ],
};

// ============================================================
// CTA LIBRARY BY FUNNEL — System 04C. These overlap partly with the
// System 13 CTA Library already synced in Bundle 1; kept here too as
// the funnel-grouped view the manual presents them in.
// ============================================================

export const CTAS_BY_FUNNEL = {
  Relocation: ['Get the Southwest Broward Relocation Guide', 'Compare Southwest Broward Communities', 'Plan My Move'],
  Buyers: ['Get the Real Payment Guide', 'Create My Future Home Plan', 'Understand My Buying Options'],
  'Community Fit': ['Find My Best-Fit Community', 'Compare Local Areas'],
  'General Education': ['Subscribe to the Southwest Broward Intelligence Report'],
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
