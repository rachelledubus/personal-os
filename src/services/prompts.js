import { supabase } from '../lib/supabaseClient.js';
import { mondayOfWeek, isMonday, isFriday, isFirstWeekOfMonth, currentMonthStr, todayStr } from '../utils/date.js';

async function getUserId() {
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id;
}

async function hasBeenShown(userId, promptType, marker) {
  const { data } = await supabase
    .from('prompt_log').select('id').eq('user_id', userId)
    .eq('prompt_type', promptType).eq('period_marker', marker).maybeSingle();
  return !!data;
}

async function logShown(userId, promptType, marker) {
  await supabase.from('prompt_log').upsert(
    { user_id: userId, prompt_type: promptType, period_marker: marker, shown_at: new Date().toISOString() },
    { onConflict: 'user_id,prompt_type,period_marker' }
  );
}

/** Called once when the app loads. Returns which prompt (if any) should
 *  interrupt the user right now — checked in priority order, only one
 *  fires per load. Each only fires once per period (tracked in prompt_log),
 *  so a Monday reload later that day won't re-trigger it. */
export async function getDuePrompt() {
  const userId = await getUserId();
  if (!userId) return null;

  const now = new Date();

  if (isMonday(now)) {
    const marker = mondayOfWeek(now);
    if (!(await hasBeenShown(userId, 'weekly_reset', marker))) {
      return { type: 'weekly_reset', marker };
    }
  }

  if (isFriday(now)) {
    const marker = mondayOfWeek(now);
    if (!(await hasBeenShown(userId, 'weekly_closeout', marker))) {
      return { type: 'weekly_closeout', marker };
    }
  }

  if (isFirstWeekOfMonth(now)) {
    const marker = currentMonthStr(now);
    if (!(await hasBeenShown(userId, 'monthly_snapshot', marker))) {
      return { type: 'monthly_snapshot', marker };
    }
  }

  return null;
}

export async function markPromptShown(type, marker) {
  const userId = await getUserId();
  await logShown(userId, type, marker);
}

export async function markPromptCompleted(type, marker) {
  const userId = await getUserId();
  await supabase.from('prompt_log')
    .update({ completed: true })
    .eq('user_id', userId).eq('prompt_type', type).eq('period_marker', marker);
}
