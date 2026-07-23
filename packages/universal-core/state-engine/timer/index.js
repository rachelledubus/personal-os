// Universal-OS Core — Timer state engine (packages/universal-core/state-engine/timer/index.js)
// Personal-OS original file: src/services/timer.js (compatibility shim re-exports this module)
// Purpose: centralize timer presets, custom preset storage, session logging and simple stats.
// Ownership: UNIVERSAL-OS (core) — reusable across OS apps. Import for app-level usage via
// the existing shim at src/services/timer.js to preserve backward compatibility.

import { todayStr } from '../../../../src/utils/date.js';
import * as db from '../../adapters/supabaseAdapter.js';

export const BUILT_IN_PRESETS = [
  { id: 'pomodoro', label: 'Pomodoro', mode: 'countdown', focusMinutes: 25, breakMinutes: 5 },
  { id: 'deep-work', label: 'Deep Work', mode: 'countdown', focusMinutes: 50, breakMinutes: 10 },
  { id: 'short-focus', label: 'Short Focus', mode: 'countdown', focusMinutes: 15, breakMinutes: 3 },
  { id: 'stopwatch', label: 'Open Stopwatch', mode: 'stopwatch', focusMinutes: null, breakMinutes: null },
];

export async function listCustomPresets() {
  const value = await db.getPreference('timer', 'custom_presets');
  return Array.isArray(value) ? value : [];
}

export async function saveCustomPreset(preset) {
  const existing = await listCustomPresets();
  const next = [...existing.filter(p => p.id !== preset.id), preset];
  const userId = await db.getUserId();
  if (!userId) return next;
  await db.upsertPreference(userId, 'timer', 'custom_presets', next);
  return next;
}

export async function deleteCustomPreset(id) {
  const existing = await listCustomPresets();
  const next = existing.filter(p => p.id !== id);
  const userId = await db.getUserId();
  if (!userId) return next;
  await db.upsertPreference(userId, 'timer', 'custom_presets', next);
  return next;
}

export async function logSession({ presetId, presetLabel, mode, plannedSeconds, actualSeconds, completed, missionSourceTable = null, missionSourceId = null, appNamespace = 'personal-os' }) {
  const userId = await db.getUserId();
  if (!userId) return;
  await db.insertActivityLog({
    user_id: userId,
    source_table: 'focus_timer',
    source_id: missionSourceId,
    event_type: completed ? 'session_completed' : 'session_skipped',
    event_date: todayStr(),
    metadata: {
      presetId, presetLabel, mode, plannedSeconds, actualSeconds,
      linkedSourceTable: missionSourceTable,
    },
    app_namespace: appNamespace,
    entity_type: 'focus_session',
  });
}

export async function getTodayStats() {
  const userId = await db.getUserId();
  if (!userId) return { totalSeconds: 0, sessionCount: 0 };
  const data = await db.selectActivityLog({ userId, source_table: 'focus_timer', event_type: 'session_completed', event_date: todayStr() });
  const totalSeconds = (data || []).reduce((sum, row) => sum + (row.metadata?.actualSeconds || 0), 0);
  return { totalSeconds, sessionCount: (data || []).length };
}

export async function getWeeklyTrend() {
  const userId = await db.getUserId();
  if (!userId) return [];
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 6);
  const gte = weekAgo.toISOString().slice(0, 10);
  const data = await db.selectActivityLog({ userId, source_table: 'focus_timer', event_type: 'session_completed', gte_event_date: gte });
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
