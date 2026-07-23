import { supabase } from '../lib/supabaseClient.js';
import { getCurrentEnergy } from './energyIntelligence.js';
import { moveTaskToBlock } from './dailyExecution.js';
import { addDevLogEntry } from './devMemory.js';

// ============================================================
// AI OPERATOR (Phase 1: on-demand, propose-then-confirm)
// This is deliberately NOT autonomous by default — it proposes, the
// user applies or dismisses, and either way it's logged to
// ai_decisions. That log is what a later, more autonomous phase would
// train its judgment on: whether proposals actually get accepted.
//
// Full autonomy (auto-apply without confirmation) is a real switch,
// off by default — see setAutonomyLevel(). Nothing in this file
// checks that flag yet; it's here so turning it on later is a
// preference change, not a rebuild.
// ============================================================

async function getUserId() {
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id;
}

async function buildTodaySnapshot() {
  const userId = await getUserId();
  const { data: tasks, error } = await supabase
    .from('tasks').select('id, title, priority, energy_type, due_date, estimated_minutes, time_blocks!tasks_time_block_id_fkey(title, block_date)')
    .eq('user_id', userId).eq('completed', false).not('time_block_id', 'is', null);
  if (error) throw error;

  const today = new Date().toISOString().slice(0, 10);
  const todayTasks = (tasks || []).filter(t => t.time_blocks?.block_date === today);
  const energy = await getCurrentEnergy();

  return {
    energyLevel: energy?.energy_level || 'unknown',
    tasks: todayTasks.map(t => ({
      id: t.id, title: t.title, priority: t.priority, energy_type: t.energy_type,
      due_date: t.due_date, estimated_minutes: t.estimated_minutes, block: t.time_blocks?.title,
    })),
  };
}

/** Asks the AI operator for a proposal — does NOT change anything.
 *  Returns { summary, actions } or null if the function isn't
 *  deployed/configured (same graceful-degrade pattern as capture.js). */
export async function requestReplan(requestText) {
  const snapshot = await buildTodaySnapshot();
  try {
    const res = await fetch('/.netlify/functions/ai-replan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ request: requestText, snapshot }),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

/** Applies a proposal the user has explicitly confirmed. Logs the
 *  proposal itself as an ai_decisions row (decision_type 'ai_replan')
 *  marked accepted, plus lets each individual action be traced back
 *  to it. Unassigning uses the same moveTaskToBlock the manual drag
 *  UI uses — one code path for "a task moved today," whether a human
 *  or the AI did it. */
export async function applyReplan(requestText, proposal) {
  const userId = await getUserId();

  const { data: decision, error } = await supabase.from('ai_decisions').insert({
    user_id: userId,
    decision_type: 'ai_replan',
    reasoning: proposal.summary,
    inputs_snapshot: { request: requestText, actions: proposal.actions },
    user_response: 'accepted',
    responded_at: new Date().toISOString(),
  }).select().single();
  if (error) throw error;

  for (const action of proposal.actions || []) {
    if (action.action === 'unassign') {
      await moveTaskToBlock(action.task_id, null);
    }
    // 'deprioritize' and 'keep' don't move the task — they're
    // informational for now (surfaced in the summary), since actually
    // re-sorting within a block needs manual reordering support the
    // UI doesn't have yet. Left as an honest gap rather than faked.
  }

  return decision;
}

export async function listRecentDecisions(limit = 20) {
  const userId = await getUserId();
  const { data, error } = await supabase
    .from('ai_decisions').select('*').eq('user_id', userId)
    .order('proposed_at', { ascending: false }).limit(limit);
  if (error) throw error;
  return data;
}

/** Stored in user_preferences (category 'ai_operator', key
 *  'autonomy_level') — the seam for a future "just do it, don't ask"
 *  mode once the decision log shows the proposals are trustworthy. */
export async function setAutonomyLevel(level /* 'confirm' | 'auto' */) {
  const userId = await getUserId();
  await supabase.from('user_preferences').upsert({
    user_id: userId, category: 'ai_operator', key: 'autonomy_level', value: { level },
  }, { onConflict: 'user_id,category,key' });
  await addDevLogEntry('config', `AI autonomy set to "${level}"`,
    level === 'auto'
      ? 'Overdue follow-up drafts now generate automatically, and repurposed content auto-marks as published.'
      : 'AI proposes, waits for confirmation, same as before.');
}

export async function getAutonomyLevel() {
  const userId = await getUserId();
  const { data } = await supabase
    .from('user_preferences').select('value').eq('user_id', userId)
    .eq('category', 'ai_operator').eq('key', 'autonomy_level').maybeSingle();
  return data?.value?.level || 'confirm';
}
