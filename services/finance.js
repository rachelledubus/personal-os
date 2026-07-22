import { supabase } from '../lib/supabaseClient.js';
import { currentMonthStr } from '../utils/date.js';

// ============================================================
// FINANCE
// Deliberately low-effort: one entry form covers income/expense/bill.
// Budget-by-category is computed from what's actually logged, not a
// separate manual budgeting step — a target is optional, never required
// before the view is useful. Savings goals aren't tracked here at all;
// they're `goals` rows with category='Financial', reusing what already
// exists instead of a parallel concept.
// ============================================================

async function getUserId() {
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id;
}

export async function addEntry(fields) {
  const userId = await getUserId();
  const { error } = await supabase.from('finance_entries').insert({ ...fields, user_id: userId });
  if (error) throw error;
}

export async function deleteEntry(id) {
  const { error } = await supabase.from('finance_entries').delete().eq('id', id);
  if (error) throw error;
}

/** Everything logged this month, newest first — the raw feed. */
export async function listThisMonthEntries() {
  const userId = await getUserId();
  const monthPrefix = currentMonthStr(); // "YYYY-MM"
  const { data, error } = await supabase
    .from('finance_entries').select('*').eq('user_id', userId)
    .gte('occurred_date', `${monthPrefix}-01`).order('occurred_date', { ascending: false });
  if (error) throw error;
  return data;
}

/** Legacy bills — still shown so nothing that existed before silently
 *  disappears, even though new bills go into finance_entries now. */
export async function listLegacyBills() {
  const userId = await getUserId();
  const { data, error } = await supabase.from('bills').select('*').eq('user_id', userId);
  if (error) throw error;
  return data;
}

/** This month's totals, split by type and by category — what the
 *  Finance tab's summary cards and budget bars read from. */
export async function getMonthSummary() {
  const entries = await listThisMonthEntries();
  const income = entries.filter(e => e.entry_type === 'income').reduce((s, e) => s + Number(e.amount), 0);
  const spendEntries = entries.filter(e => e.entry_type !== 'income');
  const spend = spendEntries.reduce((s, e) => s + Number(e.amount), 0);

  const byCategory = {};
  spendEntries.forEach(e => {
    byCategory[e.category] = (byCategory[e.category] || 0) + Number(e.amount);
  });

  return { income, spend, net: income - spend, byCategory };
}

export async function listBudgets() {
  const userId = await getUserId();
  const { data, error } = await supabase.from('category_budgets').select('*').eq('user_id', userId);
  if (error) throw error;
  return data;
}

export async function setBudget(category, monthlyTarget) {
  const userId = await getUserId();
  const { error } = await supabase.from('category_budgets').upsert({
    user_id: userId, category, monthly_target: monthlyTarget,
  }, { onConflict: 'user_id,category' });
  if (error) throw error;
}

// ---------- Savings goals (= goals where category = 'Financial') ----------

export async function listSavingsGoals() {
  const userId = await getUserId();
  const { data, error } = await supabase
    .from('goals').select('*').eq('user_id', userId).eq('category', 'Financial')
    .order('target_date', { ascending: true, nullsFirst: false });
  if (error) throw error;
  return data;
}

/** One-tap "log a deposit" — bumps current_value, the whole update. */
export async function addToSavingsGoal(goalId, amount) {
  const { data: goal, error: fetchErr } = await supabase.from('goals').select('current_value').eq('id', goalId).single();
  if (fetchErr) throw fetchErr;
  const { error } = await supabase.from('goals')
    .update({ current_value: (goal.current_value || 0) + amount })
    .eq('id', goalId);
  if (error) throw error;
}

export async function addSavingsGoal(fields) {
  const userId = await getUserId();
  const { error } = await supabase.from('goals').insert({
    ...fields, user_id: userId, category: 'Financial', current_value: fields.current_value || 0,
  });
  if (error) throw error;
}
