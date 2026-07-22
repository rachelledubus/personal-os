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

// Real seed for a 2BR/2BA townhouse rental with heavy-shedding dogs —
// not a generic template. "Vacuum every Tuesday" becomes "here's what
// a home like yours actually needs," pre-loaded instead of built from
// scratch (Area 5).
const STARTER_CHORES = {
  'chores-daily': ['Wipe kitchen counters', 'Quick tidy of living room', 'Sweep high-traffic pet-hair spots', 'Dishes'],
  'chores-weekly': ['Vacuum all rooms', 'Mop kitchen & bathroom floors', 'Clean pet bowls & bedding', 'Change bed sheets', 'Bathroom deep clean', 'Take out trash & recycling'],
  'chores-monthly': ['Deep clean baseboards', 'Wash dog bedding/blankets', 'Clean behind furniture', 'Replace air filter (pet hair clogs it faster)', 'Clean windows', 'Declutter one area'],
};

async function getUserId() {
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id;
}

export async function seedStarterChoresIfEmpty() {
  const userId = await getUserId();
  if (!userId) return;
  const { count } = await supabase.from('checklist_items').select('id', { count: 'exact', head: true })
    .eq('user_id', userId).in('list_key', Object.keys(CADENCE_PERIOD));
  if (count && count > 0) return; // never overwrite an existing list

  const rows = [];
  Object.entries(STARTER_CHORES).forEach(([listKey, names]) => {
    names.forEach(name => rows.push({ user_id: userId, list_key: listKey, name, archived: false }));
  });
  await supabase.from('checklist_items').insert(rows);
}

export async function listChores() {
  const userId = await getUserId();
  const { data, error } = await supabase
    .from('checklist_items').select('*').eq('user_id', userId).eq('archived', false)
    .in('list_key', Object.keys(CADENCE_PERIOD));
  if (error) throw error;
  return data;
}

/** Most-overdue-first within weekly/monthly lists — genuinely useful
 *  once a period gets missed once or twice, since a flat list doesn't
 *  tell you WHICH thing has gone longest without attention. Daily
 *  items don't get this treatment; "overdue" doesn't mean much within
 *  a single day. */
export async function getLastCompletedDates() {
  const userId = await getUserId();
  const { data, error } = await supabase.from('checklist_completions')
    .select('checklist_item_id, period_marker')
    .eq('user_id', userId).order('period_marker', { ascending: false });
  if (error) throw error;
  const latest = {};
  (data || []).forEach(row => {
    if (!latest[row.checklist_item_id]) latest[row.checklist_item_id] = row.period_marker;
  });
  return latest;
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
