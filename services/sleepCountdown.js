import { getTodaySchedule } from './dailyExecution.js';
import { getSleepTargets } from './settings.js';

// ============================================================
// PM ROUTINE COUNTDOWN
// Runs the actual PM routine time (from today's real Evening Routine
// block, not a guess) against her bedtime/wake targets. Only speaks up
// in the evening, and only if it's actually worth a nudge — no warning
// shown if she's already on track.
// ============================================================

function parseTimeToMinutes(hhmm) {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

function minutesToLabel(totalMinutes) {
  const wrapped = ((totalMinutes % 1440) + 1440) % 1440;
  const h = Math.floor(wrapped / 60);
  const m = wrapped % 60;
  const period = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2, '0')} ${period}`;
}

/** Returns { shouldWarn, message } — shouldWarn is false outside the
 *  evening window or once the Evening Routine is already done, so this
 *  is safe to poll from anywhere without spamming. */
export async function getPmRoutineStatus() {
  const [schedule, targets] = await Promise.all([getTodaySchedule(), getSleepTargets()]);
  const eveningBlock = (schedule || []).find(b => b.title === 'Evening Routine');

  if (eveningBlock?.completed) return { shouldWarn: false };

  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  // Only worth checking in the evening — skip the rest of the day.
  if (nowMinutes < 18 * 60) return { shouldWarn: false };

  // Real duration from today's actual schedule block when it exists;
  // falls back to a flat hour if the block or its times are missing.
  let durationMinutes = 60;
  if (eveningBlock?.start_time && eveningBlock?.end_time) {
    durationMinutes = parseTimeToMinutes(eveningBlock.end_time) - parseTimeToMinutes(eveningBlock.start_time);
  }

  const projectedBedtimeMinutes = nowMinutes + durationMinutes;
  const targetBedtimeMinutes = parseTimeToMinutes(targets.bedtime);
  const wakeMinutesTomorrow = parseTimeToMinutes(targets.wake_time) + 1440;

  const sleepHours = (wakeMinutesTomorrow - projectedBedtimeMinutes) / 60;
  const isLate = projectedBedtimeMinutes > targetBedtimeMinutes;
  const isShortSleep = sleepHours <= 8;

  if (!isLate && !isShortSleep) return { shouldWarn: false };

  const projectedLabel = minutesToLabel(projectedBedtimeMinutes);
  const message = isShortSleep
    ? `If you start your PM routine now, you're looking at bed around ${projectedLabel} — that's only about ${sleepHours.toFixed(1)} hours before your ${targets.wake_time.replace(/^0/, '')} wake-up.`
    : `If you start your PM routine now, you're looking at bed around ${projectedLabel} — a bit past your ${minutesToLabel(targetBedtimeMinutes)} target.`;

  return { shouldWarn: true, message, projectedLabel, sleepHours };
}
