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
  { day_of_week: 1, title: 'Shower / Recovery', block_type: 'routine', track: 'personal', start_time: '10:00', end_time: '10:30', sort_order: 3 },
  { day_of_week: 1, title: 'Breakfast', block_type: 'meal', track: 'personal', start_time: '10:30', end_time: '11:00', sort_order: 4 },
  { day_of_week: 1, title: 'Work Block 1', block_type: 'work', track: 'business', start_time: '11:00', end_time: '14:00', is_work_block: true, sort_order: 5 },
  { day_of_week: 1, title: 'Lunch / Reset', block_type: 'meal', track: 'personal', start_time: '14:00', end_time: '14:30', sort_order: 6 },
  { day_of_week: 1, title: 'Work Block 2', block_type: 'work', track: 'business', start_time: '14:30', end_time: '18:00', is_work_block: true, sort_order: 7 },
  { day_of_week: 1, title: 'Shutdown', block_type: 'routine', track: 'business', start_time: '18:00', end_time: '18:15', sort_order: 8 },
  { day_of_week: 1, title: 'Evening Routine', block_type: 'routine', track: 'personal', start_time: '20:00', end_time: '21:00', sort_order: 9 },

  // ---- Tuesday ----
  { day_of_week: 2, title: 'Gym: Upper Body', block_type: 'workout', track: 'personal', start_time: '06:00', end_time: '06:30', notes: 'Target arrival window', sort_order: 1 },
  { day_of_week: 2, title: 'Shower / Recovery', block_type: 'routine', track: 'personal', start_time: '07:15', end_time: '07:45', sort_order: 2 },
  { day_of_week: 2, title: 'Breakfast', block_type: 'meal', track: 'personal', start_time: '07:45', end_time: '08:15', sort_order: 3 },
  { day_of_week: 2, title: 'Work Block 1', block_type: 'work', track: 'business', start_time: '08:30', end_time: '12:00', is_work_block: true, sort_order: 4 },
  { day_of_week: 2, title: 'Lunch / Reset', block_type: 'meal', track: 'personal', start_time: '12:00', end_time: '12:30', sort_order: 5 },
  { day_of_week: 2, title: 'Work Block 2', block_type: 'work', track: 'business', start_time: '12:30', end_time: '18:00', is_work_block: true, sort_order: 6 },
  { day_of_week: 2, title: 'Shutdown', block_type: 'routine', track: 'business', start_time: '18:00', end_time: '18:15', sort_order: 7 },
  { day_of_week: 2, title: 'Evening Routine', block_type: 'routine', track: 'personal', start_time: '20:00', end_time: '21:00', sort_order: 8 },

  // ---- Wednesday ----
  { day_of_week: 3, title: 'Pilates', block_type: 'workout', track: 'personal', start_time: '07:15', end_time: '08:15', sort_order: 1 },
  { day_of_week: 3, title: 'Shower / Recovery', block_type: 'routine', track: 'personal', start_time: '08:15', end_time: '08:45', sort_order: 2 },
  { day_of_week: 3, title: 'Breakfast', block_type: 'meal', track: 'personal', start_time: '08:45', end_time: '09:15', sort_order: 3 },
  { day_of_week: 3, title: 'Work Block 1', block_type: 'work', track: 'business', start_time: '09:30', end_time: '13:00', is_work_block: true, sort_order: 4 },
  { day_of_week: 3, title: 'Lunch / Reset', block_type: 'meal', track: 'personal', start_time: '13:00', end_time: '13:30', sort_order: 5 },
  { day_of_week: 3, title: 'Work Block 2', block_type: 'work', track: 'business', start_time: '13:30', end_time: '18:00', is_work_block: true, sort_order: 6 },
  { day_of_week: 3, title: 'Shutdown', block_type: 'routine', track: 'business', start_time: '18:00', end_time: '18:15', sort_order: 7 },
  { day_of_week: 3, title: 'Evening Routine', block_type: 'routine', track: 'personal', start_time: '20:00', end_time: '21:00', sort_order: 8 },

  // ---- Thursday ----
  { day_of_week: 4, title: 'Gym: Lower Body / Quads', block_type: 'workout', track: 'personal', start_time: '06:00', end_time: '06:30', notes: 'Target arrival window', sort_order: 1 },
  { day_of_week: 4, title: 'Shower / Recovery', block_type: 'routine', track: 'personal', start_time: '07:15', end_time: '07:45', sort_order: 2 },
  { day_of_week: 4, title: 'Breakfast', block_type: 'meal', track: 'personal', start_time: '07:45', end_time: '08:15', sort_order: 3 },
  { day_of_week: 4, title: 'Work Block 1', block_type: 'work', track: 'business', start_time: '08:30', end_time: '12:00', is_work_block: true, sort_order: 4 },
  { day_of_week: 4, title: 'Lunch / Reset', block_type: 'meal', track: 'personal', start_time: '12:00', end_time: '12:30', sort_order: 5 },
  { day_of_week: 4, title: 'Work Block 2', block_type: 'work', track: 'business', start_time: '12:30', end_time: '18:00', is_work_block: true, sort_order: 6 },
  { day_of_week: 4, title: 'Shutdown', block_type: 'routine', track: 'business', start_time: '18:00', end_time: '18:15', sort_order: 7 },
  { day_of_week: 4, title: 'Evening Routine', block_type: 'routine', track: 'personal', start_time: '20:00', end_time: '21:00', sort_order: 8 },

  // ---- Friday: Business + Life Admin day ----
  { day_of_week: 5, title: 'Morning Routine', block_type: 'routine', track: 'personal', start_time: '07:00', end_time: '08:00', sort_order: 1 },
  { day_of_week: 5, title: 'Business + Life Admin Block', block_type: 'work', track: 'business', start_time: '09:00', end_time: '16:00', is_work_block: true, notes: 'Weekly review, CRM cleanup, admin, life admin errands', sort_order: 2 },
  { day_of_week: 5, title: 'Evening Routine', block_type: 'routine', track: 'personal', start_time: '20:00', end_time: '21:00', sort_order: 3 },

  // ---- Saturday: Personal/life day ----
  { day_of_week: 6, title: 'Posterior Chain Workout', block_type: 'workout', track: 'personal', start_time: '08:00', end_time: '09:00', sort_order: 1 },
  { day_of_week: 6, title: 'Personal / Life Day', block_type: 'personal', track: 'personal', start_time: null, end_time: null, sort_order: 2 },

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

  const rows = DEFAULT_WEEKLY_TEMPLATE.map(b => ({ ...b, user_id: userId, is_work_block: !!b.is_work_block }));
  const { error } = await supabase.from('life_rhythm_blocks').insert(rows);
  if (error) throw error;
}

// ---------- The generator: template -> today's real time_blocks ----------

/** Materializes today's recurring containers into time_blocks, if they
 *  don't already exist. Idempotent — safe to call every time the app
 *  loads, every tab, every refresh. Returns today's full time_blocks
 *  list (rhythm-generated + any manual ones), ordered by start time. */
/** Marks a time_block itself done/not-done — independent of any tasks
 *  assigned inside it. This is what lets a routine/workout/meal
 *  container (which isn't a task and never had a checkbox before) get
 *  checked off and disappear from Today, same as a task does. */
export async function toggleBlockCompletion(blockId, completed) {
  const { error } = await supabase.from('time_blocks').update({ completed }).eq('id', blockId);
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
    .select('*, life_rhythm_blocks(block_type, is_work_block, notes)')
    .eq('user_id', userId).eq('block_date', date)
    .order('start_time', { ascending: true, nullsFirst: false });
  if (finalErr) throw finalErr;
  return todayBlocks;
}
