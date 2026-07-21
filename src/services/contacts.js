import { supabase } from '../lib/supabaseClient.js';

// ============================================================
// CRM — rebuilt to match System_07_CRM_Database.xlsx field-for-field.
// This is the real source of truth now, not a thinner copy of it.
// Status and days-until-follow-up are computed here, not stored —
// they're derived from next_follow_up_date, so they're never stale
// the way a manually-typed spreadsheet column would be.
// ============================================================

async function getUserId() {
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id;
}

/** Mirrors the spreadsheet's Status column exactly: On Track / Due
 *  Soon / Overdue / No Next Action / No Date Set. */
export function computeStatus(contact) {
  if (!contact.next_action) return 'No Next Action';
  if (!contact.next_follow_up_date) return 'No Date Set';
  const days = daysUntil(contact.next_follow_up_date);
  if (days < 0) return 'Overdue';
  if (days <= 3) return 'Due Soon';
  return 'On Track';
}

export function daysUntil(dateStr) {
  if (!dateStr) return null;
  const diffMs = new Date(dateStr) - new Date(new Date().toISOString().slice(0, 10));
  return Math.round(diffMs / 86400000);
}

export async function listContacts(category = null) {
  const userId = await getUserId();
  let query = supabase.from('contacts').select('*').eq('user_id', userId)
    .order('next_follow_up_date', { ascending: true, nullsFirst: false });
  if (category) query = query.eq('category', category);
  const { data, error } = await query;
  if (error) throw error;
  return (data || []).map(c => ({ ...c, status: computeStatus(c), daysUntilFollowup: daysUntil(c.next_follow_up_date) }));
}

/** Filtered by relationship tier — this is what replaces having
 *  separate Sphere/Community/Professional Network pages. Same table,
 *  same contact, just a different lens on it. */
export async function listByTier(tier) {
  const userId = await getUserId();
  const { data, error } = await supabase.from('contacts').select('*')
    .eq('user_id', userId).eq('relationship_tier', tier)
    .order('next_follow_up_date', { ascending: true, nullsFirst: false });
  if (error) throw error;
  return (data || []).map(c => ({ ...c, status: computeStatus(c), daysUntilFollowup: daysUntil(c.next_follow_up_date) }));
}

export async function listOverdue() {
  const userId = await getUserId();
  const today = new Date().toISOString().slice(0, 10);
  const { data, error } = await supabase.from('contacts').select('*')
    .eq('user_id', userId).lt('next_follow_up_date', today).not('next_follow_up_date', 'is', null);
  if (error) throw error;
  return data || [];
}

export async function getContact(id) {
  const { data, error } = await supabase.from('contacts').select('*').eq('id', id).single();
  if (error) throw error;
  return { ...data, status: computeStatus(data), daysUntilFollowup: daysUntil(data.next_follow_up_date) };
}

export async function addContact(fields) {
  const userId = await getUserId();
  const { data, error } = await supabase.from('contacts').insert({ ...fields, user_id: userId }).select().single();
  if (error) throw error;
  return data;
}

export async function updateContact(id, fields) {
  const { error } = await supabase.from('contacts').update(fields).eq('id', id);
  if (error) throw error;
}

export async function deleteContact(id) {
  const { error } = await supabase.from('contacts').delete().eq('id', id);
  if (error) throw error;
}

export async function listPipelineDeals() {
  const userId = await getUserId();
  const { data, error } = await supabase.from('pipeline_deals').select('*').eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

/** AI-drafted follow-up from CRM context — A5. Graceful-degrade like
 *  every other AI feature: null if the function isn't configured. */
export async function requestFollowUpDraft(contact) {
  try {
    const res = await fetch('/.netlify/functions/draft-followup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contact }),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

// ---------- Database health — the spreadsheet's own Dashboard sheet, computed live ----------
export async function getDatabaseHealth() {
  const userId = await getUserId();
  const { data, error } = await supabase.from('contacts').select('next_action, next_follow_up_date, created_at')
    .eq('user_id', userId);
  if (error) throw error;
  const contacts = data || [];
  const monthAgo = new Date(); monthAgo.setDate(monthAgo.getDate() - 30);
  const newThisMonth = contacts.filter(c => c.created_at && new Date(c.created_at) >= monthAgo).length;
  const withNextAction = contacts.filter(c => c.next_action).length;
  const overdue = contacts.filter(c => c.next_follow_up_date && daysUntil(c.next_follow_up_date) < 0).length;
  return {
    total: contacts.length,
    newThisMonth,
    withNextAction,
    completeness: contacts.length ? Math.round((withNextAction / contacts.length) * 100) : 100,
    overdue,
  };
}
