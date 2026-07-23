import { supabase } from '../lib/supabaseClient.js';
import { todayStr } from '../utils/date.js';

// ============================================================
// ENERGY INTELLIGENCE
// Two jobs: (1) let the user log how they're feeling right now, and
// (2) learn from history which task types actually get finished at
// which times, and which tasks keep getting pushed. Both read EXISTING
// data (activity_log, tasks.rollover_count) — nothing duplicated.
// ============================================================

async function getUserId() {
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id;
}

export async function logEnergy(level, notes = null) {
  const userId = await getUserId();
  const { error } = await supabase.from('energy_logs').insert({
    user_id: userId, log_date: todayStr(), energy_level: level, notes,
  });
  if (error) throw error;
}

/** Most recent check-in today, if any — what the assignment engine
 *  reads to adjust today's plan. */
export async function getCurrentEnergy() {
  const userId = await getUserId();
  const { data, error } = await supabase
    .from('energy_logs').select('*').eq('user_id', userId).eq('log_date', todayStr())
    .order('logged_at', { ascending: false }).limit(1).maybeSingle();
  if (error) throw error;
  return data;
}

// ---------- Pattern learning ----------

/** Reads activity_log completions joined against tasks.energy_type to
 *  find which hour-of-day each energy type actually gets finished in
 *  most often. Simple frequency count, not a model — transparent and
 *  cheap, and gets more accurate the more the app is used. */
export async function getBestWorkTimes() {
  const userId = await getUserId();
  const { data: logs, error } = await supabase
    .from('activity_log').select('event_date, created_at, source_id')
    .eq('user_id', userId).eq('source_table', 'tasks').eq('event_type', 'completed');
  if (error) throw error;
  if (!logs || logs.length === 0) return [];

  const taskIds = [...new Set(logs.map(l => l.source_id))];
  const { data: tasks } = await supabase.from('tasks').select('id, energy_type').in('id', taskIds);
  const energyById = Object.fromEntries((tasks || []).map(t => [t.id, t.energy_type]));

  const buckets = {}; // energy_type -> hour -> count
  logs.forEach(l => {
    const type = energyById[l.source_id];
    if (!type) return;
    const hour = new Date(l.created_at).getHours();
    buckets[type] ||= {};
    buckets[type][hour] = (buckets[type][hour] || 0) + 1;
  });

  return Object.entries(buckets).map(([energy_type, hours]) => {
    const bestHour = Object.entries(hours).sort((a, b) => b[1] - a[1])[0];
    return { energy_type, bestHour: bestHour ? Number(bestHour[0]) : null, sampleSize: Object.values(hours).reduce((a, b) => a + b, 0) };
  });
}

/** Tasks pushed forward 3+ times — the "avoided task" signal. Doesn't
 *  guess why, just surfaces it so the user (or the AI operator layer)
 *  can decide what to do about it — break it up, reassign its energy
 *  type, or just delete it. */
export async function getAvoidedTasks() {
  const userId = await getUserId();
  const { data, error } = await supabase
    .from('tasks').select('*').eq('user_id', userId).eq('completed', false).gte('rollover_count', 3)
    .order('rollover_count', { ascending: false });
  if (error) throw error;
  return data;
}

/** Simple completion-rate-by-energy-type summary — "your Deep Focus
 *  tasks get finished 40% of the time vs 85% for Administrative" —
 *  the raw signal a future AI layer reasons over for capacity
 *  planning, not a conclusion drawn here. */
export async function getCompletionPatterns() {
  const userId = await getUserId();
  const { data: tasks, error } = await supabase
    .from('tasks').select('energy_type, completed').eq('user_id', userId).not('energy_type', 'is', null);
  if (error) throw error;

  const byType = {};
  (tasks || []).forEach(t => {
    byType[t.energy_type] ||= { total: 0, completed: 0 };
    byType[t.energy_type].total += 1;
    if (t.completed) byType[t.energy_type].completed += 1;
  });

  return Object.entries(byType).map(([energy_type, stats]) => ({
    energy_type,
    completionRate: stats.total ? Math.round((stats.completed / stats.total) * 100) : null,
    sampleSize: stats.total,
  }));
}
