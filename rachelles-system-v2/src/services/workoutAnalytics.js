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

// ---------- Logging ----------

/** Logs a full session: the workout row plus its exercises in one
 *  call. `exercises` is [{ exercise_name, sets, reps, weight, notes,
 *  effort_rating }]. */
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
    const rows = exercises.map((e, i) => ({ ...e, user_id: userId, workout_id: workout.id, sort_order: i }));
    const { error: exErr } = await supabase.from('workout_exercises').insert(rows);
    if (exErr) throw exErr;
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
