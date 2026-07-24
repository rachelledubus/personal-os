import { supabase } from '../lib/supabaseClient.js';
import { todayStr } from '../utils/date.js';
import { listDueSoon, completeMaintenanceItem } from './maintenance.js';
import { logActivity } from './goals.js';
import { syncRoadmapItemFromSubtasks } from './timeline.js';
import { countOverdue } from './contacts.js';

// ============================================================
// TODAY ITEMS ENGINE (renamed from "Mission Engine")
// This is the load-bearing piece of the whole V2 redesign. It reads
// from every relevant EXISTING table (nothing duplicated) plus the
// small mission_item_state / custom_missions tables (DB table names
// kept as-is on purpose — renaming them is a real migration for zero
// functional benefit; this rename is about the English word being
// ambiguous in prose/code, not the schema), and returns one ordered,
// interleaved list mixing personal + business items — a true single
// sequence, not two side-by-side tracks.
//
// Renamed from "Mission" because the Naming & Terminology Dictionary
// reserves "Mission" for a real grouping concept (Goal -> Missions ->
// Tasks) — see missions.js (the NEW file, the real thing) for that.
// These are individual items on Today's list, not a container of
// several tasks, so "Mission" was never the right word for them.
//
// Each item has a consistent shape so TodayItemCard never needs
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

async function fetchWorkoutItem(userId) {
  const wk = WEEKDAY_WORKOUT[new Date().getDay()];
  if (!wk.context) return null; // rest day — no item

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

async function fetchMealItems(userId) {
  const { data: items } = await supabase.from('meal_plan_items')
    .select('id, meal_type, eaten, servings, foods(name)')
    .eq('user_id', userId).eq('plan_date', todayStr());
  if (!items || items.length === 0) return [];

  const byMealType = {};
  items.forEach(item => { (byMealType[item.meal_type] ||= []).push(item); });

  const MEAL_ORDER = ['breakfast', 'lunch', 'dinner', 'snacks'];
  const MEAL_LABEL = { breakfast: 'Breakfast', lunch: 'Lunch', dinner: 'Dinner', snacks: 'Snacks' };

  return MEAL_ORDER.filter(t => byMealType[t]).map(mealType => {
    const mealItems = byMealType[mealType];
    const foodNames = mealItems.map(i => i.foods?.name).filter(Boolean).join(', ');
    return {
      id: `meal-${mealType}`,
      sourceTable: 'meal_plan_items',
      sourceId: mealType,
      track: 'personal',
      icon: 'coffee',
      title: MEAL_LABEL[mealType],
      context: foodNames || 'Planned',
      done: mealItems.every(i => i.eaten),
      linkTo: '/plan/meals',
    };
  });
}

async function fetchHabitItems(userId) {
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

async function fetchPriorityItems(userId) {
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

async function fetchAppointmentItems(userId) {
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
    informational: true,
  }));
}

async function fetchContentItem(userId) {
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

async function fetchFollowUpItems(userId) {
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

async function fetchRoadmapItem(userId) {
  const { data } = await supabase
    .from('roadmap_items').select('*').eq('user_id', userId).eq('status', 'In Progress')
    .limit(1);
  const items = data || [];
  if (items.length === 0) return [];
  const parent = items[0];

  const { data: subtasks } = await supabase
    .from('milestones').select('*').eq('roadmap_item_id', parent.id).eq('completed', false).order('sort_order');

  // Real sub-tasks exist — surface those individually instead of one
  // vague "this week's build" blob. Checking one off actually means
  // something now (see toggleTodayItem's 'milestones' case).
  if (subtasks && subtasks.length > 0) {
    return subtasks.map(s => ({
      id: `milestone-${s.id}`,
      sourceTable: 'milestones',
      sourceId: s.id,
      roadmapItemId: parent.id,
      track: 'business',
      icon: 'map',
      title: s.title,
      context: `${parent.phase} · Wk ${parent.week_number || ''} · ${parent.title}`,
      done: false,
      linkTo: '/business/roadmap',
    }));
  }

  // No sub-tasks broken out yet — fall back to the parent item itself,
  // same as before.
  return [{
    id: `roadmap-${parent.id}`,
    sourceTable: 'roadmap_items',
    sourceId: parent.id,
    track: 'business',
    icon: 'map',
    title: parent.title,
    context: `${parent.phase} · this week's build`,
    done: parent.status === 'Done',
    linkTo: '/business/roadmap',
  }];
}

async function fetchNudgeItems(userId) {
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const { count } = await supabase
    .from('contacts').select('id', { count: 'exact', head: true })
    .eq('user_id', userId).gte('last_contact_date', weekAgo.toISOString().slice(0, 10));

  const items = [];

  if (!count || count === 0) {
    items.push({
      id: 'nudge-outreach',
      sourceTable: 'nudge',
      sourceId: null,
      track: 'business',
      icon: 'lightbulb',
      title: 'No outreach logged this week',
      context: 'Consider a sphere or partner touch today',
      done: false,
      linkTo: '/business/flows/phone_boundaries',
    });
  }

  const overdueCount = await countOverdue();
  if (overdueCount > 0) {
    items.push({
      id: 'nudge-business-overdue',
      sourceTable: 'nudge',
      sourceId: null,
      track: 'business',
      icon: 'megaphone',
      title: `You have ${overdueCount} overdue Business task${overdueCount === 1 ? '' : 's'}`,
      context: 'Overdue for follow-up — see who in Business Dashboard',
      done: false,
      linkTo: '/business/dashboard',
    });
  }

  return items;
}

async function fetchMaintenanceItems(userId) {
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

async function fetchCustomItems(userId) {
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

export async function getTodayItems() {
  const userId = await getUserId();
  if (!userId) return [];

  const [
    workout, habits, priorities, appts, content, meals,
    followUps, roadmap, nudges, maintenance, custom, dismissed,
  ] = await Promise.all([
    fetchWorkoutItem(userId),
    fetchHabitItems(userId),
    fetchPriorityItems(userId),
    fetchAppointmentItems(userId),
    fetchContentItem(userId),
    fetchMealItems(userId),
    fetchFollowUpItems(userId),
    fetchRoadmapItem(userId),
    fetchNudgeItems(userId),
    fetchMaintenanceItems(userId),
    fetchCustomItems(userId),
    fetchDismissedIds(userId),
  ]);

  const all = [
    ...appts,
    ...(workout ? [workout] : []),
    ...priorities,
    ...meals,
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

export async function toggleTodayItem(item, done) {
  switch (item.sourceTable) {
    case 'habits': {
      const userId = await getUserId();
      if (done) {
        await supabase.from('habit_logs').upsert(
          { user_id: userId, habit_id: item.sourceId, log_date: todayStr(), completed: true },
          { onConflict: 'habit_id,log_date' }
        );
        await logActivity('habits', item.sourceId, 'completed');
      } else {
        await supabase.from('habit_logs').delete()
          .eq('habit_id', item.sourceId).eq('log_date', todayStr());
      }
      return;
    }
    case 'meal_plan_items': {
      const userId = await getUserId();
      await supabase.from('meal_plan_items').update({ eaten: done })
        .eq('user_id', userId).eq('plan_date', todayStr()).eq('meal_type', item.sourceId);
      return;
    }
    case 'daily_priorities':
      await supabase.from('daily_priorities').update({ done }).eq('id', item.sourceId);
      return;
    case 'content_items': {
      const userId = await getUserId();
      if (done) {
        await supabase.from('content_logs').upsert(
          { user_id: userId, content_item_id: item.sourceId, log_date: todayStr(), completed: true },
          { onConflict: 'content_item_id,log_date' }
        );
      } else {
        await supabase.from('content_logs').delete()
          .eq('content_item_id', item.sourceId).eq('log_date', todayStr());
      }
      return;
    }
    case 'roadmap_items':
      await supabase.from('roadmap_items').update({ status: done ? 'Done' : 'Not Started' }).eq('id', item.sourceId);
      return;
    case 'milestones':
      await supabase.from('milestones').update({
        completed: done, completed_date: done ? todayStr() : null,
      }).eq('id', item.sourceId);
      if (item.roadmapItemId) await syncRoadmapItemFromSubtasks(item.roadmapItemId);
      return;
    case 'custom_missions':
      await supabase.from('custom_missions').update({ done }).eq('id', item.sourceId);
      return;
    case 'contacts':
      if (done) {
        await supabase.from('contacts').update({ last_contact_date: todayStr() }).eq('id', item.sourceId);
      }
      return;
    case 'maintenance_items':
      if (done) await completeMaintenanceItem(item.sourceId);
      return;
    default:
      return;
  }
}

export async function dismissTodayItem(item) {
  const userId = await getUserId();
  await supabase.from('mission_item_state').upsert({
    user_id: userId,
    source_table: item.sourceTable,
    source_id: item.sourceId,
    mission_date: todayStr(),
    dismissed: true,
  }, { onConflict: 'user_id,source_table,source_id,mission_date' });
}

export async function addCustomTodayItem(title, track = 'personal') {
  const userId = await getUserId();
  await supabase.from('custom_missions').insert({
    user_id: userId, title, track, mission_date: todayStr(),
  });
}