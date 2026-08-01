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

export async function listHabitSystems() {
  const userId = await getUserId();
  const { data, error } = await supabase.from('habit_systems').select('*')
    .eq('user_id', userId).eq('archived', false).order('sort_order');
  if (error) throw error;
  return data || [];
}

export async function addHabitSystem(name, description = null) {
  const userId = await getUserId();
  const { data, error } = await supabase.from('habit_systems')
    .insert({ user_id: userId, name, description }).select().single();
  if (error) throw error;
  return data;
}

export async function archiveHabitSystem(systemId) {
  // Ungroups its habits rather than orphaning them silently — they
  // fall back to the ungrouped section, same as if they'd never had
  // a system, not deleted or hidden.
  await supabase.from('habits').update({ system_id: null }).eq('system_id', systemId);
  const { error } = await supabase.from('habit_systems').update({ archived: true }).eq('id', systemId);
  if (error) throw error;
}

export async function addHabit(name, systemId = null) {
  const userId = await getUserId();
  const { error } = await supabase.from('habits').insert({ user_id: userId, name, archived: false, system_id: systemId });
  if (error) throw error;
}

export async function moveHabitToSystem(habitId, systemId) {
  const { error } = await supabase.from('habits').update({ system_id: systemId }).eq('id', habitId);
  if (error) throw error;
}

// ============================================================
// STARTER SYSTEMS — three systems, grounded specifically in what's
// actually been said in this project, not generic habit suggestions:
// medication consistency (explicitly named as a recurring struggle),
// solo-agent business momentum (the whole point of Realtor OS), and
// sleep consistency (a real mood-stability lever, not just "good
// sleep hygiene" advice). Deliberately small — 3 systems, 8 habits
// total — so this doesn't recreate the exact overwhelm that made the
// manual version get abandoned. Idempotent: checks by system name,
// safe to click more than once.
// ============================================================

const STARTER_SYSTEMS = [
  {
    name: 'Medication & Health Basics',
    description: 'The things that are easy to lose track of on a busy or low day.',
    habits: ['Take morning medication', 'Drink water', 'Eat something before noon'],
  },
  {
    name: 'Business Momentum',
    description: 'The minimum that keeps the pipeline alive, even on a slow day.',
    habits: ['3 sphere or referral touches today', "Log today's conversations"],
  },
  {
    name: 'Evening Wind-Down',
    description: 'Sleep consistency matters more than most other single things for mood stability.',
    habits: ['Screens off 30 min before bed', 'Consistent bedtime'],
  },
];

export async function generateStarterSystems() {
  const existing = await listHabitSystems();
  const existingNames = new Set(existing.map(s => s.name));

  let systemsCreated = 0, habitsCreated = 0;
  for (const template of STARTER_SYSTEMS) {
    if (existingNames.has(template.name)) continue;
    const system = await addHabitSystem(template.name, template.description);
    systemsCreated += 1;
    for (const habitName of template.habits) {
      await addHabit(habitName, system.id);
      habitsCreated += 1;
    }
  }
  return { systemsCreated, habitsCreated, skipped: STARTER_SYSTEMS.length - systemsCreated };
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
