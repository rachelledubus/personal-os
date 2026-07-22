import { supabase } from '../lib/supabaseClient.js';
import { todayStr } from '../utils/date.js';

// ============================================================
// LIFE RHYTHM ENGINE
// Owns exactly one job: turn the weekly template (life_rhythm_blocks)
// into real, dated time_blocks rows for today, without ever asking
// the user to pick a template. This is deliberately dumb and
// deterministic — day of week decides the schedule, nothing else.
//
// This does NOT decide what work happens inside a work block — that's
// dailyExecution.js. This only builds the containers.
// ============================================================

async function getUserId() {
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id;
}

// ---------- Default weekly template (seeded once, then owned by the DB) ----------
// day_of_week matches Date.getDay(): 0 Sun, 1 Mon, ... 6 Sat.
// This is only ever read at seed time — after that, life_rhythm_blocks
// in the database is the source of truth, and this array is inert.
const DEFAULT_WEEKLY_TEMPLATE = [
  // ---- Monday ----
  { day_of_week: 1, title: 'Morning Routine', block_type: 'routine', track: 'personal', start_time: '05:30', end_time: '06:00', sort_order: 1 },
  { day_of_week: 1, title: 'Cycle Class', block_type: 'workout', track: 'personal', start_time: '09:00', end_time: '10:00', sort_order: 2 },
  { day_of_week: 1, title: 'Shower / Recovery', block_type: 'routine', track: 'personal', start_time: '10:00', end_time: '10:30', notes: 'Hair: hydrating shampoo + conditioner', sort_order: 3 },
  { day_of_week: 1, title: 'Breakfast', block_type: 'meal', track: 'personal', start_time: '10:30', end_time: '11:00', sort_order: 4 },
  { day_of_week: 1, title: 'Work Block 1', block_type: 'work', track: 'business', start_time: '11:00', end_time: '14:00', is_work_block: true, sort_order: 5 },
  { day_of_week: 1, title: 'Lunch / Reset', block_type: 'meal', track: 'personal', start_time: '14:00', end_time: '14:30', sort_order: 6 },
  { day_of_week: 1, title: 'Work Block 2', block_type: 'work', track: 'business', start_time: '14:30', end_time: '18:00', is_work_block: true, sort_order: 7 },
  { day_of_week: 1, title: 'Shutdown', block_type: 'routine', track: 'business', start_time: '18:00', end_time: '18:15', sort_order: 8 },
  { day_of_week: 1, title: 'Evening Routine', block_type: 'routine', track: 'personal', start_time: '20:00', end_time: '21:00', sort_order: 9 },

  // ---- Tuesday ----
  // Gym extended from a 30-min "arrival window" to the real ~2hr session
  // length. Everything downstream shifts later by the same +1hr the
  // morning grew, so each block keeps its original duration. Shower
  // window widened to 45min (was already 45min) to comfortably cover a
  // full wash day, not just a rinse — see hair routine note below.
  { day_of_week: 2, title: 'Gym: Upper Body', block_type: 'workout', track: 'personal', start_time: '06:00', end_time: '08:00', notes: 'Full session', sort_order: 1 },
  { day_of_week: 2, title: 'Shower / Recovery', block_type: 'routine', track: 'personal', start_time: '08:00', end_time: '08:45', notes: 'Hair: clarifying shampoo (post-sweat day) — adjust in lifeRhythm.js if this isn\'t your real rotation', sort_order: 2 },
  { day_of_week: 2, title: 'Breakfast', block_type: 'meal', track: 'personal', start_time: '08:45', end_time: '09:15', sort_order: 3 },
  { day_of_week: 2, title: 'Work Block 1', block_type: 'work', track: 'business', start_time: '09:30', end_time: '13:00', is_work_block: true, sort_order: 4 },
  { day_of_week: 2, title: 'Lunch / Reset', block_type: 'meal', track: 'personal', start_time: '13:00', end_time: '13:30', sort_order: 5 },
  { day_of_week: 2, title: 'Work Block 2', block_type: 'work', track: 'business', start_time: '13:30', end_time: '19:00', is_work_block: true, sort_order: 6 },
  { day_of_week: 2, title: 'Shutdown', block_type: 'routine', track: 'business', start_time: '19:00', end_time: '19:15', sort_order: 7 },
  { day_of_week: 2, title: 'Evening Routine', block_type: 'routine', track: 'personal', start_time: '20:00', end_time: '21:00', sort_order: 8 },

  // ---- Wednesday ----
  { day_of_week: 3, title: 'Pilates', block_type: 'workout', track: 'personal', start_time: '07:15', end_time: '08:15', sort_order: 1 },
  { day_of_week: 3, title: 'Shower / Recovery', block_type: 'routine', track: 'personal', start_time: '08:15', end_time: '08:45', notes: 'Hair: rinse / light refresh only', sort_order: 2 },
  { day_of_week: 3, title: 'Breakfast', block_type: 'meal', track: 'personal', start_time: '08:45', end_time: '09:15', sort_order: 3 },
  { day_of_week: 3, title: 'Work Block 1', block_type: 'work', track: 'business', start_time: '09:30', end_time: '13:00', is_work_block: true, sort_order: 4 },
  { day_of_week: 3, title: 'Lunch / Reset', block_type: 'meal', track: 'personal', start_time: '13:00', end_time: '13:30', sort_order: 5 },
  { day_of_week: 3, title: 'Work Block 2', block_type: 'work', track: 'business', start_time: '13:30', end_time: '18:00', is_work_block: true, sort_order: 6 },
  { day_of_week: 3, title: 'Shutdown', block_type: 'routine', track: 'business', start_time: '18:00', end_time: '18:15', sort_order: 7 },
  { day_of_week: 3, title: 'Evening Routine', block_type: 'routine', track: 'personal', start_time: '20:00', end_time: '21:00', sort_order: 8 },

  // ---- Thursday ----
  { day_of_week: 4, title: 'Gym: Lower Body / Quads', block_type: 'workout', track: 'personal', start_time: '06:00', end_time: '08:00', notes: 'Full session', sort_order: 1 },
  { day_of_week: 4, title: 'Shower / Recovery', block_type: 'routine', track: 'personal', start_time: '08:00', end_time: '08:45', notes: 'Hair: clarifying shampoo (post-sweat day) — adjust in lifeRhythm.js if this isn\'t your real rotation', sort_order: 2 },
  { day_of_week: 4, title: 'Breakfast', block_type: 'meal', track: 'personal', start_time: '08:45', end_time: '09:15', sort_order: 3 },
  { day_of_week: 4, title: 'Work Block 1', block_type: 'work', track: 'business', start_time: '09:30', end_time: '13:00', is_work_block: true, sort_order: 4 },
  { day_of_week: 4, title: 'Lunch / Reset', block_type: 'meal', track: 'personal', start_time: '13:00', end_time: '13:30', sort_order: 5 },
  { day_of_week: 4, title: 'Work Block 2', block_type: 'work', track: 'business', start_time: '13:30', end_time: '19:00', is_work_block: true, sort_order: 6 },
  { day_of_week: 4, title: 'Shutdown', block_type: 'routine', track: 'business', start_time: '19:00', end_time: '19:15', sort_order: 7 },
  { day_of_week: 4, title: 'Evening Routine', block_type: 'routine', track: 'personal', start_time: '20:00', end_time: '21:00', sort_order: 8 },

  // ---- Friday: Business + Life Admin day ----
  { day_of_week: 5, title: 'Morning Routine', block_type: 'routine', track: 'personal', start_time: '07:00', end_time: '08:00', sort_order: 1 },
  { day_of_week: 5, title: 'Business + Life Admin Block', block_type: 'work', track: 'business', start_time: '09:00', end_time: '16:00', is_work_block: true, notes: 'Weekly review, CRM cleanup, admin, life admin errands', sort_order: 2 },
  { day_of_week: 5, title: 'Evening Routine', block_type: 'routine', track: 'personal', start_time: '20:00', end_time: '21:00', sort_order: 3 },

  // ---- Saturday: Personal/life day ----
  { day_of_week: 6, title: 'Posterior Chain Workout', block_type: 'workout', track: 'personal', start_time: '08:00', end_time: '10:00', notes: 'Full session', sort_order: 1 },
  { day_of_week: 6, title: 'Shower / Recovery', block_type: 'routine', track: 'personal', start_time: '10:00', end_time: '11:00', notes: 'Hair: deep conditioner / mask day — most time available this day', sort_order: 2 },
  { day_of_week: 6, title: 'Personal / Life Day', block_type: 'personal', track: 'personal', start_time: null, end_time: null, sort_order: 3 },

  // ---- Sunday: Weekly reset ----
  { day_of_week: 0, title: 'Meal Planning', block_type: 'reset', track: 'personal', start_time: null, end_time: null, sort_order: 1 },
  { day_of_week: 0, title: 'Grocery Planning', block_type: 'reset', track: 'personal', start_time: null, end_time: null, sort_order: 2 },
  { day_of_week: 0, title: 'Laundry', block_type: 'reset', track: 'personal', start_time: null, end_time: null, sort_order: 3 },
  { day_of_week: 0, title: 'Home Reset', block_type: 'reset', track: 'personal', start_time: null, end_time: null, sort_order: 4 },
  { day_of_week: 0, title: 'Upcoming Week Preparation', block_type: 'reset', track: 'personal', start_time: null, end_time: null, sort_order: 5 },
];

// ---------- Template CRUD (for a future settings/editor screen) ----------

export async function listLifeRhythmTemplate() {
  const userId = await getUserId();
  const { data, error } = await supabase
    .from('life_rhythm_blocks').select('*')
    .eq('user_id', userId).order('day_of_week').order('sort_order');
  if (error) throw error;
  return data;
}

export async function addLifeRhythmBlock(fields) {
  const userId = await getUserId();
  const { error } = await supabase.from('life_rhythm_blocks').insert({ ...fields, user_id: userId });
  if (error) throw error;
}

export async function updateLifeRhythmBlock(id, fields) {
  const { error } = await supabase.from('life_rhythm_blocks').update(fields).eq('id', id);
  if (error) throw error;
}

export async function deleteLifeRhythmBlock(id) {
  const { error } = await supabase.from('life_rhythm_blocks').delete().eq('id', id);
  if (error) throw error;
}

// Transition-point default steps (Area 3) — applied by title at seed
// time so the same steps don't need repeating across every day's
// entry in DEFAULT_WEEKLY_TEMPLATE above. Editable per-day afterward
// from the Today page itself (edits the template, not just today).
const DEFAULT_TRANSITION_STEPS = {
  'Morning Routine': ['Take meds', 'Splash water on face / get dressed', 'Grab water bottle'],
  'Shutdown': ['Close laptop', 'Write down one thing for tomorrow', 'Tidy desk'],
  'Evening Routine': ['Wash face', 'Brush teeth', 'Take meds', 'Set out tomorrow'],
};

/** Seeds the default weekly template exactly once — only runs if this
 *  user has zero life_rhythm_blocks rows. Safe to call on every app
 *  load; it's a no-op after the first successful run. */
export async function seedDefaultLifeRhythmIfEmpty() {
  const userId = await getUserId();
  if (!userId) return;

  const { count, error: countErr } = await supabase
    .from('life_rhythm_blocks').select('id', { count: 'exact', head: true }).eq('user_id', userId);
  if (countErr) throw countErr;
  if (count && count > 0) return; // already seeded, or user has customized — never overwrite

  const rows = DEFAULT_WEEKLY_TEMPLATE.map(b => ({
    ...b, user_id: userId, is_work_block: !!b.is_work_block,
    steps: DEFAULT_TRANSITION_STEPS[b.title] || [],
  }));
  const { error } = await supabase.from('life_rhythm_blocks').insert(rows);
  if (error) throw error;
}

// ---------- The generator: template -> today's real time_blocks ----------

/** Marks a time_block itself done/not-done — independent of any tasks
 *  assigned inside it. This is what lets a routine/workout/meal
 *  container (which isn't a task and never had a checkbox before) get
 *  checked off and disappear from Today, same as a task does. */
export async function toggleBlockCompletion(blockId, completed) {
  const { error } = await supabase.from('time_blocks').update({ completed }).eq('id', blockId);
  if (error) throw error;
}

/** Toggles one step of today's transition checklist — stored on
 *  TODAY's time_block (completed_steps), never the template, so
 *  yesterday's checked steps don't carry over. */
export async function toggleBlockStep(blockId, stepIndex, currentSteps, done) {
  const next = [...currentSteps];
  next[stepIndex] = done;
  const { error } = await supabase.from('time_blocks').update({ completed_steps: next }).eq('id', blockId);
  if (error) throw error;
}

/** Adds a step to the TEMPLATE (source_template_id), so it applies to
 *  every future occurrence of this block, not just today — this is
 *  the "editable without a separate settings screen" path. */
export async function addTransitionStep(templateId, stepLabel) {
  const { data } = await supabase.from('life_rhythm_blocks').select('steps').eq('id', templateId).single();
  const steps = [...(data?.steps || []), stepLabel];
  const { error } = await supabase.from('life_rhythm_blocks').update({ steps }).eq('id', templateId);
  if (error) throw error;
}

export async function removeTransitionStep(templateId, stepIndex) {
  const { data } = await supabase.from('life_rhythm_blocks').select('steps').eq('id', templateId).single();
  const steps = (data?.steps || []).filter((_, i) => i !== stepIndex);
  const { error } = await supabase.from('life_rhythm_blocks').update({ steps }).eq('id', templateId);
  if (error) throw error;
}

export async function generateTodayBlocks() {
  const userId = await getUserId();
  if (!userId) return [];

  const date = todayStr();
  const dayOfWeek = new Date().getDay();

  const [{ data: templates, error: tErr }, { data: existing, error: eErr }] = await Promise.all([
    supabase.from('life_rhythm_blocks').select('*')
      .eq('user_id', userId).eq('day_of_week', dayOfWeek).eq('active', true).order('sort_order'),
    supabase.from('time_blocks').select('id, source_template_id')
      .eq('user_id', userId).eq('block_date', date).eq('auto_generated', true),
  ]);
  if (tErr) throw tErr;
  if (eErr) throw eErr;

  const alreadyGenerated = new Set((existing || []).map(b => b.source_template_id));
  const toInsert = (templates || [])
    .filter(t => !alreadyGenerated.has(t.id))
    .map(t => ({
      user_id: userId,
      title: t.title,
      block_date: date,
      start_time: t.start_time,
      end_time: t.end_time,
      track: t.track,
      is_recurring: true,
      source_template_id: t.id,
      auto_generated: true,
    }));

  if (toInsert.length > 0) {
    const { error: insErr } = await supabase.from('time_blocks').insert(toInsert);
    // Unique index on (source_template_id, block_date) means a race
    // (two tabs generating at once) fails safely here rather than
    // duplicating rows — swallow that specific case, surface anything else.
    if (insErr && insErr.code !== '23505') throw insErr;
  }

  const { data: todayBlocks, error: finalErr } = await supabase
    .from('time_blocks')
    .select('*, life_rhythm_blocks(block_type, is_work_block, notes, steps)')
    .eq('user_id', userId).eq('block_date', date).eq('dismissed', false)
    .order('start_time', { ascending: true, nullsFirst: false });
  if (finalErr) throw finalErr;
  return todayBlocks;
}
