import { supabase } from '../lib/supabaseClient.js';
import { mondayOfWeek } from '../utils/date.js';

async function getUserId() {
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id;
}

const ENERGY_TO_NUMBER = { Low: 1, Medium: 2, High: 3 };

function minutesBetween(start, end) {
  if (!start || !end) return 0;
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  return Math.max(0, (eh * 60 + em) - (sh * 60 + sm));
}

/** "Personal Economy" (Phase 4 backlog) — time, energy, and money as
 *  one combined weekly picture. Deliberately built entirely from data
 *  that already exists (time_blocks, energy_logs, finance_entries)
 *  rather than new tracking — the whole point is showing the
 *  connections between three things you're already recording
 *  separately, not asking for a fourth kind of daily input. */
export async function getWeeklyPersonalEconomy() {
  const userId = await getUserId();
  const mondayStr = mondayOfWeek();

  const [{ data: blocks }, { data: energyLogs }, { data: financeEntries }] = await Promise.all([
    supabase.from('time_blocks').select('track, start_time, end_time').eq('user_id', userId).gte('block_date', mondayStr),
    supabase.from('energy_logs').select('energy_level, log_date').eq('user_id', userId).gte('log_date', mondayStr),
    supabase.from('finance_entries').select('entry_type, amount').eq('user_id', userId).gte('occurred_date', mondayStr),
  ]);

  const timeByTrack = { personal: 0, business: 0 };
  (blocks || []).forEach(b => {
    const mins = minutesBetween(b.start_time, b.end_time);
    if (b.track === 'business') timeByTrack.business += mins;
    else timeByTrack.personal += mins;
  });

  const energyValues = (energyLogs || []).map(l => ENERGY_TO_NUMBER[l.energy_level]).filter(Boolean);
  const avgEnergy = energyValues.length ? energyValues.reduce((a, b) => a + b, 0) / energyValues.length : null;

  const income = (financeEntries || []).filter(e => e.entry_type === 'income').reduce((s, e) => s + Number(e.amount), 0);
  const spend = (financeEntries || []).filter(e => e.entry_type !== 'income').reduce((s, e) => s + Number(e.amount), 0);

  return {
    weekOf: mondayStr,
    timeByTrack, // minutes
    avgEnergy, // 1-3 scale, null if no check-ins this week
    energyCheckins: energyValues.length,
    money: { income, spend, net: income - spend },
  };
}
