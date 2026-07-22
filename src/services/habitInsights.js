import { supabase } from '../lib/supabaseClient.js';

// ============================================================
// HABIT PATTERN INSIGHTS — Phase 5's real remaining gap: the
// Personal Assistant (habits/activity history -> pattern recognition,
// recommendations). Deterministic, not an LLM call — same approach
// workoutAnalytics.js's generateInsights() already uses successfully
// for strength trends, kept consistent rather than introducing a new
// AI Netlify function for something plain statistics already covers
// honestly. "AI identifies patterns" per the Constitution's own good
// example doesn't require a model call, just real analysis of real
// data — never inventing a pattern that isn't actually there.
// ============================================================

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const LOOKBACK_DAYS = 21; // 3 weeks — short enough for feedback to feel timely, not so short one off week reads as a trend
// Shorter windows mean more risk of reading noise as a pattern (one
// rough Tuesday isn't "you always skip Tuesdays") — the 25% gap
// requirement and the minimum-data floor below exist specifically to
// keep that honest even at this shorter window, not just at 8 weeks.

async function getUserId() {
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id;
}

export async function getHabitPatternInsights() {
  const userId = await getUserId();
  if (!userId) return [];

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - LOOKBACK_DAYS);
  const cutoffStr = cutoff.toISOString().slice(0, 10);

  const [{ data: habits }, { data: logs }] = await Promise.all([
    supabase.from('habits').select('id, name').eq('user_id', userId).eq('archived', false),
    supabase.from('habit_logs').select('habit_id, log_date, completed')
      .eq('user_id', userId).eq('completed', true).gte('log_date', cutoffStr),
  ]);

  if (!habits || habits.length === 0 || !logs || logs.length < 10) return []; // not enough real data to say anything honest

  // How many times has each weekday actually occurred in the lookback window —
  // needed to compute a real rate, not just a raw count (some weekdays have
  // one more occurrence than others depending on the exact date range).
  const weekdayOccurrences = new Array(7).fill(0);
  for (let i = 0; i < LOOKBACK_DAYS; i++) {
    const d = new Date(cutoff);
    d.setDate(d.getDate() + i);
    weekdayOccurrences[d.getDay()] += 1;
  }

  const completionsByWeekday = new Array(7).fill(0);
  logs.forEach(l => {
    const day = new Date(`${l.log_date}T00:00:00`).getDay();
    completionsByWeekday[day] += 1;
  });

  const possiblePerWeekday = weekdayOccurrences.map(n => n * habits.length);
  const rateByWeekday = completionsByWeekday.map((c, i) => (possiblePerWeekday[i] > 0 ? c / possiblePerWeekday[i] : null));

  const insights = [];

  const validRates = rateByWeekday.map((r, i) => ({ rate: r, day: i })).filter(r => r.rate !== null);
  if (validRates.length >= 5) {
    const sorted = [...validRates].sort((a, b) => a.rate - b.rate);
    const weakest = sorted[0];
    const strongest = sorted[sorted.length - 1];
    // Only worth mentioning if there's a real gap — otherwise every week just
    // looks like noise dressed up as a pattern, which is exactly what this
    // system is supposed to avoid.
    if (strongest.rate - weakest.rate >= 0.25) {
      insights.push(`Your habits tend to slip on ${DAY_NAMES[weakest.day]}s (${Math.round(weakest.rate * 100)}% completion over the last ${LOOKBACK_DAYS / 7} weeks) compared to ${DAY_NAMES[strongest.day]}s (${Math.round(strongest.rate * 100)}%).`);
    }
  }

  // Live streaks worth calling out — reuses the same "consecutive days
  // ending today" logic as the streak counter already shown per-habit,
  // just surfaced as a pattern instead of a per-item badge.
  const byHabit = {};
  logs.forEach(l => (byHabit[l.habit_id] ||= new Set()).add(l.log_date));
  habits.forEach(h => {
    let count = 0;
    const d = new Date();
    while (byHabit[h.id]?.has(d.toISOString().slice(0, 10))) {
      count += 1;
      d.setDate(d.getDate() - 1);
    }
    if (count >= 7) insights.push(`${h.name} is on a real streak — ${count} days in a row.`);
  });

  return insights;
}
