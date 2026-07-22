import { supabase } from '../lib/supabaseClient.js';
import { listThisMonthEntries } from './finance.js';

// ============================================================
// ENVELOPE BUDGET — "every dollar assigned a home"
// Separate from category_budgets (target-vs-actual, hardcoded category
// list). Envelopes are fully user-managed and start from a pot amount
// she sets herself. "Spent" per envelope is computed live from
// finance_entries (matching category name), never stored twice.
// ============================================================

async function getUserId() {
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id;
}

export async function getStartingAmount() {
  const userId = await getUserId();
  const { data, error } = await supabase.from('budget_setup').select('*').eq('user_id', userId).maybeSingle();
  if (error) throw error;
  return data?.starting_amount || 0;
}

export async function setStartingAmount(amount) {
  const userId = await getUserId();
  const { error } = await supabase.from('budget_setup').upsert(
    { user_id: userId, starting_amount: amount, updated_at: new Date().toISOString() },
    { onConflict: 'user_id' }
  );
  if (error) throw error;
}

export async function listEnvelopes() {
  const userId = await getUserId();
  const { data, error } = await supabase.from('budget_envelopes').select('*').eq('user_id', userId).order('sort_order');
  if (error) throw error;
  return data;
}

export async function addEnvelope(name, assignedAmount = 0) {
  const userId = await getUserId();
  const existing = await listEnvelopes();
  const { error } = await supabase.from('budget_envelopes').insert({
    user_id: userId, name, assigned_amount: assignedAmount, sort_order: existing.length,
  });
  if (error) throw error;
}

export async function updateEnvelope(id, fields) {
  const { error } = await supabase.from('budget_envelopes').update(fields).eq('id', id);
  if (error) throw error;
}

export async function deleteEnvelope(id) {
  const { error } = await supabase.from('budget_envelopes').delete().eq('id', id);
  if (error) throw error;
}

/** The main read: every envelope with what's actually been spent this
 *  month against it (matched by category name to finance_entries),
 *  plus the unassigned amount still left to give a home to. */
export async function getEnvelopeSummary() {
  const [starting, envelopes, entries] = await Promise.all([
    getStartingAmount(),
    listEnvelopes(),
    listThisMonthEntries(),
  ]);

  const spentByCategory = {};
  entries.filter(e => e.entry_type !== 'income').forEach(e => {
    spentByCategory[e.category] = (spentByCategory[e.category] || 0) + Number(e.amount);
  });

  const withSpent = envelopes.map(env => {
    const spent = spentByCategory[env.name] || 0;
    return { ...env, spent, remaining: env.assigned_amount - spent };
  });

  const totalAssigned = envelopes.reduce((s, e) => s + Number(e.assigned_amount), 0);

  return {
    starting,
    envelopes: withSpent,
    totalAssigned,
    unassigned: starting - totalAssigned,
  };
}
