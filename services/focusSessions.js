import { supabase } from '../lib/supabaseClient.js';
import { todayStr } from '../utils/date.js';

// ============================================================
// FOCUS SESSIONS
// Exists for one reason: let the hyperfocus nudge on Today tell the
// difference between "this work block ran long because I was actually
// heads-down" and "this work block ran long because I was doing
// literally anything else." Logged only when Focus Mode is actually
// open — no tracking happens anywhere else in the app.
// ============================================================

async function getUserId() {
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id;
}

/** Call when Focus Mode mounts. Returns the new row's id so the caller
 *  can close it out later. */
export async function startFocusSession() {
  const userId = await getUserId();
  if (!userId) return null;
  const { data, error } = await supabase.from('focus_sessions')
    .insert({ user_id: userId, started_at: new Date().toISOString() })
    .select('id').single();
  if (error) throw error;
  return data.id;
}

/** Call when Focus Mode closes (complete or exit) — safe to call more
 *  than once, safe to skip if sessionId is null. */
export async function endFocusSession(sessionId) {
  if (!sessionId) return;
  const { error } = await supabase.from('focus_sessions')
    .update({ ended_at: new Date().toISOString() }).eq('id', sessionId);
  if (error) throw error;
}

/** All of today's sessions, open or closed — used by the hyperfocus
 *  check to see whether Focus Mode actually overlapped a given block's
 *  time window. */
export async function listTodayFocusSessions() {
  const userId = await getUserId();
  if (!userId) return [];
  const { data, error } = await supabase.from('focus_sessions')
    .select('*').eq('user_id', userId).gte('started_at', `${todayStr()}T00:00:00`);
  if (error) throw error;
  return data;
}
