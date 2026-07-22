import { supabase } from '../lib/supabaseClient.js';
import { todayStr } from '../utils/date.js';

// ============================================================
// HABIT REMINDERS — Sora's domain. Flags live on the habit itself,
// not a separate list — one place to manage a habit, not two.
// Two modes:
//   'interval' — AI suggests a cadence (e.g. every ~2hr for water)
//   'times'    — fixed clock times you set yourself (e.g. 9am, 1pm, 6pm)
// Both share last_reminded_at for "already reminded, don't repeat"
// tracking — for 'times' mode, due-checking compares against the most
// recent scheduled time that's already passed today, so one timestamp
// column correctly handles multiple times without a separate log table.
// ============================================================

async function getUserId() {
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id;
}

/** Asks the AI Netlify function for a reasonable reminder interval for
 *  this specific habit. Returns null (never throws) if the AI layer
 *  isn't configured — same "unavailable, not broken" pattern as the
 *  other AI features in the app. */
export async function suggestInterval(habitName) {
  try {
    const res = await fetch('/.netlify/functions/suggest-reminder-interval', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ habitName }),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function setHabitReminderInterval(habitId, intervalMinutes) {
  const { error } = await supabase.from('habits').update({
    remind_periodically: true,
    reminder_mode: 'interval',
    reminder_interval_minutes: intervalMinutes,
    reminder_times: null,
    last_reminded_at: null, // reset so a freshly-enabled reminder doesn't wait out a stale timestamp
  }).eq('id', habitId);
  if (error) throw error;
}

export async function setHabitReminderTimes(habitId, times) {
  const { error } = await supabase.from('habits').update({
    remind_periodically: true,
    reminder_mode: 'times',
    reminder_times: times,
    reminder_interval_minutes: null,
    last_reminded_at: null,
  }).eq('id', habitId);
  if (error) throw error;
}

export async function clearHabitReminder(habitId) {
  const { error } = await supabase.from('habits').update({
    remind_periodically: false,
    reminder_mode: 'interval',
    reminder_interval_minutes: null,
    reminder_times: null,
    last_reminded_at: null,
  }).eq('id', habitId);
  if (error) throw error;
}

function isDue(habit, now) {
  if (habit.reminder_mode === 'times') {
    if (!habit.reminder_times || habit.reminder_times.length === 0) return false;
    // Most recent scheduled time that's already passed today.
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    const passedTimes = habit.reminder_times
      .map(t => { const [h, m] = t.split(':').map(Number); return h * 60 + m; })
      .filter(mins => mins <= nowMinutes);
    if (passedTimes.length === 0) return false;
    const mostRecentSlotMinutes = Math.max(...passedTimes);

    if (!habit.last_reminded_at) return true;
    const lastReminded = new Date(habit.last_reminded_at);
    const lastRemindedMinutes = lastReminded.getHours() * 60 + lastReminded.getMinutes();
    const lastRemindedIsToday = lastReminded.toDateString() === now.toDateString();
    if (!lastRemindedIsToday) return true;
    return lastRemindedMinutes < mostRecentSlotMinutes;
  }

  // 'interval' mode
  if (!habit.last_reminded_at) return true;
  const elapsedMinutes = (now.getTime() - new Date(habit.last_reminded_at).getTime()) / 60000;
  return elapsedMinutes >= (habit.reminder_interval_minutes || 130);
}

/** What Sora actually reads. Picks one at random among anything due,
 *  so multiple due at once doesn't mean multiple bubbles at once. */
export async function getDueReminderHabit() {
  const userId = await getUserId();
  const [{ data: habits }, { data: logs }] = await Promise.all([
    supabase.from('habits').select('*')
      .eq('user_id', userId).eq('archived', false).eq('remind_periodically', true),
    supabase.from('habit_logs').select('habit_id, completed')
      .eq('user_id', userId).eq('log_date', todayStr()).eq('completed', true),
  ]);
  if (!habits || habits.length === 0) return null;

  const doneIds = new Set((logs || []).map(l => l.habit_id));
  const now = new Date();

  const due = habits.filter(h => !doneIds.has(h.id) && isDue(h, now));

  if (due.length === 0) return null;
  return due[Math.floor(Math.random() * due.length)];
}

export async function markHabitReminded(habitId) {
  const { error } = await supabase.from('habits')
    .update({ last_reminded_at: new Date().toISOString() }).eq('id', habitId);
  if (error) throw error;
}

