import { supabase } from '../lib/supabaseClient.js';
import { addMaintenanceItem } from './maintenance.js';

// ============================================================
// TRANSACTION REVIEW LOG (System 00J)
// Filling this in after a closing now DOES things, instead of being a
// template that gets filled in once and never looked at again:
// - checking "past-client plan" schedules the real 30/90/365 reminders
//   (reuses maintenance_items — same reminder engine as everything else)
// - checking "content idea" creates a capture_items row so it actually
//   shows up in the Inbox to get sorted, not just a checked box
// ============================================================

async function getUserId() {
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id;
}

export async function listTransactions() {
  const userId = await getUserId();
  const { data, error } = await supabase.from('transactions').select('*, contacts(name)')
    .eq('user_id', userId).order('closing_date', { ascending: false });
  if (error) throw error;
  return data;
}

export async function addTransaction(fields) {
  const userId = await getUserId();
  const { contacts_name, ...dbFields } = fields;
  const { data, error } = await supabase.from('transactions').insert({ ...dbFields, user_id: userId }).select().single();
  if (error) throw error;

  // The automations — this is what makes logging a transaction worth
  // doing instead of skipping.
  if (fields.added_to_past_client_plan && fields.closing_date) {
    const clientName = contacts_name || 'client';
    await Promise.all([
      addMaintenanceItem({ title: `30-day check-in: ${clientName}`, area: 'other', next_due_date: addDays(fields.closing_date, 30) }),
      addMaintenanceItem({ title: `90-day check-in: ${clientName}`, area: 'other', next_due_date: addDays(fields.closing_date, 90) }),
      addMaintenanceItem({ title: `1-year home anniversary: ${clientName}`, area: 'other', next_due_date: addDays(fields.closing_date, 365) }),
    ]);
  }

  if (fields.content_idea_added && fields.lesson_learned) {
    await supabase.from('capture_items').insert({
      user_id: userId, raw_text: fields.lesson_learned, capture_type: 'content_idea', status: 'unsorted',
    });
  }

  return data;
}

function addDays(dateStr, days) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}
