import { supabase } from '../lib/supabaseClient.js';
import { todayStr } from '../utils/date.js';
import { getPreference, setPreference } from './settings.js';

// ============================================================
// Timer service. Deliberately uses NO new tables:
//   - Session history is written to `activity_log`
//     (source_table='focus_timer', event_type='session_completed'/'session_skipped'),
//     the exact generic history table the foundation migration built
//     for cases like this.
//   - Custom user-created presets are written to `user_preferences`
//     (category='timer', key='custom_presets'), the exact generic
//     settings table built for this.
// This is additive-only against the existing schema — no migration
// required for the timer system.
// ============================================================

async function getUserId() {
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id;
}

export const BUILT_IN_PRESETS = [
  { id: 'pomodoro', label: 'Pomodoro', mode: 'countdown', focusMinutes: 25, breakMinutes: 5 },
  { id: 'deep-work', label: 'Deep Work', mode: 'countdown', focusMinutes: 50, breakMinutes: 10 },
  { id: 'short-focus', label: 'Short Focus', mode: 'countdown', focusMinutes: 15, breakMinutes: 3 },
  { id: 'stopwatch', label: 'Open Stopwatch', mode: 'stopwatch', focusMinutes: null, breakMinutes: null },
];

/** Custom presets live in user_preferences, category 'timer', key 'custom_presets' —
 *  a plain array, so no schema change is ever needed to add another one. */
export async function listCustomPresets() {
  const value = await getPreference('timer', 'custom_presets', []);
  return Array.isArray(value) ? value : [];
}

export async function saveCustomPreset(preset) {
  const existing = await listCustomPresets();
  const next = [...existing.filter(p => p.id !== preset.id), preset];
  await setPreference('timer', 'custom_presets', next);
  return next;
}

export async function deleteCustomPreset(id) {
  const existing = await listCustomPresets();
  const next = existing.filter(p => p.id !== id);
  await setPreference('timer', 'custom_presets', next);
  return next;
}

/** Logs a finished/skipped session. missionSourceTable+missionSourceId
 *  optionally link the session back to whatever Today item it was for,
 *  so time can eventually be attributed per task/project without a new
 *  join table. */
export async function logSession({ presetId, presetLabel, mode, plannedSeconds, actualSeconds, completed, missionSourceTable = null, missionSourceId = null }) {
  const userId = await getUserId();
  if (!userId) return;
  await supabase.from('activity_log').insert({
    user_id: userId,
    source_table: 'focus_timer',
    source_id: missionSourceId,
    event_type: completed ? 'session_completed' : 'session_skipped',
    event_date: todayStr(),
    metadata: {
      presetId, presetLabel, mode, plannedSeconds, actualSeconds,
      linkedSourceTable: missionSourceTable,
    },
  });
}

/** Today's focus stats — total focused seconds + session count, computed
 *  live from activity_log rather than a separate stats table. */
export async function getTodayStats() {
  const userId = await getUserId();
  if (!userId) return { totalSeconds: 0, sessionCount: 0 };
  const { data } = await supabase.from('activity_log').select('metadata')
    .eq('user_id', userId).eq('source_table', 'focus_timer')
    .eq('event_type', 'session_completed').eq('event_date', todayStr());

  const totalSeconds = (data || []).reduce((sum, row) => sum + (row.metadata?.actualSeconds || 0), 0);
  return { totalSeconds, sessionCount: (data || []).length };
}

/** Last 7 days of focused time, grouped by date — powers a small trend
 *  view without a dedicated aggregation table. */
export async function getWeeklyTrend() {
  const userId = await getUserId();
  if (!userId) return [];
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 6);
  const { data } = await supabase.from('activity_log').select('event_date, metadata')
    .eq('user_id', userId).eq('source_table', 'focus_timer').eq('event_type', 'session_completed')
    .gte('event_date', weekAgo.toISOString().slice(0, 10));

  const byDate = {};
  (data || []).forEach(row => {
    byDate[row.event_date] = (byDate[row.event_date] || 0) + (row.metadata?.actualSeconds || 0);
  });

  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    days.push({ date: key, seconds: byDate[key] || 0 });
  }
  return days;
}
