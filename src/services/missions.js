import { supabase } from '../lib/supabaseClient.js';
import { todayStr } from '../utils/date.js';
import { listDueSoon, completeMaintenanceItem } from './maintenance.js';

// ============================================================
// THE MISSION ENGINE
// This is the load-bearing piece of the whole V2 redesign. It reads
// from every relevant EXISTING table (nothing duplicated) plus the
// small new mission_item_state / custom_missions tables, and returns
// one ordered, interleaved list mixing personal + business items —
// per your decision, a true single sequence, not two side-by-side
// tracks.
//
// Each mission item has a consistent shape so MissionCard never needs
// to know which table it came from:
//   { id, sourceTable, sourceId, track, title, context, icon, done }
// ============================================================

const WEEKDAY_WORKOUT = [
  { label: 'Rest day', context: '' },
  { label: 'Cycle', context: 'Cardio day' },
  { label: 'Upper Body', context: 'Lifting day', dayKey: 'A' },
  { label: 'Pilates', context: 'Mobility & core' },
  { label: 'Lower Body — Quad Focus', context: 'Lifting day', dayKey: 'B' },
  { label: 'Rest day', context: '' },
  { label: 'Posterior Chain', context: 'Lifting day', dayKey: 'C' },
];

async function getUserId() {
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id;
}

// ---------- Individual source fetchers ----------

async function fetchWorkoutMission(userId) {
  const wk = WEEKDAY_WORKOUT[new Date().getDay()];
  if (!wk.context) return null; // rest day — no mission

  // If today's Life Rhythm schedule already has a workout block, it's
  // already visible in Today's Schedule — showing it again here would
  // just be the same workout twice.
  const { data: existingWorkoutBlock } = await supabase
    .from('life_rhythm_blocks').select('id')
    .eq('user_id', userId).eq('day_of_week', new Date().getDay()).eq('block_type', 'workout')
    .maybeSingle();
  if (existingWorkoutBlock) return null;

  return {
    id: 'workout-today',
    sourceTable: 'fixed_schedule',
    sourceId: null,
    track: 'personal',
    icon: 'dumbbell',
    title: wk.label,
    context: wk.context,
    done: false,
    linkTo: '/grow/workouts',
  };
}

async function fetchHabitMissions(userId) {
  const { data: habits } = await supabase
    .from('habits').select('*').eq('user_id', userId).eq('archived', false);
  const { data: logs } = await supabase
    .from('habit_logs').select('*').eq('user_id', userId).eq('log_date', todayStr());
  const doneIds = new Set((logs || []).filter(l => l.completed).map(l => l.habit_id));

  return (habits || []).map(h => ({
    id: `habit-${h.id}`,
    sourceTable: 'habits',
    sourceId: h.id,
    track: 'personal',
    icon: 'sparkles',
    title: h.name,
    context: 'Daily habit',
    done: doneIds.has(h.id),
    linkTo: '/grow/habits',
  }));
}

async function fetchPriorityMissions(userId) {
  const { data } = await supabase
    .from('daily_priorities').select('*').eq('user_id', userId).eq('priority_date', todayStr());
  return (data || []).map(p => ({
    id: `priority-${p.id}`,
    sourceTable: 'daily_priorities',
    sourceId: p.id,
    track: 'personal',
    icon: 'star',
    title: p.content,
    context: "Today's priority",
    done: p.done,
  }));
}

async function fetchAppointmentMissions(userId) {
  const { data } = await supabase
    .from('appointments').select('*').eq('user_id', userId).eq('appt_date', todayStr());
  return (data || []).map(a => ({
    id: `appt-${a.id}`,
    sourceTable: 'appointments',
    sourceId: a.id,
    track: 'personal',
    icon: 'calendar',
    title: a.title,
    context: a.appt_time ? `At ${a.appt_time}` : 'Today',
    done: false,
    // appointments don't have a "done" concept — treated as informational,
    // not checkable, but still occupies a slot in the sequence
    informational: true,
  }));
}

async function fetchContentMission(userId) {
  const { data: items } = await supabase
    .from('content_items').select('*').eq('user_id', userId).eq('archived', false);
  const { data: logs } = await supabase
    .from('content_logs').select('*').eq('user_id', userId).eq('log_date', todayStr());
  const doneIds = new Set((logs || []).filter(l => l.completed).map(l => l.content_item_id));

  return (items || []).map(i => ({
    id: `content-${i.id}`,
    sourceTable: 'content_items',
    sourceId: i.id,
    track: 'business',
    icon: 'megaphone',
    title: i.name,
    context: 'Content task',
    done: doneIds.has(i.id),
    linkTo: '/business/content',
  }));
}

async function fetchFollowUpMissions(userId) {
  const { data } = await supabase
    .from('contacts').select('*').eq('user_id', userId)
    .lte('next_follow_up_date', todayStr())
    .not('next_follow_up_date', 'is', null);
  return (data || []).map(c => ({
    id: `followup-${c.id}`,
    sourceTable: 'contacts',
    sourceId: c.id,
    track: 'business',
    icon: 'phone',
    title: `Follow up: ${c.name}`,
    context: c.next_action || c.category,
    done: false,
    linkTo: `/business/pipeline`,
  }));
}

async function fetchRoadmapMission(userId) {
  const { data } = await supabase
    .from('roadmap_items').select('*').eq('user_id', userId).eq('status', 'In Progress')
    .limit(1);
  return (data || []).map(r => ({
    id: `roadmap-${r.id}`,
    sourceTable: 'roadmap_items',
    sourceId: r.id,
    track: 'business',
    icon: 'map',
    title: r.title,
    context: `${r.phase} · this week's build`,
    done: r.status === 'Done',
    linkTo: '/business/roadmap',
  }));
}

// If-This-Then-That nudge: no consultations booked this week → surface
// an outreach mission. Kept intentionally simple and transparent (a
// direct read of pipeline activity), not a hidden black-box rule.
async function fetchNudgeMissions(userId) {
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const { count } = await supabase
    .from('contacts').select('id', { count: 'exact', head: true })
    .eq('user_id', userId).gte('last_contact_date', weekAgo.toISOString().slice(0, 10));

  if (count && count > 0) return [];

  return [{
    id: 'nudge-outreach',
    sourceTable: 'nudge',
    sourceId: null,
    track: 'business',
    icon: 'lightbulb',
    title: 'No outreach logged this week',
    context: 'Consider a sphere or partner touch today',
    done: false,
    linkTo: '/business/flows/phone_boundaries',
  }];
}

// Personal Maintenance nudge: anything due or inside its own
// reminder-lead window. Suggest, don't control — these are checkable
// like everything else, never forced into a time block.
async function fetchMaintenanceMissions(userId) {
  const dueSoon = await listDueSoon();
  return dueSoon.map(m => ({
    id: `maintenance-${m.id}`,
    sourceTable: 'maintenance_items',
    sourceId: m.id,
    track: 'personal',
    icon: 'circle',
    title: m.title,
    context: m.next_due_date === todayStr() ? 'Due today' : `Due ${m.next_due_date}`,
    done: false,
    linkTo: '/grow/maintenance',
  }));
}

async function fetchCustomMissions(userId) {
  const { data } = await supabase
    .from('custom_missions').select('*').eq('user_id', userId).eq('mission_date', todayStr());
  return (data || []).map(m => ({
    id: `custom-${m.id}`,
    sourceTable: 'custom_missions',
    sourceId: m.id,
    track: m.track,
    icon: 'circle',
    title: m.title,
    context: 'Added today',
    done: m.done,
  }));
}

async function fetchDismissedIds(userId) {
  const { data } = await supabase
    .from('mission_item_state').select('*').eq('user_id', userId).eq('mission_date', todayStr());
  const dismissed = new Set();
  (data || []).forEach(row => {
    if (row.dismissed) dismissed.add(`${row.source_table}-${row.source_id}`);
  });
  return dismissed;
}

// ---------- Public API ----------

/** Returns one interleaved list of today's missions, personal + business
 *  mixed, in a stable priority order: appointments (time-fixed) first,
 *  then workout, then everything else grouped loosely by how "live"
 *  it is (follow-ups/nudges before habits/content, since those are
 *  time-sensitive), custom items last. */
export async function getTodayMissions() {
  const userId = await getUserId();
  if (!userId) return [];

  const [
    workout, habits, priorities, appts, content,
    followUps, roadmap, nudges, maintenance, custom, dismissed,
  ] = await Promise.all([
    fetchWorkoutMission(userId),
    fetchHabitMissions(userId),
    fetchPriorityMissions(userId),
    fetchAppointmentMissions(userId),
    fetchContentMission(userId),
    fetchFollowUpMissions(userId),
    fetchRoadmapMission(userId),
    fetchNudgeMissions(userId),
    fetchMaintenanceMissions(userId),
    fetchCustomMissions(userId),
    fetchDismissedIds(userId),
  ]);

  const all = [
    ...appts,
    ...(workout ? [workout] : []),
    ...priorities,
    ...followUps,
    ...maintenance,
    ...roadmap,
    ...content,
    ...habits,
    ...nudges,
    ...custom,
  ];

  return all.filter(m => !dismissed.has(`${m.sourceTable}-${m.sourceId}`));
}

/** Marks a mission item done/undone by writing back to its ORIGINAL
 *  source table — the mission engine never becomes a second source
 *  of truth for data that already has a home. */
export async function toggleMission(mission, done) {
  switch (mission.sourceTable) {
    case 'habits': {
      const userId = await getUserId();
      if (done) {
        await supabase.from('habit_logs').upsert(
          { user_id: userId, habit_id: mission.sourceId, log_date: todayStr(), completed: true },
          { onConflict: 'habit_id,log_date' }
        );
      } else {
        await supabase.from('habit_logs').delete()
          .eq('habit_id', mission.sourceId).eq('log_date', todayStr());
      }
      return;
    }
    case 'daily_priorities':
      await supabase.from('daily_priorities').update({ done }).eq('id', mission.sourceId);
      return;
    case 'content_items': {
      const userId = await getUserId();
      if (done) {
        await supabase.from('content_logs').upsert(
          { user_id: userId, content_item_id: mission.sourceId, log_date: todayStr(), completed: true },
          { onConflict: 'content_item_id,log_date' }
        );
      } else {
        await supabase.from('content_logs').delete()
          .eq('content_item_id', mission.sourceId).eq('log_date', todayStr());
      }
      return;
    }
    case 'roadmap_items':
      await supabase.from('roadmap_items').update({ status: done ? 'Done' : 'Not Started' }).eq('id', mission.sourceId);
      return;
    case 'custom_missions':
      await supabase.from('custom_missions').update({ done }).eq('id', mission.sourceId);
      return;
    case 'contacts':
      if (done) {
        await supabase.from('contacts').update({ last_contact_date: todayStr() }).eq('id', mission.sourceId);
      }
      return;
    case 'maintenance_items':
      if (done) await completeMaintenanceItem(mission.sourceId);
      return;
    default:
      return; // informational items (appointments) and nudges aren't toggleable
  }
}

/** Dismiss/snooze an item for today without touching its source row. */
export async function dismissMission(mission) {
  const userId = await getUserId();
  await supabase.from('mission_item_state').upsert({
    user_id: userId,
    source_table: mission.sourceTable,
    source_id: mission.sourceId,
    mission_date: todayStr(),
    dismissed: true,
  }, { onConflict: 'user_id,source_table,source_id,mission_date' });
}

export async function addCustomMission(title, track = 'personal') {
  const userId = await getUserId();
  await supabase.from('custom_missions').insert({
    user_id: userId, title, track, mission_date: todayStr(),
  });
}
