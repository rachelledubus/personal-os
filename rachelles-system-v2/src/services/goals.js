import { supabase } from '../lib/supabaseClient.js';

async function getUserId() {
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id;
}

// ---------- Goals ----------
export async function listGoals() {
  const userId = await getUserId();
  const { data, error } = await supabase.from('goals').select('*').eq('user_id', userId).order('target_date', { ascending: true, nullsFirst: false });
  if (error) throw error;
  return data;
}

export async function addGoal(fields) {
  const userId = await getUserId();
  const { data, error } = await supabase.from('goals').insert({ ...fields, user_id: userId }).select().single();
  if (error) throw error;
  await logActivity('goals', data.id, 'created');
  return data;
}

export async function updateGoal(id, fields) {
  const { error } = await supabase.from('goals').update({ ...fields, updated_at: new Date().toISOString() }).eq('id', id);
  if (error) throw error;
}

// ---------- Projects ----------
export async function listProjects(goalId = null) {
  const userId = await getUserId();
  let q = supabase.from('projects').select('*, goals(title)').eq('user_id', userId).order('due_date', { ascending: true, nullsFirst: false });
  if (goalId) q = q.eq('goal_id', goalId);
  const { data, error } = await q;
  if (error) throw error;
  return data;
}

export async function addProject(fields) {
  const userId = await getUserId();
  const { data, error } = await supabase.from('projects').insert({ ...fields, user_id: userId }).select().single();
  if (error) throw error;
  return data;
}

export async function updateProject(id, fields) {
  const { error } = await supabase.from('projects').update({ ...fields, updated_at: new Date().toISOString() }).eq('id', id);
  if (error) throw error;
}

// Tasks that belong to a project — reuses the EXISTING tasks table,
// just filtered by the new nullable project_id column.
export async function listProjectTasks(projectId) {
  const { data, error } = await supabase.from('tasks').select('*').eq('project_id', projectId);
  if (error) throw error;
  return data;
}

// ---------- Milestones ----------
export async function listMilestones({ projectId, goalId }) {
  const userId = await getUserId();
  let q = supabase.from('milestones').select('*').eq('user_id', userId).order('sort_order');
  if (projectId) q = q.eq('project_id', projectId);
  if (goalId) q = q.eq('goal_id', goalId);
  const { data, error } = await q;
  if (error) throw error;
  return data;
}

export async function addMilestone(fields) {
  const userId = await getUserId();
  const { error } = await supabase.from('milestones').insert({ ...fields, user_id: userId });
  if (error) throw error;
}

export async function toggleMilestone(id, completed) {
  const { error } = await supabase.from('milestones')
    .update({ completed, completed_date: completed ? new Date().toISOString().slice(0, 10) : null })
    .eq('id', id);
  if (error) throw error;
}

// ---------- Activity log (generic history — see migration for why) ----------
export async function logActivity(sourceTable, sourceId, eventType, metadata = {}) {
  const userId = await getUserId();
  if (!userId) return;
  await supabase.from('activity_log').insert({
    user_id: userId, source_table: sourceTable, source_id: sourceId, event_type: eventType, metadata,
  });
}
