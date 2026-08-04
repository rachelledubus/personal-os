import { supabase } from '../lib/supabaseClient.js';
import { processActivityEvent } from './guardians.js';

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

// ============================================================
// STARTER GOALS/PROJECTS — same idea as habits.js's
// generateStarterSystems(), same discipline: small, grounded in what
// actually exists rather than inventing new obligations. Both goals
// here connect directly to real, recently-built systems (the
// automation engine that was just debugged into working, the weekly
// review that isn't happening yet) — not aspirational new work.
// Idempotent: checks by goal title, safe to click more than once.
// ============================================================

const STARTER_GOALS = [
  {
    title: 'Get the lead magnet funnels actually generating leads',
    category: 'Business',
    project: {
      title: 'Activate & verify the automation system',
      milestones: [
        'Confirm the test automation actually sent a real email end to end',
        'All 5 lead magnet forms live and submitting correctly on the real website',
        'First 10 real contacts enrolled in a sequence',
      ],
    },
  },
  {
    title: 'Build a sustainable weekly business rhythm',
    category: 'Business',
    project: {
      title: 'Weekly Business Review, actually happening',
      milestones: [
        'Complete the first Weekly Business Review',
        'Two consecutive weeks of a completed review',
      ],
    },
  },
];

export async function generateStarterGoals() {
  const userId = await getUserId();
  const { data: existingGoals } = await supabase.from('goals').select('title').eq('user_id', userId);
  const existingTitles = new Set((existingGoals || []).map(g => g.title));

  let goalsCreated = 0, projectsCreated = 0, milestonesCreated = 0;
  for (const template of STARTER_GOALS) {
    if (existingTitles.has(template.title)) continue;
    const goal = await addGoal({ title: template.title, category: template.category });
    goalsCreated += 1;

    const project = await addProject({ title: template.project.title, goal_id: goal.id, status: 'Active' });
    projectsCreated += 1;

    for (const milestoneTitle of template.project.milestones) {
      await addMilestone({ project_id: project.id, title: milestoneTitle });
      milestonesCreated += 1;
    }
  }
  return { goalsCreated, projectsCreated, milestonesCreated, skipped: STARTER_GOALS.length - goalsCreated };
}

export async function updateGoal(id, fields) {
  const { error } = await supabase.from('goals').update({ ...fields, updated_at: new Date().toISOString() }).eq('id', id);
  if (error) throw error;
}

export async function deleteGoal(id) {
  const { error } = await supabase.from('goals').delete().eq('id', id);
  if (error) throw error;
}

export async function bulkDeleteGoals(ids) {
  if (ids.length === 0) return;
  const { error } = await supabase.from('goals').delete().in('id', ids);
  if (error) throw error;
}

/** The one real "this goal is done" action — separate from the generic
 *  updateGoal() so this specific, meaningful transition always logs,
 *  regardless of what other partial edits updateGoal gets used for. */
export async function markGoalAchieved(id) {
  const { error } = await supabase.from('goals')
    .update({ status: 'Achieved', updated_at: new Date().toISOString() }).eq('id', id);
  if (error) throw error;
  await logActivity('goals', id, 'completed');
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

export async function deleteProject(id) {
  const { error } = await supabase.from('projects').delete().eq('id', id);
  if (error) throw error;
}

export async function bulkDeleteProjects(ids) {
  if (ids.length === 0) return;
  const { error } = await supabase.from('projects').delete().in('id', ids);
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
// Also doubles as roadmap sub-tasks (roadmapId) — same table, same
// checkbox pattern, just a third optional parent alongside
// project_id/goal_id.
export async function listMilestones({ projectId, goalId, roadmapId }) {
  const userId = await getUserId();
  let q = supabase.from('milestones').select('*').eq('user_id', userId).order('sort_order');
  if (projectId) q = q.eq('project_id', projectId);
  if (goalId) q = q.eq('goal_id', goalId);
  if (roadmapId) q = q.eq('roadmap_item_id', roadmapId);
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

export async function updateMilestone(id, title) {
  const { error } = await supabase.from('milestones').update({ title }).eq('id', id);
  if (error) throw error;
}

export async function deleteMilestone(id) {
  const { error } = await supabase.from('milestones').delete().eq('id', id);
  if (error) throw error;
}

export async function listMilestoneSteps(milestoneId) {
  const userId = await getUserId();
  const { data, error } = await supabase.from('milestone_steps').select('*')
    .eq('user_id', userId).eq('milestone_id', milestoneId).order('sort_order');
  if (error) throw error;
  return data || [];
}

export async function addMilestoneStep(milestoneId, title, sortOrder = 0) {
  const userId = await getUserId();
  const { error } = await supabase.from('milestone_steps').insert({
    user_id: userId, milestone_id: milestoneId, title, sort_order: sortOrder,
  });
  if (error) throw error;
}

export async function toggleMilestoneStep(id, completed) {
  const { error } = await supabase.from('milestone_steps').update({ completed }).eq('id', id);
  if (error) throw error;
}

export async function deleteMilestoneStep(id) {
  const { error } = await supabase.from('milestone_steps').delete().eq('id', id);
  if (error) throw error;
}

// ---------- Roadmap items (link_to only — status/phase already
// managed inline where roadmap items are listed) ----------
export async function updateRoadmapLink(id, linkTo) {
  const { error } = await supabase.from('roadmap_items').update({ link_to: linkTo }).eq('id', id);
  if (error) throw error;
}

export async function updateRoadmapTitle(id, title) {
  const { error } = await supabase.from('roadmap_items').update({ title }).eq('id', id);
  if (error) throw error;
}

// ---------- Activity log (generic history — see migration for why) ----------
export async function logActivity(sourceTable, sourceId, eventType, metadata = {}) {
  const userId = await getUserId();
  if (!userId) return;
  await supabase.from('activity_log').insert({
    user_id: userId, source_table: sourceTable, source_id: sourceId, event_type: eventType, metadata,
  });
  // Guardian event system's landing point — see guardians.js for why
  // this is a direct call rather than a real pub/sub. Fire-and-forget:
  // a Guardian XP hiccup should never surface as an error on whatever
  // real action (task completion, interaction log) triggered this.
  processActivityEvent(sourceTable, sourceId, eventType).catch(() => {});
}
