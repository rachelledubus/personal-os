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

// ============================================================
// DEBT TRACKER
// Balance lives on the debt row itself. Logging a payment both
// reduces that balance AND inserts a real finance_entries expense row
// (category "Debt Payment"), so a debt payment shows up in the
// existing monthly summary too — not a second, disconnected place to
// look for where money went.
// ============================================================

export async function listDebts() {
  const userId = await getUserId();
  const { data, error } = await supabase.from('debts').select('*').eq('user_id', userId).order('current_balance', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function addDebt(fields) {
  const userId = await getUserId();
  const { error } = await supabase.from('debts').insert({
    ...fields, user_id: userId, current_balance: fields.current_balance ?? fields.original_balance ?? 0,
  });
  if (error) throw error;
}

export async function updateDebt(id, fields) {
  const { error } = await supabase.from('debts').update(fields).eq('id', id);
  if (error) throw error;
}

export async function deleteDebt(id) {
  const { error } = await supabase.from('debts').delete().eq('id', id);
  if (error) throw error;
}

/** Reduces the balance and logs a real expense entry in the same
 *  action — the two things a debt payment actually is, done together
 *  instead of two separate steps you could forget to do both of. */
export async function logDebtPayment(debt, amount) {
  const userId = await getUserId();
  const newBalance = Math.max(0, Number(debt.current_balance) - Number(amount));
  const { error: updateErr } = await supabase.from('debts').update({ current_balance: newBalance }).eq('id', debt.id);
  if (updateErr) throw updateErr;
  const { error: entryErr } = await supabase.from('finance_entries').insert({
    user_id: userId, entry_type: 'expense', category: 'Debt Payment', amount, notes: debt.name,
  });
  if (entryErr) throw entryErr;
  return newBalance;
}

export function getTotalDebt(debts) {
  return debts.reduce((sum, d) => sum + Number(d.current_balance || 0), 0);
}
