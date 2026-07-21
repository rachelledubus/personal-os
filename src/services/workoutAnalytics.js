import { supabase } from '../lib/supabaseClient.js';
import { todayStr } from '../utils/date.js';

// ============================================================
// FITNESS INTELLIGENCE
// Turns logged workouts into usable history. Every analytic here is a
// deterministic calculation over real rows — same philosophy as the
// rest of the app's "nudges": transparent math, not a black box.
// Estimated 1RM uses the Epley formula (weight * (1 + reps/30)), the
// standard, simple approximation — good enough for trend tracking,
// not meant to be exact.
// ============================================================

async function getUserId() {
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id;
}

function estimated1RM(weight, reps) {
  if (!weight || !reps) return 0;
  return weight * (1 + reps / 30);
}

// ---------- Exercise templates (the fixed list per lifting day) ----------

const DEFAULT_UPPER_BODY_TEMPLATE = [
  { exercise_name: 'Incline DB or Barbell Press', target_sets: 3, target_reps: '6-8' },
  { exercise_name: 'Chest-Supported Row', target_sets: 3, target_reps: '8-10' },
  { exercise_name: 'Standing DB Shoulder Press', target_sets: 3, target_reps: '8-10' },
  { exercise_name: 'DB Lateral Raise', target_sets: 3, target_reps: '12-15' },
  { exercise_name: 'Bicep Curl + Triceps Pushdown', target_sets: 2, target_reps: '10-12 each' },
  { exercise_name: 'Single-Leg RDL', target_sets: 2, target_reps: '10-12/leg' },
  { exercise_name: 'Face Pull', target_sets: 2, target_reps: '12-15' },
  { exercise_name: 'Conditioning Finisher (optional)', target_sets: 1, target_reps: '8-10 min intervals' },
];

const DEFAULT_LOWER_QUAD_TEMPLATE = [
  { exercise_name: 'Back Squat or Leg Press', target_sets: 3, target_reps: '6-8' },
  { exercise_name: 'Romanian Deadlift', target_sets: 3, target_reps: '8-10' },
  { exercise_name: 'DB Step-Up', target_sets: 3, target_reps: '10-12/leg' },
  { exercise_name: 'Leg Extension', target_sets: 2, target_reps: '12-15' },
  { exercise_name: 'Cable Hip Abduction', target_sets: 2, target_reps: '12-15' },
  { exercise_name: 'Seated Row', target_sets: 3, target_reps: '10-12' },
  { exercise_name: 'Standing Calf Raise', target_sets: 3, target_reps: '12-15' },
  { exercise_name: 'Hanging Knee Raise / Cable Crunch', target_sets: 2, target_reps: '10-15' },
];

const DEFAULT_POSTERIOR_CHAIN_TEMPLATE = [
  { exercise_name: 'Hip Thrust', target_sets: 3, target_reps: '8-10' },
  { exercise_name: 'Trap Bar Deadlift', target_sets: 3, target_reps: '5-6' },
  { exercise_name: 'Single-Leg Leg Press', target_sets: 3, target_reps: '8-10/leg' },
  { exercise_name: 'Seated Leg Curl', target_sets: 2, target_reps: '10-12' },
  { exercise_name: 'Lat Pulldown or Pull-Up', target_sets: 3, target_reps: '8-10' },
  { exercise_name: 'Hip Abduction', target_sets: 2, target_reps: '12-15' },
  { exercise_name: 'Weighted Plank', target_sets: 2, target_reps: '30-45 sec' },
];

const DEFAULT_TEMPLATES = { A: DEFAULT_UPPER_BODY_TEMPLATE, B: DEFAULT_LOWER_QUAD_TEMPLATE, C: DEFAULT_POSTERIOR_CHAIN_TEMPLATE };

/** Seeds whichever of the three lifting days don't have a template yet
 *  — each day checked independently, so customizing one day never
 *  causes the others to get silently overwritten later. */
export async function seedDefaultWorkoutTemplatesIfEmpty() {
  const userId = await getUserId();
  if (!userId) return;

  for (const [dayKey, template] of Object.entries(DEFAULT_TEMPLATES)) {
    const { count } = await supabase
      .from('workout_exercise_templates').select('id', { count: 'exact', head: true })
      .eq('user_id', userId).eq('day_key', dayKey);
    if (count && count > 0) continue;
    const rows = template.map((e, i) => ({ ...e, user_id: userId, day_key: dayKey, sort_order: i }));
    await supabase.from('workout_exercise_templates').insert(rows);
  }
}

export async function listTemplateForDay(dayKey) {
  const userId = await getUserId();
  const { data, error } = await supabase
    .from('workout_exercise_templates').select('*')
    .eq('user_id', userId).eq('day_key', dayKey).eq('active', true).order('sort_order');
  if (error) throw error;
  return data;
}

export async function addTemplateExercise(dayKey, fields) {
  const userId = await getUserId();
  const { data: existing } = await supabase
    .from('workout_exercise_templates').select('id').eq('user_id', userId).eq('day_key', dayKey);
  const { error } = await supabase.from('workout_exercise_templates').insert({
    ...fields, user_id: userId, day_key: dayKey, sort_order: (existing || []).length,
  });
  if (error) throw error;
}

export async function removeTemplateExercise(id) {
  const { error } = await supabase.from('workout_exercise_templates').update({ active: false }).eq('id', id);
  if (error) throw error;
}

/** Last logged numbers for one exercise — what a "last session" line
 *  under each exercise reads, so you can see what you lifted last
 *  time without leaving the page. */
export async function getLastExerciseEntry(exerciseName) {
  const userId = await getUserId();
  const { data, error } = await supabase
    .from('workout_exercises').select('*, workouts(workout_date)')
    .eq('user_id', userId).eq('exercise_name', exerciseName)
    .order('created_at', { ascending: false }).limit(1).maybeSingle();
  if (error) throw error;
  return data;
}

/** AI substitute for one exercise, session-only — never touches the
 *  saved template. Returns null (rather than throwing) if the function
 *  isn't deployed/configured, same graceful-degrade pattern as capture. */
export async function requestExerciseSwap(exerciseName, targetReps, dayLabel, otherExercises) {
  try {
    const res = await fetch('/.netlify/functions/swap-exercise', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ exerciseName, targetReps, dayLabel, otherExercises }),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

// ---------- Logging ----------

/** Logs a full session: the workout row plus its exercises in one
 *  call. `exercises` is [{ exercise_name, sets_detail: [{set,weight,reps}], notes, effort_rating }].
 *  The top-set weight/reps/sets summary columns (what PRs/progression
 *  read) are derived automatically from sets_detail — heaviest set
 *  wins, matching how a PR actually works. */
export async function logWorkoutSession({ workout_date, day_key, workout_type, duration_minutes, exercises = [] }) {
  const userId = await getUserId();
  const { data: workout, error } = await supabase.from('workouts').insert({
    user_id: userId,
    workout_date: workout_date || todayStr(),
    day_key: day_key || null,
    workout_type: workout_type || null,
    duration_minutes: duration_minutes || null,
    completed: true,
  }).select().single();
  if (error) throw error;

  if (exercises.length > 0) {
    const rows = exercises.map((e, i) => {
      const sets = (e.sets_detail || []).filter(s => s.weight || s.reps);
      const topSet = sets.reduce((max, s) => ((s.weight || 0) > (max?.weight || 0) ? s : max), null);
      return {
        user_id: userId,
        workout_id: workout.id,
        exercise_name: e.exercise_name,
        sets_detail: sets.length > 0 ? sets : null,
        sets: sets.length || null,
        weight: topSet?.weight || null,
        reps: topSet?.reps || null,
        notes: e.notes || null,
        effort_rating: e.effort_rating || null,
        sort_order: i,
      };
    }).filter(r => r.sets_detail); // skip exercises left completely blank
    if (rows.length > 0) {
      const { error: exErr } = await supabase.from('workout_exercises').insert(rows);
      if (exErr) throw exErr;
    }
  }
  return workout;
}

export async function listRecentWorkouts(limit = 10) {
  const userId = await getUserId();
  const { data, error } = await supabase
    .from('workouts').select('*, workout_exercises(*)')
    .eq('user_id', userId).order('workout_date', { ascending: false }).limit(limit);
  if (error) throw error;
  return data;
}

// ---------- Analytics ----------

async function getExerciseHistory(exerciseName) {
  const userId = await getUserId();
  const { data, error } = await supabase
    .from('workout_exercises').select('*, workouts(workout_date)')
    .eq('user_id', userId).eq('exercise_name', exerciseName)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data || []).filter(e => e.workouts?.workout_date);
}

export async function listTrackedExerciseNames() {
  const userId = await getUserId();
  const { data, error } = await supabase.from('workout_exercises').select('exercise_name').eq('user_id', userId);
  if (error) throw error;
  return [...new Set((data || []).map(e => e.exercise_name))];
}

/** Heaviest set on record, and the highest estimated 1RM on record —
 *  two different "PR" definitions, both useful. */
export async function getPersonalRecord(exerciseName) {
  const history = await getExerciseHistory(exerciseName);
  if (history.length === 0) return null;

  const heaviest = history.reduce((max, e) => (e.weight > (max?.weight || 0) ? e : max), null);
  const best1RM = history.reduce((max, e) => {
    const est = estimated1RM(e.weight, e.reps);
    return est > (max?.est || 0) ? { est, entry: e } : max;
  }, null);

  return {
    heaviestWeight: heaviest?.weight,
    heaviestDate: heaviest?.workouts?.workout_date,
    best1RM: best1RM ? Math.round(best1RM.est) : null,
    best1RMDate: best1RM?.entry?.workouts?.workout_date,
  };
}

/** Weight-over-time series for one exercise — what a progression
 *  chart plots directly. */
export async function getStrengthProgression(exerciseName) {
  const history = await getExerciseHistory(exerciseName);
  return history.map(e => ({
    date: e.workouts.workout_date,
    weight: e.weight,
    reps: e.reps,
    sets: e.sets,
    estimated1RM: Math.round(estimated1RM(e.weight, e.reps)),
  }));
}

/** Total volume (sets * reps * weight) per session for one exercise —
 *  the metric that catches a plateau even when top weight looks flat
 *  (e.g. someone quietly dropping reps to keep hitting the same
 *  number on the bar). */
export async function getTrainingVolume(exerciseName) {
  const history = await getExerciseHistory(exerciseName);
  return history.map(e => ({
    date: e.workouts.workout_date,
    volume: (e.sets || 0) * (e.reps || 0) * (e.weight || 0),
  }));
}

/** Compares the average of the most recent N sessions against the N
 *  before that — the actual comparison behind "up 20 lbs over 8
 *  weeks" / "plateaued". Simple, explainable, no model involved. */
export async function getExerciseTrend(exerciseName, windowSize = 4) {
  const history = await getExerciseHistory(exerciseName);
  if (history.length < windowSize * 2) return null;

  const recent = history.slice(-windowSize);
  const prior = history.slice(-windowSize * 2, -windowSize);

  const avg = (arr) => arr.reduce((s, e) => s + estimated1RM(e.weight, e.reps), 0) / arr.length;
  const recentAvg = avg(recent);
  const priorAvg = avg(prior);
  const changePct = priorAvg ? ((recentAvg - priorAvg) / priorAvg) * 100 : 0;

  return {
    exerciseName,
    recentAvg1RM: Math.round(recentAvg),
    priorAvg1RM: Math.round(priorAvg),
    changePct: Math.round(changePct),
    weeksSpan: Math.round((new Date(history[history.length - 1].workouts.workout_date) - new Date(prior[0].workouts.workout_date)) / (7 * 86400000)),
    plateaued: Math.abs(changePct) < 3, // under 3% movement either way reads as flat
  };
}

/** Plain-language insight strings — "Your squat increased 20 lbs over
 *  8 weeks" style. Generated from getExerciseTrend, not an LLM call —
 *  keeps it instant, free, and exactly traceable to the numbers. */
export async function generateInsights() {
  const names = await listTrackedExerciseNames();
  const insights = [];

  for (const name of names) {
    const trend = await getExerciseTrend(name);
    if (!trend) continue;

    if (trend.plateaued) {
      insights.push(`Your ${name} volume has plateaued over the last ${trend.weeksSpan} weeks.`);
    } else if (trend.changePct > 0) {
      insights.push(`Your ${name} estimated 1RM is up ${trend.changePct}% (~${trend.recentAvg1RM - trend.priorAvg1RM} lb) over ${trend.weeksSpan} weeks.`);
    } else {
      insights.push(`Your ${name} estimated 1RM is down ${Math.abs(trend.changePct)}% over the last ${trend.weeksSpan} weeks.`);
    }
  }
  return insights;
}
