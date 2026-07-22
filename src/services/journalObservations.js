import { getBusinessSummary, getFocusTimeSummary, getHabitGridData, getMoodGridData } from './journalTrackers.js';

// ============================================================
// SORA'S OBSERVATIONS — pattern-noticing for the Journal tab, same
// honesty rules as habitInsights.js: only says something if there's a
// real, meaningful gap in real data, never manufactures a pattern out
// of noise. Written in Sora's actual voice (calm, observational,
// "notices what everyone else misses") since this is squarely her
// domain — comparing this month to last month IS "is this
// sustainable, what changed" in practice.
// ============================================================

function pctChange(current, previous) {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}

export async function getJournalObservations(year, month) {
  const observations = [];

  const [business, focus, habitGrids, mood] = await Promise.all([
    getBusinessSummary(year, month),
    getFocusTimeSummary(year, month),
    getHabitGridData(year, month),
    getMoodGridData(year, month),
  ]);

  // Business activity trend — only worth mentioning if the swing is real.
  const interactionChange = pctChange(business.interactions.current, business.interactions.previous);
  if (business.interactions.previous >= 3 && Math.abs(interactionChange) >= 30) {
    observations.push(
      interactionChange > 0
        ? `Business interactions are up ${interactionChange}% from last month.`
        : `Business interactions are down ${Math.abs(interactionChange)}% from last month.`
    );
  }

  // Focus time trend.
  if (focus.previous >= 60 && Math.abs(pctChange(focus.current, focus.previous)) >= 25) {
    const change = pctChange(focus.current, focus.previous);
    observations.push(
      change > 0
        ? `Focus time is trending up — ${Math.round(focus.current / 60 * 10) / 10}hr logged this month vs ${Math.round(focus.previous / 60 * 10) / 10}hr last month.`
        : `Focus time dropped this month — ${Math.round(focus.current / 60 * 10) / 10}hr vs ${Math.round(focus.previous / 60 * 10) / 10}hr last month.`
    );
  }

  // Habit consistency — flag the single most/least consistent habit if there's a real spread.
  const withRates = habitGrids
    .map(h => {
      const values = Object.values(h.days);
      const rate = values.filter(Boolean).length / values.length;
      return { name: h.name, rate };
    })
    .filter(h => !isNaN(h.rate));
  if (withRates.length >= 2) {
    const sorted = [...withRates].sort((a, b) => a.rate - b.rate);
    const weakest = sorted[0];
    const strongest = sorted[sorted.length - 1];
    if (strongest.rate - weakest.rate >= 0.35) {
      observations.push(`${strongest.name} is going well this month. ${weakest.name} might need a lighter touch — no judgment, just noticing.`);
    }
  }

  // Mood pattern — only worth a note if there's enough data to say anything honest.
  const moodValues = Object.values(mood).filter(v => v !== null && v !== undefined);
  if (moodValues.length >= 8) {
    const lowCount = moodValues.filter(v => v === 'Low').length;
    if (lowCount / moodValues.length >= 0.3) {
      observations.push(`Energy's read "Low" more than usual this month — worth checking what's being asked of you right now.`);
    }
  }

  return observations;
}
