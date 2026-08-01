// netlify/functions/check-reminders.cjs
//
// Runs on a schedule (see netlify.toml) — this is the actual thing
// that reaches you without the app being open. Three kinds of check
// now, not just habits:
//   1. Habits — 'interval' or 'times' mode, unchanged from before.
//   2. Weekly Review — a nudge if it's late in the week and this
//      week's business review hasn't been started yet.
//   3. Schedule transitions — a nudge when today's current time
//      block is about to end, naming what's next.
// All three need a per-user timezone (user_preferences, defaulting
// to America/New_York) since plain 'HH:MM' values are meaningless
// without one — the server doesn't know where you are.

const { createClient } = require('@supabase/supabase-js');
const { sendPushToSubscriptions } = require('./lib/sendPushToSubscriptions.cjs');

const DEFAULT_TIMEZONE = 'America/New_York';

function localHHMM(date, timeZone) {
  return new Intl.DateTimeFormat('en-US', { timeZone, hour: '2-digit', minute: '2-digit', hour12: false }).format(date);
}

function localDateStr(date, timeZone) {
  return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
}

function localWeekday(date, timeZone) {
  return new Intl.DateTimeFormat('en-US', { timeZone, weekday: 'long' }).format(date);
}

// Monday of the current week, in a given local date string (YYYY-MM-DD).
function mondayOf(localDateStr) {
  const d = new Date(localDateStr + 'T00:00:00');
  const day = d.getDay();
  const diff = (day === 0 ? -6 : 1) - day;
  d.setDate(d.getDate() + diff);
  return d.toISOString().slice(0, 10);
}

async function getTimezone(supabase, userId) {
  const { data } = await supabase.from('user_preferences').select('value')
    .eq('user_id', userId).eq('category', 'notification_settings').eq('key', 'timezone').maybeSingle();
  return data?.value || DEFAULT_TIMEZONE;
}

async function checkHabitReminders(supabase, now) {
  const { data: habits } = await supabase
    .from('habits')
    .select('id, user_id, name, remind_periodically, reminder_interval_minutes, reminder_mode, reminder_times, last_reminded_at')
    .eq('remind_periodically', true)
    .eq('archived', false);

  let sent = 0;
  for (const habit of habits || []) {
    let due = false;
    if (habit.reminder_mode === 'times' && habit.reminder_times?.length) {
      const timezone = await getTimezone(supabase, habit.user_id);
      const currentLocal = localHHMM(now, timezone);
      const recentlyReminded = habit.last_reminded_at && (now - new Date(habit.last_reminded_at)) < 50 * 60 * 1000;
      due = !recentlyReminded && habit.reminder_times.some(t => t === currentLocal);
    } else if (habit.reminder_mode === 'interval' && habit.reminder_interval_minutes) {
      const minutesSince = habit.last_reminded_at ? (now - new Date(habit.last_reminded_at)) / 60000 : Infinity;
      due = minutesSince >= habit.reminder_interval_minutes;
    }
    if (!due) continue;

    const { data: subs } = await supabase.from('push_subscriptions').select('*').eq('user_id', habit.user_id);
    if (!subs || subs.length === 0) continue;

    const { staleEndpoints, sent: n } = await sendPushToSubscriptions(subs, {
      title: habit.name, body: "Time for this — tap to check it off.", url: '/grow', tag: `habit-${habit.id}`,
    });
    if (n > 0) {
      await supabase.from('habits').update({ last_reminded_at: now.toISOString() }).eq('id', habit.id);
      sent += 1;
    }
    if (staleEndpoints.length > 0) await supabase.from('push_subscriptions').delete().in('endpoint', staleEndpoints);
  }
  return sent;
}

// Nudges once per week, Friday afternoon onward, if this week's
// Weekly Business Review hasn't been started. Dedup lives in
// user_preferences (last week reminded), not a new table.
async function checkReviewReminders(supabase, now, userIds) {
  let sent = 0;
  for (const userId of userIds) {
    const timezone = await getTimezone(supabase, userId);
    const weekday = localWeekday(now, timezone);
    const isReviewWindow = ['Friday', 'Saturday', 'Sunday'].includes(weekday);
    if (!isReviewWindow) continue;

    const today = localDateStr(now, timezone);
    const monday = mondayOf(today);

    const { data: lastReminded } = await supabase.from('user_preferences').select('value')
      .eq('user_id', userId).eq('category', 'notification_settings').eq('key', 'last_review_reminder_week').maybeSingle();
    if (lastReminded?.value === monday) continue; // already nudged this week

    const { data: review } = await supabase.from('weekly_business_reviews').select('id')
      .eq('user_id', userId).eq('week_start', monday).maybeSingle();
    if (review) continue; // already started

    const { data: subs } = await supabase.from('push_subscriptions').select('*').eq('user_id', userId);
    if (!subs || subs.length === 0) continue;

    const { sent: n } = await sendPushToSubscriptions(subs, {
      title: 'Weekly review, whenever you have a few minutes', body: "This week's business review hasn't been started yet.", url: '/review', tag: 'weekly-review',
    });
    if (n > 0) {
      await supabase.from('user_preferences').upsert({
        user_id: userId, category: 'notification_settings', key: 'last_review_reminder_week', value: monday,
      }, { onConflict: 'user_id,category,key' });
      sent += 1;
    }
  }
  return sent;
}

// Nudges when today's current time block is about to end, naming
// what's next — "help with transitions," as asked for directly.
async function checkTransitionNudges(supabase, now, userIds) {
  let sent = 0;
  for (const userId of userIds) {
    const timezone = await getTimezone(supabase, userId);
    const today = localDateStr(now, timezone);
    const currentLocal = localHHMM(now, timezone);

    const { data: blocks } = await supabase.from('time_blocks').select('id, title, start_time, end_time')
      .eq('user_id', userId).eq('block_date', today).order('start_time');
    if (!blocks || blocks.length === 0) continue;

    // A block "ending soon" = its end_time falls in this 15-minute
    // check window. Naturally fires once per block per day at this
    // cadence, without needing a separate dedup flag.
    const [nowH, nowM] = currentLocal.split(':').map(Number);
    const nowMin = nowH * 60 + nowM;

    const endingSoon = blocks.find(b => {
      if (!b.end_time) return false;
      const [eh, em] = b.end_time.slice(0, 5).split(':').map(Number);
      const endMin = eh * 60 + em;
      return endMin >= nowMin && endMin < nowMin + 15;
    });
    if (!endingSoon) continue;

    const next = blocks.find(b => b.start_time && b.start_time.slice(0, 5) >= endingSoon.end_time.slice(0, 5) && b.id !== endingSoon.id);

    const { data: subs } = await supabase.from('push_subscriptions').select('*').eq('user_id', userId);
    if (!subs || subs.length === 0) continue;

    const { sent: n } = await sendPushToSubscriptions(subs, {
      title: `${endingSoon.title} wrapping up`,
      body: next ? `Next: ${next.title} at ${next.start_time.slice(0, 5)}` : 'Nothing else scheduled after this — a good stopping point.',
      url: '/today', tag: `transition-${endingSoon.id}-${today}`,
    });
    if (n > 0) sent += 1;
  }
  return sent;
}

exports.handler = async () => {
  try {
    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceRoleKey) {
      console.error('SUPABASE_SERVICE_ROLE_KEY not configured — see Netlify env vars.');
      return { statusCode: 501, body: JSON.stringify({ error: 'Not configured' }) };
    }
    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const now = new Date();

    const { data: subRows } = await supabase.from('push_subscriptions').select('user_id');
    const subscribedUserIds = [...new Set((subRows || []).map(r => r.user_id))];

    const habitsSent = await checkHabitReminders(supabase, now);
    const reviewSent = await checkReviewReminders(supabase, now, subscribedUserIds);
    const transitionSent = await checkTransitionNudges(supabase, now, subscribedUserIds);

    return { statusCode: 200, body: JSON.stringify({ habitsSent, reviewSent, transitionSent }) };
  } catch (err) {
    console.error('check-reminders failed:', err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message || String(err) }) };
  }
};
