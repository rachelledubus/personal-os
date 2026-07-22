import { supabase } from '../lib/supabaseClient.js';

// ============================================================
// JOURNAL TRACKERS — read-only aggregation layer for the bullet-
// journal-style Journal tab. Every function here reads data that
// already exists elsewhere (habits, energy check-ins, workouts,
// weekly resets, business activity) — nothing is entered here,
// nothing is duplicated. This file only shapes existing data into
// the day-grid / month-summary form the Journal UI renders.
// ============================================================

async function getUserId() {
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id;
}

function daysInMonth(year, month) {
  return new Date(year, month, 0).getDate(); // month is 1-indexed here
}

function monthRange(year, month) {
  const start = `${year}-${String(month).padStart(2, '0')}-01`;
  const end = `${year}-${String(month).padStart(2, '0')}-${String(daysInMonth(year, month)).padStart(2, '0')}`;
  return { start, end };
}

// ---------- Grid trackers (one square per day) ----------

/** One grid per active habit: { id, name, days: { 1: true, 2: false, ... } } */
export async function getHabitGridData(year, month) {
  const userId = await getUserId();
  const { start, end } = monthRange(year, month);
  const [{ data: habits }, { data: logs }] = await Promise.all([
    supabase.from('habits').select('id, name').eq('user_id', userId).eq('archived', false),
    supabase.from('habit_logs').select('habit_id, log_date, completed')
      .eq('user_id', userId).eq('completed', true).gte('log_date', start).lte('log_date', end),
  ]);
  if (!habits) return [];

  const byHabit = {};
  (logs || []).forEach(l => (byHabit[l.habit_id] ||= new Set()).add(Number(l.log_date.slice(-2))));

  return habits.map(h => {
    const days = {};
    for (let d = 1; d <= daysInMonth(year, month); d++) days[d] = byHabit[h.id]?.has(d) || false;
    return { id: h.id, name: h.name, days };
  });
}

/** { 1: energyLevel|null, 2: ..., ... } — energy_level is whatever
 *  scale the check-in already uses, passed through as-is for the UI
 *  to color-map, not reinterpreted here. */
export async function getMoodGridData(year, month) {
  const userId = await getUserId();
  const { start, end } = monthRange(year, month);
  const { data } = await supabase.from('energy_logs').select('log_date, energy_level')
    .eq('user_id', userId).gte('log_date', start).lte('log_date', end);

  const days = {};
  for (let d = 1; d <= daysInMonth(year, month); d++) days[d] = null;
  (data || []).forEach(l => { days[Number(l.log_date.slice(-2))] = l.energy_level; });
  return days;
}

/** { 1: true, 2: false, ... } — any workout logged that day. */
export async function getWorkoutGridData(year, month) {
  const userId = await getUserId();
  const { start, end } = monthRange(year, month);
  const { data } = await supabase.from('workouts').select('workout_date')
    .eq('user_id', userId).gte('workout_date', start).lte('workout_date', end);

  const days = {};
  for (let d = 1; d <= daysInMonth(year, month); d++) days[d] = false;
  (data || []).forEach(w => { days[Number(w.workout_date.slice(-2))] = true; });
  return days;
}

/** Weekly resets land on specific Mondays, not every day — sparse by
 *  nature, the grid will mostly be empty and that's correct, not a bug. */
export async function getWeeklyResetGridData(year, month) {
  const userId = await getUserId();
  const { start, end } = monthRange(year, month);
  const { data } = await supabase.from('prompt_log').select('period_marker, prompt_type')
    .eq('user_id', userId).eq('completed', true).eq('prompt_type', 'weekly_reset')
    .gte('period_marker', start).lte('period_marker', end);

  const days = {};
  for (let d = 1; d <= daysInMonth(year, month); d++) days[d] = false;
  (data || []).forEach(p => { days[Number(p.period_marker.slice(-2))] = true; });
  return days;
}

// ---------- Summary cards (month totals + comparison to last month) ----------

async function countInRange(table, dateColumn, start, end, extraFilters = {}) {
  const userId = await getUserId();
  let query = supabase.from(table).select('id', { count: 'exact', head: true })
    .eq('user_id', userId).gte(dateColumn, start).lte(dateColumn, end);
  Object.entries(extraFilters).forEach(([k, v]) => { query = query.eq(k, v); });
  const { count } = await query;
  return count || 0;
}

function prevMonth(year, month) {
  return month === 1 ? { year: year - 1, month: 12 } : { year, month: month - 1 };
}

async function withComparison(table, dateColumn, year, month, extraFilters = {}) {
  const { start, end } = monthRange(year, month);
  const prev = prevMonth(year, month);
  const prevRange = monthRange(prev.year, prev.month);
  const [current, previous] = await Promise.all([
    countInRange(table, dateColumn, start, end, extraFilters),
    countInRange(table, dateColumn, prevRange.start, prevRange.end, extraFilters),
  ]);
  return { current, previous };
}

export async function getBusinessSummary(year, month) {
  const [interactions, contentPublished, transactionsClosed] = await Promise.all([
    withComparison('interactions', 'occurred_at', year, month),
    withComparison('content_items', 'published_date', year, month, { status: 'published' }),
    withComparison('transactions', 'closing_date', year, month),
  ]);
  return { interactions, contentPublished, transactionsClosed };
}

export async function getFocusTimeSummary(year, month) {
  const userId = await getUserId();
  const { start, end } = monthRange(year, month);
  const prev = prevMonth(year, month);
  const prevRange = monthRange(prev.year, prev.month);

  const [{ data: current }, { data: previous }] = await Promise.all([
    supabase.from('focus_sessions').select('started_at, ended_at')
      .eq('user_id', userId).gte('started_at', `${start}T00:00:00`).lte('started_at', `${end}T23:59:59`),
    supabase.from('focus_sessions').select('started_at, ended_at')
      .eq('user_id', userId).gte('started_at', `${prevRange.start}T00:00:00`).lte('started_at', `${prevRange.end}T23:59:59`),
  ]);

  const totalMinutes = (rows) => (rows || []).reduce((sum, r) => {
    if (!r.ended_at) return sum;
    return sum + (new Date(r.ended_at) - new Date(r.started_at)) / 60000;
  }, 0);

  return { current: Math.round(totalMinutes(current)), previous: Math.round(totalMinutes(previous)) };
}

export async function getChoreCompletionRate(year, month) {
  const userId = await getUserId();
  const { start, end } = monthRange(year, month);
  const [{ data: items }, { data: completions }] = await Promise.all([
    supabase.from('checklist_items').select('id').eq('user_id', userId),
    supabase.from('checklist_completions').select('id, period_marker')
      .eq('user_id', userId).gte('period_marker', start).lte('period_marker', end),
  ]);
  const itemCount = (items || []).length;
  if (itemCount === 0) return null; // nothing to report a rate on
  // Rough rate: completions logged this month vs. items that could
  // have been completed daily across the month — an approximation
  // flagged as such in the UI, not presented as a precise metric.
  const possible = itemCount * daysInMonth(year, month);
  return Math.min(100, Math.round(((completions || []).length / possible) * 100));
}
