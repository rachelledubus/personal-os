import { supabase } from '../lib/supabaseClient.js';

// ============================================================
// NEGLECTED PRIORITIES
// Looks across goals, relationships, habits, and maintenance at once
// — nothing else in the app does that. Every signal here is a plain
// query against existing tables, no new schema, no black-box AI call.
// Transparent by design: you can always see exactly why something
// is listed.
// ============================================================

async function getUserId() {
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id;
}

function daysSince(dateStr) {
  if (!dateStr) return 9999;
  return Math.floor((new Date() - new Date(dateStr)) / 86400000);
}

export async function getNeglectedPriorities() {
  const userId = await getUserId();

  const [{ data: goals }, { data: contacts }, { data: habits }, { data: habitLogs }, { data: maintenance }] = await Promise.all([
    supabase.from('goals').select('id, title, updated_at, status').eq('user_id', userId).eq('status', 'In Progress'),
    supabase.from('contacts').select('id, name, last_contact_date, relationship_tier').eq('user_id', userId).eq('relationship_tier', 'Tier 1 - Core'),
    supabase.from('habits').select('id, name').eq('user_id', userId),
    supabase.from('habit_logs').select('habit_id, log_date').eq('user_id', userId).gte('log_date', new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10)),
    supabase.from('maintenance_items').select('id, title, next_due_date').eq('user_id', userId),
  ]);

  const results = [];

  (goals || []).forEach(g => {
    const days = daysSince(g.updated_at);
    if (days >= 21) results.push({ type: 'goal', id: g.id, label: g.title, days, detail: `No movement in ${days} days`, link: '/plan/goals' });
  });

  (contacts || []).forEach(c => {
    const days = daysSince(c.last_contact_date);
    if (days >= 45) results.push({ type: 'relationship', id: c.id, label: c.name, days, detail: c.last_contact_date ? `Last contact ${days} days ago` : 'No contact logged yet', link: '/business/relationships' });
  });

  const loggedHabitIds = new Set((habitLogs || []).map(l => l.habit_id));
  (habits || []).forEach(h => {
    if (!loggedHabitIds.has(h.id)) results.push({ type: 'habit', id: h.id, label: h.name, days: 7, detail: 'No check-ins this week', link: '/grow/habits' });
  });

  const today = new Date().toISOString().slice(0, 10);
  (maintenance || []).forEach(m => {
    if (m.next_due_date && m.next_due_date < today) {
      const days = daysSince(m.next_due_date);
      if (days >= 7) results.push({ type: 'maintenance', id: m.id, label: m.title, days, detail: `${days} days overdue`, link: '/grow/maintenance' });
    }
  });

  // Most-neglected first, capped so this stays a glance, not a list to manage
  return results.sort((a, b) => b.days - a.days).slice(0, 5);
}
