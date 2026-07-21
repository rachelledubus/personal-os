import { supabase } from '../lib/supabaseClient.js';
import { todayStr } from '../utils/date.js';
import { seedDefaultLifeRhythmIfEmpty, generateTodayBlocks } from './lifeRhythm.js';
import { getCurrentEnergy } from './energyIntelligence.js';
import { logActivity } from './goals.js';

// ============================================================
// DAILY EXECUTION ENGINE
// "What should I do during this block?" — the third layer. Reads
// today's work blocks (built by lifeRhythm.js) and the EXISTING
// `tasks` table (BOS's source of truth), scores incomplete tasks
// (now energy-aware), and assigns them into blocks until each
// block's time is full.
//
// Every assignment is logged to ai_decisions with its reasoning —
// this IS the "AI explains why" layer for the deterministic engine.
// A separate on-demand LLM layer (aiOperator.js) sits on top for
// qualitative replanning a heuristic can't do; this file stays fast,
// free, and fully explainable on its own.
// ============================================================

const PRIORITY_WEIGHT = { Critical: 4, High: 3, Medium: 2, Low: 1 };
const DEFAULT_ESTIMATE_MINUTES = 30;

// When energy is Low, deprioritize demanding work and favor easy
// wins; when High, the reverse. Medium is neutral. This is the whole
// mechanism behind "move the writing task, replace with admin" — no
// task-specific rule needed, it falls out of the scoring.
const ENERGY_ADJUSTMENTS = {
  Low: { 'Deep Focus': -3, Creative: -3, Social: -1, Administrative: 2, 'Low Energy': 3 },
  Medium: {},
  High: { 'Deep Focus': 2, Creative: 2, Social: 1, Administrative: 0, 'Low Energy': -1 },
};

async function getUserId() {
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id;
}

function minutesBetween(start, end) {
  if (!start || !end) return null;
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  return (eh * 60 + em) - (sh * 60 + sm);
}

function daysUntil(dateStr) {
  if (!dateStr) return Infinity;
  const diffMs = new Date(dateStr) - new Date(todayStr());
  return Math.round(diffMs / 86400000);
}

/** Transparent, simple scoring — same philosophy as the Mission
 *  Engine's nudge logic: a direct read of real fields, not a hidden
 *  black box. Higher score = scheduled first. Returns both the score
 *  and the human-readable reasons that produced it, so the caller can
 *  log exactly why without re-deriving anything. */
function scoreTask(task, currentEnergy) {
  const reasons = [];
  let score = PRIORITY_WEIGHT[task.priority] || 2;
  reasons.push(`${task.priority || 'Medium'} priority`);

  const effectiveDue = task.due_date || task.projects?.due_date;
  const due = daysUntil(effectiveDue);
  if (due <= 0) { score += 5; reasons.push('due today or overdue'); }
  else if (due <= 2) { score += 3; reasons.push('due within 2 days'); }
  else if (due <= 7) { score += 1; reasons.push('due this week'); }

  if (task.project_id || task.goal_id) { score += 1; reasons.push('tied to an active goal/project'); }
  if (task.rolled_over_from) { score += 2; reasons.push(`carried forward from ${task.rolled_over_from}`); }

  if (currentEnergy && task.energy_type) {
    const adj = ENERGY_ADJUSTMENTS[currentEnergy]?.[task.energy_type] || 0;
    if (adj !== 0) {
      score += adj;
      reasons.push(`${adj > 0 ? 'favored' : 'deprioritized'} — ${task.energy_type} task, energy is ${currentEnergy}`);
    }
  }

  return { score, reasons };
}

/** Any task still attached to a work block from a PAST date, and
 *  still incomplete, gets pushed forward automatically: unassigned
 *  from that block, its rollover_count incremented (the "avoided
 *  task" signal energyIntelligence.js reads), and left eligible for
 *  today's assignment pass. */
export async function rolloverIncompleteTasks() {
  const userId = await getUserId();
  if (!userId) return;

  const date = todayStr();
  const { data: staleTasks, error } = await supabase
    .from('tasks')
    .select('id, rolled_over_from, rollover_count, time_blocks!inner(block_date)')
    .eq('user_id', userId).eq('completed', false)
    .not('time_block_id', 'is', null)
    .lt('time_blocks.block_date', date);
  if (error) throw error;
  if (!staleTasks || staleTasks.length === 0) return;

  await Promise.all(staleTasks.map(t =>
    supabase.from('tasks').update({
      time_block_id: null,
      rolled_over_from: t.rolled_over_from || t.time_blocks.block_date,
      rollover_count: (t.rollover_count || 0) + 1,
    }).eq('id', t.id)
  ));
}

/** Packs incomplete, unassigned BOS tasks into today's work blocks,
 *  highest score first, greedily filling each block's remaining
 *  minutes. Logs one ai_decisions row per assignment with the
 *  reasoning from scoreTask — this is what makes the assignment
 *  explainable rather than just a sorted list. Tasks that don't fit
 *  anywhere today stay unassigned and roll over naturally tomorrow. */
export async function assignTasksToBlocks(workBlocks) {
  const userId = await getUserId();
  if (!userId || workBlocks.length === 0) return;

  const [{ data: candidates, error }, currentEnergy] = await Promise.all([
    supabase.from('tasks').select('*, projects(due_date)')
      .eq('user_id', userId).eq('completed', false).is('time_block_id', null)
      .order('due_date', { ascending: true, nullsFirst: false }),
    getCurrentEnergy(),
  ]);
  if (error) throw error;
  if (!candidates || candidates.length === 0) return;

  const energyLevel = currentEnergy?.energy_level || null;
  const scored = candidates.map(t => ({ task: t, ...scoreTask(t, energyLevel) }));
  scored.sort((a, b) => b.score - a.score);

  const capacity = workBlocks.map(b => ({
    id: b.id,
    title: b.title,
    remaining: minutesBetween(b.start_time, b.end_time) ?? 180, // untimed work block: generous default
  }));

  const decisionRows = [];
  for (const { task, score, reasons } of scored) {
    const need = task.estimated_minutes || DEFAULT_ESTIMATE_MINUTES;
    const slot = capacity.find(c => c.remaining >= need);
    if (!slot) continue; // doesn't fit anywhere today — left unassigned, rolls over naturally
    slot.remaining -= need;

    await supabase.from('tasks').update({ time_block_id: slot.id }).eq('id', task.id);
    decisionRows.push({
      user_id: userId,
      decision_type: 'task_assignment',
      source_table: 'tasks',
      source_id: task.id,
      reasoning: `Assigned to "${slot.title}": ${reasons.join('; ')}.`,
      inputs_snapshot: { score, energyLevel, estimatedMinutes: need },
    });
  }

  if (decisionRows.length > 0) {
    await supabase.from('ai_decisions').insert(decisionRows);
  }
}

/** Re-runs assignment for whatever's still incomplete today, without
 *  waiting for tomorrow's rollover — this is what an energy check-in
 *  triggers. Unassigns today's incomplete tasks (no rollover_count
 *  bump, it's the same day) and reassigns with the new energy level,
 *  which is the entire mechanism behind "energy dropped -> swap the
 *  writing task for an admin task." */
export async function reassignForEnergyChange() {
  const userId = await getUserId();
  if (!userId) return;

  const date = todayStr();
  const { data: todayTasks, error } = await supabase
    .from('tasks').select('id, time_blocks!inner(block_date)')
    .eq('user_id', userId).eq('completed', false)
    .not('time_block_id', 'is', null).eq('time_blocks.block_date', date);
  if (error) throw error;
  if (todayTasks && todayTasks.length > 0) {
    await Promise.all(todayTasks.map(t => supabase.from('tasks').update({ time_block_id: null }).eq('id', t.id)));
  }

  const { data: blocks, error: bErr } = await supabase
    .from('time_blocks').select('*, life_rhythm_blocks(is_work_block)')
    .eq('user_id', userId).eq('block_date', date);
  if (bErr) throw bErr;
  const workBlocks = (blocks || []).filter(b => b.life_rhythm_blocks?.is_work_block || (b.track === 'business' && !b.auto_generated));
  await assignTasksToBlocks(workBlocks);
}

/** The single entry point the Today page calls. Runs the full
 *  pipeline — seed (once ever) -> generate today's containers ->
 *  roll over stale assignments -> assign fresh ones (energy-aware,
 *  explained) -> return the finished, populated schedule. */
export async function getTodaySchedule() {
  const userId = await getUserId();
  if (!userId) return [];

  await seedDefaultLifeRhythmIfEmpty();
  const blocks = await generateTodayBlocks();
  await rolloverIncompleteTasks();

  const workBlocks = blocks.filter(b => b.life_rhythm_blocks?.is_work_block || (b.track === 'business' && !b.auto_generated));
  await assignTasksToBlocks(workBlocks);

  const { data: tasksByBlock, error } = await supabase
    .from('tasks').select('*')
    .eq('user_id', userId).in('time_block_id', blocks.map(b => b.id).length ? blocks.map(b => b.id) : ['00000000-0000-0000-0000-000000000000']);
  if (error) throw error;

  const tasksMap = {};
  (tasksByBlock || []).forEach(t => {
    (tasksMap[t.time_block_id] ||= []).push(t);
  });

  return blocks.map(b => ({ ...b, tasks: tasksMap[b.id] || [] }));
}

/** Finds the most recent not-yet-responded-to AI decision for a given
 *  source row and records how the user actually responded — the
 *  concrete "learns over time" signal. Safe no-op if there isn't one
 *  (e.g. a task the user assigned manually from scratch). */
async function respondToLatestDecision(sourceTable, sourceId, response) {
  const { data } = await supabase
    .from('ai_decisions').select('id')
    .eq('source_table', sourceTable).eq('source_id', sourceId).is('user_response', null)
    .order('proposed_at', { ascending: false }).limit(1).maybeSingle();
  if (!data) return;
  await supabase.from('ai_decisions').update({ user_response: response, responded_at: new Date().toISOString() }).eq('id', data.id);
}

/** Manual override for "ability to move/reschedule" — drag a task
 *  into a different block, or pull it out to the unassigned pool.
 *  Logs the override against whatever the engine had proposed. */
export async function moveTaskToBlock(taskId, blockId /* null to unassign */) {
  const { error } = await supabase.from('tasks').update({ time_block_id: blockId }).eq('id', taskId);
  if (error) throw error;
  await respondToLatestDecision('tasks', taskId, blockId ? 'edited' : 'rejected');
}

export async function toggleTaskDone(taskId, completed) {
  const { error } = await supabase.from('tasks').update({ completed }).eq('id', taskId);
  if (error) throw error;
  if (completed) {
    await logActivity('tasks', taskId, 'completed');
    await respondToLatestDecision('tasks', taskId, 'accepted');
  }
}
