import { supabase } from '../lib/supabaseClient.js';
import { todayStr, mondayOfWeek, currentMonthStr } from '../utils/date.js';

// ============================================================
// CHORES
// checklist_items already holds the item list (list_key: chores-daily
// / chores-weekly / chores-monthly). This adds the missing piece —
// actual completion tracking with the RIGHT reset behavior per
// cadence, using the same "does a row exist for the current period"
// pattern habit_logs already uses for daily. No scheduled job resets
// anything; a period simply stops matching once it's over.
// ============================================================

const CADENCE_PERIOD = {
  'chores-daily': () => todayStr(),
  'chores-weekly': () => mondayOfWeek(),
  'chores-monthly': () => currentMonthStr(),
};

async function getUserId() {
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id;
}

export async function listChores() {
  const userId = await getUserId();
  const { data, error } = await supabase
    .from('checklist_items').select('*').eq('user_id', userId).eq('archived', false)
    .in('list_key', Object.keys(CADENCE_PERIOD));
  if (error) throw error;
  return data;
}

/** Completion rows for whichever periods are CURRENT right now — one
 *  query covers all three cadences since each list_key's period
 *  marker means something different but the lookup shape is the same. */
export async function listCurrentCompletions() {
  const userId = await getUserId();
  const periods = Object.values(CADENCE_PERIOD).map(fn => fn());
  const { data, error } = await supabase
    .from('checklist_completions').select('checklist_item_id, period_marker')
    .eq('user_id', userId).in('period_marker', periods);
  if (error) throw error;
  return new Set((data || []).map(r => r.checklist_item_id));
}

export async function toggleChore(item, done) {
  const userId = await getUserId();
  const periodMarker = CADENCE_PERIOD[item.list_key]();

  if (done) {
    await supabase.from('checklist_completions').upsert({
      user_id: userId, checklist_item_id: item.id, period_marker: periodMarker,
    }, { onConflict: 'user_id,checklist_item_id,period_marker' });
  } else {
    await supabase.from('checklist_completions').delete()
      .eq('checklist_item_id', item.id).eq('period_marker', periodMarker);
  }
}

export async function addChore(listKey, name) {
  const userId = await getUserId();
  const { error } = await supabase.from('checklist_items').insert({
    user_id: userId, list_key: listKey, name, archived: false,
  });
  if (error) throw error;
}
