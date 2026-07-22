import { supabase } from '../lib/supabaseClient.js';
import { logActivity } from './goals.js';

// ============================================================
// MISSIONS — the real thing, per the Naming & Terminology Dictionary:
// "An optional higher-level grouping... a meaningful outcome composed
// of multiple tasks." (Not to be confused with the old code-level use
// of "mission" for Today's list items — that's todayItems.js now.)
//
// Deliberately simple: optionally tied to a Goal, holds Tasks. Not
// nested under Milestones — see the migration file for why.
// ============================================================

async function getUserId() {
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id;
}

export async function listMissions({ goalId } = {}) {
  const userId = await getUserId();
  let query = supabase.from('missions').select('*, goals(title)').eq('user_id', userId);
  if (goalId) query = query.eq('goal_id', goalId);
  const { data, error } = await query.order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function addMission({ title, goal_id = null }) {
  const userId = await getUserId();
  const { data, error } = await supabase.from('missions')
    .insert({ user_id: userId, title, goal_id }).select().single();
  if (error) throw error;
  return data;
}

export async function completeMission(id) {
  const { error } = await supabase.from('missions')
    .update({ status: 'completed', completed_at: new Date().toISOString() }).eq('id', id);
  if (error) throw error;
  await logActivity('missions', id, 'completed');
}

export async function deleteMission(id) {
  // Tasks aren't deleted with it — they just lose their mission_id
  // (the FK is ON DELETE SET NULL) and go back to being ordinary
  // standalone tasks, never silently destroyed.
  const { error } = await supabase.from('missions').delete().eq('id', id);
  if (error) throw error;
}

export async function listTasksForMission(missionId) {
  const { data, error } = await supabase.from('tasks')
    .select('*').eq('mission_id', missionId).order('completed').order('created_at');
  if (error) throw error;
  return data;
}

/** Adds a real task, linked to this mission, using the same `tasks`
 *  table every other task lives in — never a second, mission-owned
 *  copy of task data. */
export async function addTaskToMission(missionId, title) {
  const userId = await getUserId();
  const { error } = await supabase.from('tasks').insert({
    user_id: userId, title, mission_id: missionId, capture_type: 'task',
    priority: 'Medium', completed: false,
  });
  if (error) throw error;
}

export async function toggleMissionTask(taskId, completed) {
  const { error } = await supabase.from('tasks').update({ completed }).eq('id', taskId);
  if (error) throw error;
  if (completed) await logActivity('tasks', taskId, 'completed');
}
