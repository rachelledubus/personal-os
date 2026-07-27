import { supabase } from '../lib/supabaseClient.js';

// ============================================================
// FUTURE ROADMAP LOG (System 00D)
// Decision Rule 4: "does this improve revenue, relationships, or
// systems, right now? If no, it goes on the future roadmap — not the
// calendar." This is the first version of that log that has ever
// actually existed as a place to put something, rather than a table
// with empty rows in a Word document.
// ============================================================

async function getUserId() {
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id;
}

export async function listFutureIdeas() {
  const userId = await getUserId();
  const { data, error } = await supabase.from('future_roadmap_ideas').select('*')
    .eq('user_id', userId).eq('promoted', false).order('logged_date', { ascending: false });
  if (error) throw error;
  return data;
}

export async function addFutureIdea(fields) {
  const userId = await getUserId();
  const { error } = await supabase.from('future_roadmap_ideas').insert({ ...fields, user_id: userId });
  if (error) throw error;
}

export async function updateFutureIdea(id, fields) {
  const { error } = await supabase.from('future_roadmap_ideas').update(fields).eq('id', id);
  if (error) throw error;
}

export async function deleteFutureIdea(id) {
  const { error } = await supabase.from('future_roadmap_ideas').delete().eq('id', id);
  if (error) throw error;
}

/** "Build This Next" — scores using the Business Decision Framework's
 *  own stated priority order (System 09): revenue impact first,
 *  system impact next, long-term asset value last. Roadmap items and
 *  opportunity ideas are fundamentally different shapes (a scheduled
 *  phase item vs. a value/effort-tagged idea) — rather than force
 *  them onto one false combined ranking, this picks the top of each
 *  pool separately and lets the two options speak for themselves. */
const EFFORT_SCORE = { Low: 3, Medium: 2, High: 1 };
const VALUE_SCORE = { Low: 1, Medium: 2, High: 3 };

export function scoreOpportunityIdea(idea) {
  const effort = EFFORT_SCORE[idea.effort] || 2;
  const value = VALUE_SCORE[idea.value] || 2;
  return value * 2 - (3 - effort); // high value dominates; low effort is the tiebreaker
}

/** Promotes an idea into a real roadmap_item — the moment a quarterly
 *  review decides it's time, per the manual's own promotion rule. */
export async function promoteToRoadmap(idea, phase = 'Foundation') {
  const userId = await getUserId();
  const { error: insErr } = await supabase.from('roadmap_items').insert({
    user_id: userId, title: idea.idea, phase, status: 'Not Started', sort_order: 999,
  });
  if (insErr) throw insErr;
  const { error } = await supabase.from('future_roadmap_ideas').update({ promoted: true }).eq('id', idea.id);
  if (error) throw error;
}
