// netlify/functions/check-reminders.js
//
// Runs on a schedule (see netlify.toml) — this is the actual thing
// that reaches you without the app being open. Two reminder modes,
// matching what already existed in the habits table:
//   - 'interval': due if enough minutes have passed since last_reminded_at
//   - 'times': due if the user's LOCAL current time matches one of
//     reminder_times, within this run's window. Needs a per-user
//     timezone (stored in user_preferences, defaulting to
//     America/New_York) since 'HH:MM' strings are meaningless without
//     one — the server doesn't know where you are.

const { createClient } = require('@supabase/supabase-js');
const { sendPushToSubscriptions } = require('./_lib/sendPushToSubscriptions.js');

const DEFAULT_TIMEZONE = 'America/New_York';

function localHHMM(date, timeZone) {
  return new Intl.DateTimeFormat('en-US', { timeZone, hour: '2-digit', minute: '2-digit', hour12: false }).format(date);
}

exports.handler = async () => {
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    console.error('SUPABASE_SERVICE_ROLE_KEY not configured — see Netlify env vars.');
    return { statusCode: 501, body: 'Not configured' };
  }
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  const { data: habits, error } = await supabase
    .from('habits')
    .select('id, user_id, name, remind_periodically, reminder_interval_minutes, reminder_mode, reminder_times, last_reminded_at')
    .eq('remind_periodically', true)
    .eq('archived', false);
  if (error) {
    console.error(error);
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }

  const now = new Date();
  let sentCount = 0;

  for (const habit of habits || []) {
    let due = false;

    if (habit.reminder_mode === 'times' && habit.reminder_times?.length) {
      const { data: tzPref } = await supabase
        .from('user_preferences').select('value')
        .eq('user_id', habit.user_id).eq('category', 'notification_settings').eq('key', 'timezone').maybeSingle();
      const timezone = tzPref?.value || DEFAULT_TIMEZONE;
      const currentLocal = localHHMM(now, timezone);
      // Only fire once per matching slot — skip if already reminded in the last 50 minutes.
      const recentlyReminded = habit.last_reminded_at && (now - new Date(habit.last_reminded_at)) < 50 * 60 * 1000;
      due = !recentlyReminded && habit.reminder_times.some(t => t === currentLocal);
    } else if (habit.reminder_mode === 'interval' && habit.reminder_interval_minutes) {
      const minutesSince = habit.last_reminded_at ? (now - new Date(habit.last_reminded_at)) / 60000 : Infinity;
      due = minutesSince >= habit.reminder_interval_minutes;
    }

    if (!due) continue;

    const { data: subs } = await supabase.from('push_subscriptions').select('*').eq('user_id', habit.user_id);
    if (!subs || subs.length === 0) continue;

    const { staleEndpoints, sent } = await sendPushToSubscriptions(subs, {
      title: habit.name,
      body: "Time for this — tap to check it off.",
      url: '/grow',
      tag: `habit-${habit.id}`,
    });
    if (sent > 0) {
      await supabase.from('habits').update({ last_reminded_at: now.toISOString() }).eq('id', habit.id);
      sentCount += 1;
    }
    if (staleEndpoints.length > 0) {
      await supabase.from('push_subscriptions').delete().in('endpoint', staleEndpoints);
    }
  }

  return { statusCode: 200, body: JSON.stringify({ checked: (habits || []).length, sent: sentCount }) };
};
