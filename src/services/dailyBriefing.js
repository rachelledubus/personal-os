import { listOverdueContacts, getPipelineHealth, getRelationshipHealth } from './contacts.js';
import { getTodayBusinessAction } from './websiteBuildImport.js';
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

  const [overdue, pipelineHealth, relationshipHealth, todayAction] = await Promise.all([
    listOverdueContacts(), getPipelineHealth(), getRelationshipHealth(), getTodayBusinessAction(),
  ]);

  let thisWeekBuild = null;
  if (todayAction?.kind === 'step') thisWeekBuild = `${todayAction.milestoneTitle} \u2014 ${todayAction.stepTitle}`;
  else if (todayAction?.kind === 'milestone') thisWeekBuild = todayAction.milestoneTitle;

  const data = {
    overdueContactCount: overdue.length,
    overdueContactNames: overdue.slice(0, 5).map(c => c.name),
    pipelineHealth,
    relationshipHealth,
    thisWeekBuild,
  };

  const briefing = await requestBriefing(data);
  if (briefing) await setPreference('daily_briefing', cacheKey, briefing);
  return briefing;
}
