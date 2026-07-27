import { listOverdueContacts, getPipelineHealth, getRelationshipHealth } from './contacts.js';
import { getThisWeekBuild } from './timeline.js';
import { getPreference, setPreference } from './settings.js';
import { todayStr } from '../utils/date.js';

async function requestBriefing(data) {
  try {
    const res = await fetch('/.netlify/functions/daily-briefing', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data }),
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json.briefing || null;
  } catch {
    return null;
  }
}

/** Cached per day (user_preferences, key = today's date) — an AI call
 *  on every single page load would be wasteful and slow for content
 *  that's only meant to be read once each morning. `forceRefresh`
 *  bypasses the cache for a manual regenerate. */
export async function getDailyBriefing(forceRefresh = false) {
  const cacheKey = `briefing_${todayStr()}`;
  if (!forceRefresh) {
    const cached = await getPreference('daily_briefing', cacheKey, null);
    if (cached) return cached;
  }

  const [overdue, pipelineHealth, relationshipHealth, thisWeekBuild] = await Promise.all([
    listOverdueContacts(), getPipelineHealth(), getRelationshipHealth(), getThisWeekBuild(),
  ]);

  const data = {
    overdueContactCount: overdue.length,
    overdueContactNames: overdue.slice(0, 5).map(c => c.name),
    pipelineHealth,
    relationshipHealth,
    thisWeekBuild: thisWeekBuild?.title || null,
  };

  const briefing = await requestBriefing(data);
  if (briefing) await setPreference('daily_briefing', cacheKey, briefing);
  return briefing;
}
