import { supabase } from '../lib/supabaseClient.js';
import { getCustomAiInstructions } from './settings.js';
import { getCadenceStandards, standardKeyForContact } from './followupStandards.js';

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

/** Mirrors the spreadsheet's Status column: On Track / Due Soon /
 *  Overdue / No Next Action / No Date Set — plus one real change:
 *  "Both, plus status changes" per the follow-up standards decision.
 *  A contact with an explicit next_follow_up_date is judged against
 *  that date exactly as before — unchanged. A contact with NO date
 *  used to read as "No Next Action"/"No Date Set" forever, even after
 *  months of silence. Now, if there's no explicit date, it's checked
 *  against its category's cadence standard (see followupStandards.js)
 *  first — measured from last contact, or creation if never
 *  contacted — and only falls through to the old labels if it's still
 *  within that window. That's what catches a Sphere contact nobody's
 *  touched in 200 days instead of it staying silently invisible. */
export function computeStatus(contact, cadenceDays = {}) {
  const explicitDate = contact.next_follow_up_date;
  if (!explicitDate) {
    const standardKey = standardKeyForContact(contact);
    const cadence = standardKey ? cadenceDays[standardKey] : null;
    const anchor = contact.last_contact_date || contact.created_at;
    if (cadence != null && anchor && daysSince(anchor) > cadence) return 'Overdue';
  }
  if (!contact.next_action) return 'No Next Action';
  if (!explicitDate) return 'No Date Set';
  const days = daysUntil(explicitDate);
  if (days < 0) return 'Overdue';
  if (days <= 3) return 'Due Soon';
  return 'On Track';
}

export function daysUntil(dateStr) {
  if (!dateStr) return null;
  const diffMs = new Date(dateStr) - new Date(new Date().toISOString().slice(0, 10));
  return Math.round(diffMs / 86400000);
}

/** Days elapsed since a past date (created_at, last_contact_date) —
 *  the mirror of daysUntil, which is future-facing. */
export function daysSince(dateStr) {
  if (!dateStr) return null;
  const diffMs = new Date(new Date().toISOString().slice(0, 10)) - new Date(String(dateStr).slice(0, 10));
  return Math.round(diffMs / 86400000);
}

export async function listContacts(category = null) {
  const userId = await getUserId();
  const cadence = await getCadenceStandards();
  let query = supabase.from('contacts').select('*').eq('user_id', userId)
    .order('next_follow_up_date', { ascending: true, nullsFirst: false });
  if (category) query = query.eq('category', category);
  const { data, error } = await query;
  if (error) throw error;
  return (data || []).map(c => ({ ...c, status: computeStatus(c, cadence), daysUntilFollowup: daysUntil(c.next_follow_up_date) }));
}

/** Filtered by relationship tier — this is what replaces having
 *  separate Sphere/Community/Professional Network pages. Same table,
 *  same contact, just a different lens on it. */
export async function listByTier(tier) {
  const userId = await getUserId();
  const cadence = await getCadenceStandards();
  const { data, error } = await supabase.from('contacts').select('*')
    .eq('user_id', userId).eq('relationship_tier', tier)
    .order('next_follow_up_date', { ascending: true, nullsFirst: false });
  if (error) throw error;
  return (data || []).map(c => ({ ...c, status: computeStatus(c, cadence), daysUntilFollowup: daysUntil(c.next_follow_up_date) }));
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
  const cadence = await getCadenceStandards();
  const { data, error } = await supabase.from('contacts').select('*').eq('id', id).single();
  if (error) throw error;
  return { ...data, status: computeStatus(data, cadence), daysUntilFollowup: daysUntil(data.next_follow_up_date) };
}

/** "Active" half of the follow-up standards decision: if the caller
 *  didn't set a next_follow_up_date, suggest one from the contact's
 *  cadence standard so you don't have to calculate it yourself. Never
 *  overrides a date you did set. */
export async function addContact(fields) {
  const userId = await getUserId();
  let toInsert = { ...fields };
  if (!toInsert.next_follow_up_date) {
    const standardKey = standardKeyForContact(toInsert);
    if (standardKey) {
      const cadence = await getCadenceStandards();
      const days = cadence[standardKey];
      if (days != null) {
        const suggested = new Date();
        suggested.setDate(suggested.getDate() + days);
        toInsert.next_follow_up_date = suggested.toISOString().slice(0, 10);
      }
    }
  }
  const { data, error } = await supabase.from('contacts').insert({ ...toInsert, user_id: userId }).select().single();
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

export async function searchContactsByName(query) {
  if (!query || query.length < 2) return [];
  const userId = await getUserId();
  const { data, error } = await supabase.from('contacts').select('id, name, category')
    .eq('user_id', userId).ilike('name', `%${query}%`).limit(6);
  if (error) throw error;
  return data;
}

// ---------- Relationship tier: inferred, not manually decided ----------
// Category already tells you most of what tier means — asking for
// both is asking twice for the same signal. This is a default, always
// visible and overridable, never silently forced.
const TIER_DEFAULT_BY_CATEGORY = {
  Sphere: 'Tier 2 - Developing',
  Partner: 'Tier 3 - Strategic',
  'Agent Referral': 'Tier 3 - Strategic',
};

export function inferDefaultTier(category) {
  return TIER_DEFAULT_BY_CATEGORY[category] || null;
}

/** Tags every untiered Sphere/Partner/Agent Referral contact with its
 *  inferred default in one call — the "why am I doing this one at a
 *  time" fix for what used to be a manual per-contact decision. */
export async function autoTagUntieredContacts() {
  const userId = await getUserId();
  const { data, error } = await supabase.from('contacts').select('id, category')
    .eq('user_id', userId).is('relationship_tier', null).in('category', Object.keys(TIER_DEFAULT_BY_CATEGORY));
  if (error) throw error;
  const updates = (data || [])
    .map(c => ({ id: c.id, tier: inferDefaultTier(c.category) }))
    .filter(u => u.tier);
  await Promise.all(updates.map(u => supabase.from('contacts').update({ relationship_tier: u.tier }).eq('id', u.id)));
  return updates.length;
}

/** AI-drafted follow-up from CRM context — A5. Graceful-degrade like
 *  every other AI feature: null if the function isn't configured. */
export async function requestFollowUpDraft(contact) {
  try {
    const customInstructions = await getCustomAiInstructions();
    const res = await fetch('/.netlify/functions/draft-followup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contact, customInstructions }),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

// ---------- Pipeline health — counts, stage breakdown, stalled leads ----------
export async function getPipelineHealth() {
  const userId = await getUserId();
  const cadence = await getCadenceStandards();
  const { data, error } = await supabase.from('contacts')
    .select('category, lead_stage, next_action, next_follow_up_date, last_contact_date, created_at')
    .eq('user_id', userId).in('category', ['Lead', 'Future Client', 'Active Client']);
  if (error) throw error;
  const contacts = (data || []).map(c => ({ ...c, status: computeStatus(c, cadence) }));
  const byCategory = {};
  contacts.forEach(c => { byCategory[c.category] = (byCategory[c.category] || 0) + 1; });
  const byStage = {};
  contacts.filter(c => c.lead_stage).forEach(c => { byStage[c.lead_stage] = (byStage[c.lead_stage] || 0) + 1; });
  return {
    total: contacts.length,
    byCategory,
    byStage,
    stalled: contacts.filter(c => c.status === 'Overdue').length,
  };
}

// ---------- Relationship health — tier breakdown, on-track vs overdue ----------
export async function getRelationshipHealth() {
  const userId = await getUserId();
  const cadence = await getCadenceStandards();
  const { data, error } = await supabase.from('contacts')
    .select('relationship_tier, category, next_action, next_follow_up_date, last_contact_date, created_at')
    .eq('user_id', userId).not('relationship_tier', 'is', null);
  if (error) throw error;
  const contacts = (data || []).map(c => ({ ...c, status: computeStatus(c, cadence) }));
  const byTier = {};
  ['Tier 1 - Core', 'Tier 2 - Developing', 'Tier 3 - Strategic'].forEach(tier => {
    const inTier = contacts.filter(c => c.relationship_tier === tier);
    const overdue = inTier.filter(c => c.status === 'Overdue').length;
    const recencies = inTier.map(c => daysSince(c.last_contact_date)).filter(d => d != null);
    const avgDaysSinceContact = recencies.length ? Math.round(recencies.reduce((a, b) => a + b, 0) / recencies.length) : null;
    byTier[tier] = { total: inTier.length, overdue, avgDaysSinceContact };
  });
  return byTier;
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
