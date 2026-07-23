import { supabase } from '../lib/supabaseClient.js';
import { todayStr } from '../utils/date.js';

// ============================================================
// PERSONAL MAINTENANCE
// Variable-interval home/personal reminders — distinct from `habits`
// (daily) and `checklist_items` (fixed daily/weekly/monthly chores).
// Behavior is suggest-and-remind, never rigid: nothing here blocks a
// day or forces itself into a time block. Due-soon items surface as a
// nudge (see missions.js integration) the same way pipeline nudges do.
// ============================================================

async function getUserId() {
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id;
}

export async function listMaintenanceItems() {
  const userId = await getUserId();
  const { data, error } = await supabase
    .from('maintenance_items').select('*')
    .eq('user_id', userId).eq('active', true)
    .order('next_due_date', { ascending: true, nullsFirst: false });
  if (error) throw error;
  return data;
}

export async function addMaintenanceItem(fields) {
  const userId = await getUserId();
  const { error } = await supabase.from('maintenance_items').insert({ ...fields, user_id: userId });
  if (error) throw error;
}

export async function updateMaintenanceItem(id, fields) {
  const { error } = await supabase.from('maintenance_items').update(fields).eq('id', id);
  if (error) throw error;
}

/** Marks done today and rolls next_due_date forward by interval_days,
 *  if it has one — a one-off reminder (no interval) just gets
 *  archived by setting active=false instead. */
export async function completeMaintenanceItem(id) {
  const { data: item, error: fetchErr } = await supabase.from('maintenance_items').select('*').eq('id', id).single();
  if (fetchErr) throw fetchErr;

  if (!item.interval_days) {
    await supabase.from('maintenance_items').update({ active: false, last_completed_date: todayStr() }).eq('id', id);
    return;
  }
  const next = new Date();
  next.setDate(next.getDate() + item.interval_days);
  await supabase.from('maintenance_items').update({
    last_completed_date: todayStr(),
    next_due_date: next.toISOString().slice(0, 10),
  }).eq('id', id);
}

/** Items due today or within their own reminder_lead_days window —
 *  what the Mission Engine nudge reads. */
export async function listDueSoon() {
  const items = await listMaintenanceItems();
  const today = new Date(todayStr());
  return items.filter(i => {
    if (!i.next_due_date) return false;
    const due = new Date(i.next_due_date);
    const leadMs = (i.reminder_lead_days || 0) * 86400000;
    return due - leadMs <= today;
  });
}

// ---------- Lightweight pattern suggestion ----------
// Looks at activity_log for a recurring weekday pattern on a given
// source (e.g. someone completing "Grocery Planning" via the Life
// Rhythm Sunday container three weeks running) and, if there's no
// matching maintenance_item already tracking it, suggests formalizing
// it. Deliberately simple and transparent — a direct read of recent
// history, not a black-box model, matching how the pipeline nudge in
// missions.js already works.
export async function getPatternSuggestions() {
  const userId = await getUserId();
  if (!userId) return [];

  const fourWeeksAgo = new Date();
  fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);

  const { data: logs, error } = await supabase
    .from('activity_log').select('*')
    .eq('user_id', userId).eq('event_type', 'completed')
    .gte('event_date', fourWeeksAgo.toISOString().slice(0, 10));
  if (error) throw error;
  if (!logs || logs.length === 0) return [];

  // Group by (source_table, source_id, weekday) and count occurrences.
  const groups = {};
  logs.forEach(l => {
    const weekday = new Date(l.event_date).getDay();
    const key = `${l.source_table}-${l.source_id}-${weekday}`;
    groups[key] ||= { source_table: l.source_table, source_id: l.source_id, weekday, count: 0, metadata: l.metadata };
    groups[key].count += 1;
  });

  const { data: existing } = await supabase
    .from('maintenance_items').select('id, title').eq('user_id', userId).eq('active', true);
  const existingTitles = new Set((existing || []).map(m => m.title.toLowerCase()));

  const WEEKDAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  return Object.values(groups)
    .filter(g => g.count >= 3) // same weekday, 3+ times in the last 4 weeks
    .filter(g => !existingTitles.has((g.metadata?.title || g.source_table).toLowerCase()))
    .map(g => ({
      title: g.metadata?.title || g.source_table,
      weekday: WEEKDAY_NAMES[g.weekday],
      count: g.count,
      suggestion: `You've done this on ${WEEKDAY_NAMES[g.weekday]} ${g.count} of the last 4 weeks. Add it as a recurring reminder?`,
    }));
}
