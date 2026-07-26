import { supabase } from '../lib/supabaseClient.js';
import { todayStr } from '../utils/date.js';
import { logActivity } from './goals.js';

async function getUserId() {
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id;
}

/** Everything HabitsTab needs for one load: today's habits, which are
 *  already done today, and each habit's current streak. Kept as one
 *  combined function (rather than three separate exports) because the
 *  streak calculation genuinely needs the other two results first —
 *  splitting it further would just make the caller re-sequence the
 *  same three queries. */
export async function loadHabitsData() {
  const userId = await getUserId();
  const { data: habits } = await supabase.from('habits').select('*').eq('user_id', userId).eq('archived', false);
  const { data: logs } = await supabase.from('habit_logs').select('*').eq('user_id', userId).eq('log_date', todayStr());
  const doneIds = new Set((logs || []).filter(l => l.completed).map(l => l.habit_id));

  const { data: allLogs } = await supabase.from('habit_logs').select('habit_id, log_date, completed')
    .eq('user_id', userId).eq('completed', true).order('log_date', { ascending: false }).limit(400);
  const byHabit = {};
  (allLogs || []).forEach(l => (byHabit[l.habit_id] ||= new Set()).add(l.log_date));
  const streaks = {};
  (habits || []).forEach(habit => {
    let count = 0;
    let d = new Date();
    while (byHabit[habit.id]?.has(d.toISOString().slice(0, 10))) {
      count += 1;
      d.setDate(d.getDate() - 1);
    }
    streaks[habit.id] = count;
  });

  return { habits: habits || [], doneIds, streaks };
}

export async function addHabit(name) {
  const userId = await getUserId();
  const { error } = await supabase.from('habits').insert({ user_id: userId, name, archived: false });
  if (error) throw error;
}

/** Soft-delete — sets archived, doesn't drop the row. Matches the
 *  existing pattern (loadHabitsData already filters .eq('archived',
 *  false)) and keeps past habit_logs/streak history intact instead of
 *  cascading a hard delete through it. */
export async function archiveHabit(habitId) {
  const { error } = await supabase.from('habits').update({ archived: true }).eq('id', habitId);
  if (error) throw error;
}

export async function toggleHabitLog(habitId, completed) {
  const userId = await getUserId();
  if (completed) {
    await supabase.from('habit_logs').upsert(
      { user_id: userId, habit_id: habitId, log_date: todayStr(), completed: true },
      { onConflict: 'habit_id,log_date' }
    );
    await logActivity('habits', habitId, 'completed');
  } else {
    await supabase.from('habit_logs').delete().eq('habit_id', habitId).eq('log_date', todayStr());
  }
}
