import { getPreference, setPreference } from './settings.js';
import { todayStr } from '../utils/date.js';

// Scoped to today's date so it naturally resets every day without a
// cleanup job — reuses the same generic user_preferences store every
// other lightweight setting already uses.
function todayKey() {
  return `commitments_added_${todayStr()}`;
}

export async function getTodayCommitmentCount() {
  return Number(await getPreference('commitment_tracking', todayKey(), 0)) || 0;
}

export async function recordCommitmentAdded() {
  const key = todayKey();
  const current = Number(await getPreference('commitment_tracking', key, 0)) || 0;
  await setPreference('commitment_tracking', key, current + 1);
  return current + 1;
}
