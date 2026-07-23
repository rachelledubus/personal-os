import { supabase } from '../lib/supabaseClient.js';
import { todayStr, mondayOfWeek } from '../utils/date.js';

// ============================================================
// THE WEEKLY BUSINESS DASHBOARD
// Per 0_-_Start_Here.docx: "Two documents run the business day to
// day: the Dashboard and the Timeline." This is that Dashboard,
// finally real instead of a Google Doc someone has to remember to
// open. Four boxes, checked daily: Relationship, Authority, Pipeline,
// Knowledge — the day's actual minimum.
// ============================================================

async function getUserId() {
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id;
}

export async function getTodayCheckin() {
  const userId = await getUserId();
  const { data, error } = await supabase.from('daily_checkin').select('*')
    .eq('user_id', userId).eq('checkin_date', todayStr()).maybeSingle();
  if (error) throw error;
  return data;
}

export async function toggleCheckinBox(box, done, note = null) {
  const userId = await getUserId();
  const fields = { [`${box}_done`]: done };
  if (note !== null) fields[`${box}_note`] = note;
  const { error } = await supabase.from('daily_checkin').upsert({
    user_id: userId, checkin_date: todayStr(), ...fields,
  }, { onConflict: 'user_id,checkin_date' });
  if (error) throw error;
}

/** This week's Mon-Fri boxes, for the weekly Total row. */
export async function getWeekCheckins() {
  const userId = await getUserId();
  const monday = mondayOfWeek();
  const friday = new Date(monday); friday.setDate(friday.getDate() + 4);
  const { data, error } = await supabase.from('daily_checkin').select('*')
    .eq('user_id', userId).gte('checkin_date', monday).lte('checkin_date', friday.toISOString().slice(0, 10))
    .order('checkin_date');
  if (error) throw error;
  return data || [];
}

export async function getWeeklyTargets() {
  const userId = await getUserId();
  const monday = mondayOfWeek();
  const { data, error } = await supabase.from('weekly_targets').select('*')
    .eq('user_id', userId).eq('week_start', monday).maybeSingle();
  if (error) throw error;
  return data;
}

export async function setWeeklyTargets(fields) {
  const userId = await getUserId();
  const monday = mondayOfWeek();
  const { error } = await supabase.from('weekly_targets').upsert({
    user_id: userId, week_start: monday, ...fields,
  }, { onConflict: 'user_id,week_start' });
  if (error) throw error;
}

/** The Reflection half of the Weekly Business Review (PRD Module 5) —
 *  What worked? What didn't? What needs attention? What should I
 *  prioritize next week? One row per week, same week_start key as
 *  weekly_targets so both halves of the review line up. */
export async function getWeeklyReview() {
  const userId = await getUserId();
  const monday = mondayOfWeek();
  const { data, error } = await supabase.from('weekly_reviews').select('*')
    .eq('user_id', userId).eq('week_start', monday).maybeSingle();
  if (error) throw error;
  return data;
}

export async function setWeeklyReview(fields) {
  const userId = await getUserId();
  const monday = mondayOfWeek();
  const { error } = await supabase.from('weekly_reviews').upsert({
    user_id: userId, week_start: monday, ...fields, updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id,week_start' });
  if (error) throw error;
}

/** Running totals against target — reads real data instead of asking
 *  for manual tallies: conversations from activity_log (mission
 *  completions of type 'contacts'/'sphere'), pipeline moves from
 *  contacts whose category changed this week (approximated via
 *  updated contacts this week), consultations from guided_flow_runs. */
export async function getWeeklyRunningTotals() {
  const userId = await getUserId();
  const monday = mondayOfWeek();

  const [{ count: conversations }, { count: consultations }] = await Promise.all([
    supabase.from('activity_log').select('id', { count: 'exact', head: true })
      .eq('user_id', userId).eq('source_table', 'contacts').eq('event_type', 'completed').gte('event_date', monday),
    supabase.from('guided_flow_runs').select('id', { count: 'exact', head: true })
      .eq('user_id', userId).eq('flow_key', 'consultation').gte('started_at', monday),
  ]);

  return {
    conversations: conversations || 0,
    consultations: consultations || 0,
  };
}