import { supabase } from '../lib/supabaseClient.js';
import { todayStr } from '../utils/date.js';

async function getUserId() {
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id;
}

// ============================================================
// SPACED REPETITION — pure function, no DB/UI dependency, per the
// spec's explicit request. Progression on correct: 1 -> 3 -> 7 -> 14
// -> 30 days. Any incorrect answer resets to 1 (due tomorrow), not a
// partial step back — a miss means the whole point needs
// re-strengthening, not a slightly-shorter gap.
// ============================================================
const INTERVAL_PROGRESSION = [1, 3, 7, 14, 30];

export function computeNextReview(currentIntervalDays, wasCorrect, fromDate = new Date()) {
  let nextIntervalDays;
  if (!wasCorrect) {
    nextIntervalDays = 1;
  } else {
    const currentIndex = INTERVAL_PROGRESSION.indexOf(currentIntervalDays);
    nextIntervalDays = currentIndex === -1
      ? INTERVAL_PROGRESSION[0] // unrecognized interval (shouldn't happen, but fail safe rather than jump to the max)
      : currentIndex === INTERVAL_PROGRESSION.length - 1
        ? INTERVAL_PROGRESSION[INTERVAL_PROGRESSION.length - 1]
        : INTERVAL_PROGRESSION[currentIndex + 1];
  }
  const nextDate = new Date(fromDate);
  nextDate.setDate(nextDate.getDate() + nextIntervalDays);
  return { nextIntervalDays, nextReviewDate: nextDate.toISOString().slice(0, 10) };
}

// ============================================================
// TOPICS
// ============================================================

export async function listTopics() {
  const userId = await getUserId();
  const { data, error } = await supabase.from('practice_topics').select('*').eq('user_id', userId).order('sort_order');
  if (error) throw error;
  return data || [];
}

export async function setTopicStatus(topicId, status) {
  const { error } = await supabase.from('practice_topics').update({ status }).eq('id', topicId);
  if (error) throw error;
}

// ============================================================
// DAILY QUEUE — new problems from the topic currently "learning" +
// anything due for spaced review today. Never the whole bank.
// ============================================================

export async function getDailyQueue(limit = 8) {
  const userId = await getUserId();
  const today = todayStr();

  const [{ data: dueReview }, { data: learningTopics }] = await Promise.all([
    supabase.from('practice_problems').select('*, practice_topics(name, phase)')
      .eq('user_id', userId).lte('next_review_date', today).order('next_review_date'),
    supabase.from('practice_topics').select('id').eq('user_id', userId).eq('status', 'learning').order('sort_order'),
  ]);

  const due = dueReview || [];
  let queue = [...due];

  if (queue.length < limit && learningTopics?.length > 0) {
    const learningIds = learningTopics.map(t => t.id);
    const { data: newProblems } = await supabase.from('practice_problems')
      .select('*, practice_topics(name, phase)')
      .eq('user_id', userId).in('topic_id', learningIds)
      .is('next_review_date', null).eq('attempt_count', 0)
      .limit(limit - queue.length);
    queue = [...queue, ...(newProblems || [])];
  }

  return queue.slice(0, limit);
}

// ============================================================
// RECORDING AN ANSWER
// ============================================================

export async function recordAnswer(problemId, { userAnswer, isCorrect, missReason = null }) {
  const { data: problem, error: fetchErr } = await supabase.from('practice_problems').select('*').eq('id', problemId).single();
  if (fetchErr) throw fetchErr;

  const { nextIntervalDays, nextReviewDate } = computeNextReview(problem.review_interval_days, isCorrect);
  const isFirstAttempt = problem.attempt_count === 0;

  const { error } = await supabase.from('practice_problems').update({
    user_answer: userAnswer,
    is_correct: isCorrect,
    review_interval_days: nextIntervalDays,
    next_review_date: nextReviewDate,
    miss_reason: isCorrect ? null : missReason,
    attempt_count: problem.attempt_count + 1,
    correct_first_try: isFirstAttempt ? isCorrect : problem.correct_first_try,
  }).eq('id', problemId);
  if (error) throw error;
}

// ============================================================
// SESSIONS
// ============================================================

export async function logSession(problemsAttempted, problemsCorrect, topicIds) {
  const userId = await getUserId();
  const today = todayStr();
  const { data: existing } = await supabase.from('practice_sessions').select('*')
    .eq('user_id', userId).eq('session_date', today).maybeSingle();

  if (existing) {
    const mergedTopics = Array.from(new Set([...(existing.topic_ids || []), ...topicIds]));
    await supabase.from('practice_sessions').update({
      problems_attempted: existing.problems_attempted + problemsAttempted,
      problems_correct: existing.problems_correct + problemsCorrect,
      topic_ids: mergedTopics,
    }).eq('id', existing.id);
  } else {
    await supabase.from('practice_sessions').insert({
      user_id: userId, session_date: today,
      problems_attempted: problemsAttempted, problems_correct: problemsCorrect, topic_ids: topicIds,
    });
  }
}

export async function listSessions(daysBack = 90) {
  const userId = await getUserId();
  const since = new Date();
  since.setDate(since.getDate() - daysBack);
  const { data, error } = await supabase.from('practice_sessions').select('*')
    .eq('user_id', userId).gte('session_date', since.toISOString().slice(0, 10)).order('session_date');
  if (error) throw error;
  return data || [];
}

// ============================================================
// MASTERY — per-topic ratio of first-try-correct, weighted so recent
// attempts count more than old ones (simple recency weighting: more
// recent attempts get more weight in the average).
// ============================================================

export async function getTopicMastery() {
  const userId = await getUserId();
  const [{ data: topics }, { data: problems }] = await Promise.all([
    supabase.from('practice_topics').select('*').eq('user_id', userId).order('sort_order'),
    supabase.from('practice_problems').select('topic_id, correct_first_try, attempt_count, created_at')
      .eq('user_id', userId).gt('attempt_count', 0),
  ]);

  return (topics || []).map(topic => {
    const topicProblems = (problems || []).filter(p => p.topic_id === topic.id);
    if (topicProblems.length === 0) return { ...topic, mastery: null, attempted: 0 };

    const sorted = [...topicProblems].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    let weightedSum = 0, weightTotal = 0;
    sorted.forEach((p, i) => {
      const weight = i + 1; // later (more recent) problems weighted more
      weightedSum += (p.correct_first_try ? 1 : 0) * weight;
      weightTotal += weight;
    });
    return { ...topic, mastery: Math.round((weightedSum / weightTotal) * 100), attempted: topicProblems.length };
  });
}

// ============================================================
// SEED DATA — the real roadmap and starter problems, not a
// placeholder set. 13 topics across 3 phases, ~34 problems. On-
// demand generation covers everything beyond this starting point.
// ============================================================

const SEED_TOPICS = [
  { id: 'func_basics', name: 'Function basics (domain/range/notation)', phase: 'Functions', order: 1 },
  { id: 'quadratics', name: 'Quadratics (vertex form, roots)', phase: 'Functions', order: 2 },
  { id: 'poly_rational', name: 'Polynomial & rational functions', phase: 'Functions', order: 3 },
  { id: 'exp_log', name: 'Exponential & log functions', phase: 'Functions', order: 4 },
  { id: 'transformations', name: 'Transformations & composition/inverses', phase: 'Functions', order: 5 },
  { id: 'unit_circle', name: 'Right triangles & unit circle derivation', phase: 'Trigonometry', order: 6 },
  { id: 'trig_graphs', name: 'Six trig functions & graphs', phase: 'Trigonometry', order: 7 },
  { id: 'trig_identities', name: 'Trig identities', phase: 'Trigonometry', order: 8 },
  { id: 'trig_equations', name: 'Solving trig equations', phase: 'Trigonometry', order: 9 },
  { id: 'inverse_trig', name: 'Inverse trig functions', phase: 'Trigonometry', order: 10 },
  { id: 'limits_intuitive', name: 'Limits (graphical/numerical intuition)', phase: 'Calc Bridge', order: 11 },
  { id: 'limits_algebraic', name: 'Limits (algebraic evaluation)', phase: 'Calc Bridge', order: 12 },
  { id: 'sequences_series', name: 'Sequences & series basics', phase: 'Calc Bridge', order: 13 },
];

const SEED_PROBLEMS = [
  { topic_id: 'func_basics', prompt: 'Find the domain of f(x) = 1 / (x - 3).', answer: 'All real numbers except x = 3, i.e. (-inf, 3) U (3, inf)', difficulty: 'easy' },
  { topic_id: 'func_basics', prompt: 'If f(x) = 2x^2 - 5, find f(-3).', answer: 'f(-3) = 2(9) - 5 = 13', difficulty: 'easy' },
  { topic_id: 'func_basics', prompt: 'Find the domain of g(x) = sqrt(x - 4).', answer: 'x >= 4, i.e. [4, inf)', difficulty: 'medium' },
  { topic_id: 'quadratics', prompt: 'Convert f(x) = x^2 - 6x + 5 into vertex form.', answer: 'f(x) = (x - 3)^2 - 4', difficulty: 'medium' },
  { topic_id: 'quadratics', prompt: 'Find the roots of f(x) = x^2 - 4x + 3.', answer: 'x = 1 and x = 3 (factors as (x-1)(x-3))', difficulty: 'easy' },
  { topic_id: 'quadratics', prompt: 'Find the vertex of f(x) = -2x^2 + 8x - 3.', answer: 'Vertex at (2, 5); using x = -b/2a = 8/4 = 2, f(2) = -8+16-3 = 5', difficulty: 'medium' },
  { topic_id: 'poly_rational', prompt: 'Describe the end behavior of f(x) = -3x^4 + 2x - 1 as x -> \u00b1infinity.', answer: 'As x -> \u00b1infinity, f(x) -> -infinity (even degree, negative leading coefficient)', difficulty: 'medium' },
  { topic_id: 'poly_rational', prompt: 'Find the vertical asymptote(s) of f(x) = (x + 2) / (x - 5).', answer: 'Vertical asymptote at x = 5', difficulty: 'easy' },
  { topic_id: 'poly_rational', prompt: "Explain why f(x) = (x^2 - 9) / (x - 3) has a hole rather than an asymptote at x = 3.", answer: "The factor (x-3) cancels with the numerator's factor (x-3), since x^2-9 = (x-3)(x+3), leaving a removable discontinuity (hole) at x=3, not an asymptote", difficulty: 'hard' },
  { topic_id: 'exp_log', prompt: 'Solve for x: 2^x = 32.', answer: 'x = 5', difficulty: 'easy' },
  { topic_id: 'exp_log', prompt: 'Simplify log(8) + log(4) using log rules (base 2).', answer: 'log2(8) + log2(4) = 3 + 2 = 5, equivalent to log2(32)', difficulty: 'medium' },
  { topic_id: 'exp_log', prompt: 'Solve for x: ln(x) = 2.', answer: 'x = e^2 (approximately 7.389)', difficulty: 'medium' },
  { topic_id: 'transformations', prompt: 'Given f(x), describe the transformation for g(x) = f(x - 4) + 2.', answer: 'Shift right 4 units and up 2 units', difficulty: 'easy' },
  { topic_id: 'transformations', prompt: 'If f(x) = x^2, write the equation for f reflected over the x-axis and stretched vertically by a factor of 3.', answer: 'g(x) = -3x^2', difficulty: 'medium' },
  { topic_id: 'transformations', prompt: 'If f(x) = 2x + 1, find f(g(x)) where g(x) = x^2.', answer: 'f(g(x)) = 2x^2 + 1', difficulty: 'medium' },
  { topic_id: 'unit_circle', prompt: 'Using a 30-60-90 triangle, derive sin(30 degrees) and cos(30 degrees).', answer: 'sin(30) = 1/2, cos(30) = sqrt(3)/2, from the side ratios 1 : sqrt(3) : 2', difficulty: 'medium' },
  { topic_id: 'unit_circle', prompt: 'Convert 135 degrees to radians.', answer: '135 degrees = 3*pi/4 radians', difficulty: 'easy' },
  { topic_id: 'unit_circle', prompt: 'What are the coordinates on the unit circle at 45 degrees (pi/4)?', answer: '(sqrt(2)/2, sqrt(2)/2)', difficulty: 'medium' },
  { topic_id: 'trig_graphs', prompt: 'State the amplitude, period, and vertical shift of y = 3sin(2x) + 1.', answer: 'Amplitude = 3, period = 2*pi/2 = pi, vertical shift = up 1', difficulty: 'medium' },
  { topic_id: 'trig_graphs', prompt: 'What is the period of y = tan(x)?', answer: 'pi', difficulty: 'easy' },
  { topic_id: 'trig_graphs', prompt: 'Describe the phase shift of y = cos(x - pi/2).', answer: 'Shifted right by pi/2', difficulty: 'medium' },
  { topic_id: 'trig_identities', prompt: 'Using the Pythagorean identity, simplify sin^2(x) + cos^2(x).', answer: '= 1, by definition of the Pythagorean identity', difficulty: 'easy' },
  { topic_id: 'trig_identities', prompt: 'If sin(x) = 3/5 and x is in Quadrant I, find cos(x).', answer: 'cos(x) = 4/5, from sin^2+cos^2=1 -> cos = sqrt(1 - 9/25) = sqrt(16/25) = 4/5', difficulty: 'medium' },
  { topic_id: 'trig_equations', prompt: 'Solve 2sin(x) - 1 = 0 for 0 <= x < 2*pi.', answer: 'x = pi/6 and x = 5*pi/6', difficulty: 'medium' },
  { topic_id: 'trig_equations', prompt: 'Solve cos(x) = -1 for 0 <= x < 2*pi.', answer: 'x = pi', difficulty: 'easy' },
  { topic_id: 'inverse_trig', prompt: 'Find arcsin(1/2) in radians.', answer: 'pi/6', difficulty: 'medium' },
  { topic_id: 'inverse_trig', prompt: 'Why is the domain of arcsin(x) restricted to [-1, 1]?', answer: 'Because sin(x) only outputs values between -1 and 1, so its inverse can only accept inputs in that range', difficulty: 'medium' },
  { topic_id: 'limits_intuitive', prompt: 'Using a table of values approaching x=2, estimate lim(x->2) (x^2).', answer: 'The limit is 4, as values of x^2 approach 4 from both sides as x approaches 2', difficulty: 'easy' },
  { topic_id: 'limits_intuitive', prompt: 'Explain in your own words what lim(x->a) f(x) = L means.', answer: 'As x gets arbitrarily close to a (from either side), the value of f(x) gets arbitrarily close to L, regardless of the actual value of f(a)', difficulty: 'medium' },
  { topic_id: 'limits_algebraic', prompt: 'Evaluate lim(x->1) (x^2 - 1)/(x - 1).', answer: 'Factor to (x-1)(x+1)/(x-1) = x+1, so the limit as x->1 is 2', difficulty: 'medium' },
  { topic_id: 'limits_algebraic', prompt: 'Evaluate lim(x->infinity) (3x^2 + 1)/(x^2 - 5).', answer: '3, since the highest-degree terms dominate: 3x^2/x^2 = 3', difficulty: 'hard' },
  { topic_id: 'sequences_series', prompt: 'Find the next two terms of the arithmetic sequence 4, 7, 10, 13, ...', answer: '16, 19 (common difference of 3)', difficulty: 'easy' },
  { topic_id: 'sequences_series', prompt: 'Find the sum of the first 5 terms of the geometric sequence 2, 6, 18, 54, ...', answer: '2 + 6 + 18 + 54 + 162 = 242', difficulty: 'medium' },
];

export async function seedPracticeIfEmpty() {
  const userId = await getUserId();
  const { count } = await supabase.from('practice_topics').select('id', { count: 'exact', head: true }).eq('user_id', userId);
  if (count > 0) return { seeded: false };

  const idMap = {};
  for (const t of SEED_TOPICS) {
    const { data, error } = await supabase.from('practice_topics').insert({
      user_id: userId, name: t.name, phase: t.phase, sort_order: t.order,
      status: t.order === 1 ? 'learning' : 'not_started',
    }).select().single();
    if (error) throw error;
    idMap[t.id] = data.id;
  }

  const rows = SEED_PROBLEMS.map(p => ({
    user_id: userId, topic_id: idMap[p.topic_id], prompt: p.prompt, answer: p.answer,
    difficulty: p.difficulty, source: 'seed',
  }));
  const { error: probErr } = await supabase.from('practice_problems').insert(rows);
  if (probErr) throw probErr;

  return { seeded: true, topics: SEED_TOPICS.length, problems: SEED_PROBLEMS.length };
}

// ============================================================
// ON-DEMAND GENERATION — calls the real Gemini integration this app
// already has, not a new Anthropic call as the original spec assumed.
// ============================================================

export async function generateMoreProblems(topicId, topicName, difficulty = 'medium') {
  const res = await fetch('/.netlify/functions/generate-practice-problems', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ topicName, difficulty }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Generation failed (${res.status})`);
  }
  const { problems } = await res.json();

  const userId = await getUserId();
  const rows = problems.map(p => ({
    user_id: userId, topic_id: topicId, prompt: p.prompt, answer: p.answer,
    difficulty, source: 'generated',
  }));
  const { error } = await supabase.from('practice_problems').insert(rows);
  if (error) throw error;
  return rows.length;
}
