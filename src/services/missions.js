import { supabase } from '../lib/supabaseClient.js';
import { todayStr } from '../utils/date.js';

const WEEKDAY_WORKOUT = [
  { label: 'Rest day', context: '' },
  { label: 'Cycle', context: 'Cardio day' },
  { label: 'Lower Body — Quad Focus', context: 'Lifting day' },
  { label: 'Pilates', context: 'Mobility & core' },
  { label: 'Posterior Chain', context: 'Lifting day' },
  { label: 'Rest day', context: '' },
  { label: 'Upper Body', context: 'Lifting day' },
];

async function getUserId() {
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id;
}

async function fetchWorkoutMission() {
  const wk = WEEKDAY_WORKOUT[new Date().getDay()];
  if (!wk.context) return null;
  return {
    id: 'workout-today', sourceTable: 'fixed_schedule', sourceId: null,
    track: 'personal', icon: 'dumbbell', title: wk.label, context: wk.context, done: false,
  };
}

async function fetchHabitMissions(userId) {
  const { data: habits } = await supabase.from('habits').select('*').eq('user_id', userId).eq('archived', false);
  const { data: logs } = await supabase.from('habit_logs').select('*').eq('user_id', userId).eq('log_date', todayStr());
  const doneIds = new Set((logs || []).filter(l => l.completed).map(l => l.habit_id));

  return (habits || []).map(h => ({
    id: `habit-${h.id}`, sourceTable: 'habits', sourceId: h.id, track: 'personal',
    icon: 'sparkles', title: h.name, context: 'Daily habit', done: doneIds.has(h.id),
  }));
}

async function fetchPriorityMissions(userId) {
  const { data } = await supabase.from('daily_priorities').select('*').eq('user_id', userId).eq('priority_date', todayStr());
  return (data || []).map(p => ({
    id: `priority-${p.id}`, sourceTable: 'daily_priorities', sourceId: p.id, track: 'personal',
    icon: 'star', title: p.content, context: "Today's priority", done: p.done,
  }));
}

async function fetchAppointmentMissions(userId) {
  const { data } = await supabase.from('appointments').select('*').eq('user_id', userId).eq('appt_date', todayStr());
  return (data || []).map(a => ({
    id: `appt-${a.id}`, sourceTable: 'appointments', sourceId: a.id, track: 'personal',
    icon: 'calendar', title: a.title, context: a.appt_time ? `At ${a.appt_time}` : 'Today',
    done: false, informational: true,
  }));
}

async function fetchContentMission(userId) {
  const { data: items } = await supabase.from('content_items').select('*').eq('user_id', userId).eq('archived', false);
  const { data: logs } = await supabase.from('content_logs').select('*').eq('user_id', userId).eq('log_date', todayStr());
  const doneIds = new Set((logs || []).filter(l => l.completed).map(l => l.content_item_id));

  return (items || []).map(i => ({
    id: `content-${i.id}`, sourceTable: 'content_items', sourceId: i.id, track: 'business',
    icon: 'megaphone', title: i.name, context: 'Content task', done: doneIds.has(i.id),
  }));
}

async function fetchFollowUpMissions(userId) {
  const { data } = await supabase.from('contacts').select('*').eq('user_id', userId)
    .lte('next_follow_up_date', todayStr()).not('next_follow_up_date', 'is', null);
  return (data || []).map(c => ({
    id: `followup-${c.id}`, sourceTable: 'contacts', sourceId: c.id, track: 'business',
    icon: 'phone', title: `Follow up: ${c.name}`, context: c.next_action || c.category,
    done: false, linkTo: `/business/contacts/${c.id}`,
  }));
}

async function fetchRoadmapMission(userId) {
  const { data } = await supabase.from('roadmap_items').select('*').eq('user_id', userId).eq('status', 'In Progress').limit(1);
  return (data || []).map(r => ({
    id: `roadmap-${r.id}`, sourceTable: 'roadmap_items', sourceId: r.id, track: 'business',
    icon: 'map', title: r.title, context: `${r.phase} · this week's build`, done: r.status === 'Done',
  }));
}

async function fetchNudgeMissions(userId) {
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const { count } = await supabase.from('contacts').select('id', { count: 'exact', head: true })
    .eq('user_id', userId).gte('last_contact_date', weekAgo.toISOString().slice(0, 10));

  if (count && count > 0) return [];

  return [{
    id: 'nudge-outreach', sourceTable: 'nudge', sourceId: null, track: 'business',
    icon: 'lightbulb', title: 'No outreach logged this week', context: 'Consider a sphere or partner touch today',
    done: false, linkTo: '/business/flows/phone_boundaries',
  }];
}

async function fetchCustomMissions(userId) {
  const { data } = await supabase.from('custom_missions').select('*').eq('user_id', userId).eq('mission_date', todayStr());
  return (data || []).map(m => ({
    id: `custom-${m.id}`, sourceTable: 'custom_missions', sourceId: m.id, track: m.track,
    icon: 'circle', title: m.title, context: 'Added today', done: m.done,
  }));
}

async function fetchDismissedIds(userId) {
  const { data } = await supabase.from('mission_item_state').select('*').eq('user_id', userId).eq('mission_date', todayStr());
  const dismissed = new Set();
  (data || []).forEach(row => { if (row.dismissed) dismissed.add(`${row.source_table}-${row.source_id}`); });
  return dismissed;
}

export async function getTodayMissions() {
  const userId = await getUserId();
  if (!userId) return [];

  const [workout, habits, priorities, appts, content, followUps, roadmap, nudges, custom, dismissed] = await Promise.all([
    fetchWorkoutMission(), fetchHabitMissions(userId), fetchPriorityMissions(userId),
    fetchAppointmentMissions(userId), fetchContentMission(userId), fetchFollowUpMissions(userId),
    fetchRoadmapMission(userId), fetchNudgeMissions(userId), fetchCustomMissions(userId), fetchDismissedIds(userId),
  ]);

  const all = [
    ...appts, ...(workout ? [workout] : []), ...priorities, ...followUps,
    ...roadmap, ...content, ...habits, ...nudges, ...custom,
  ];

  return all.filter(m => !dismissed.has(`${m.sourceTable}-${m.sourceId}`));
}

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
        await supabase.from('habit_logs').delete().eq('habit_id', mission.sourceId).eq('log_date', todayStr());
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
        await supabase.from('content_logs').delete().eq('content_item_id', mission.sourceId).eq('log_date', todayStr());
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
      if (done) await supabase.from('contacts').update({ last_contact_date: todayStr() }).eq('id', mission.sourceId);
      return;
    default:
      return;
  }
}

export async function dismissMission(mission) {
  const userId = await getUserId();
  await supabase.from('mission_item_state').upsert({
    user_id: userId, source_table: mission.sourceTable, source_id: mission.sourceId,
    mission_date: todayStr(), dismissed: true,
  }, { onConflict: 'user_id,source_table,source_id,mission_date' });
}

export async function addCustomMission(title, track = 'personal') {
  const userId = await getUserId();
  await supabase.from('custom_missions').insert({ user_id: userId, title, track, mission_date: todayStr() });
}
