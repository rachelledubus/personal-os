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

// ============================================================
// Migrates category_budgets targets into real envelopes before the
// old "Spending by category" system is retired \u2014 it was doing
// exactly what envelopes already do (spend computed live from
// finance_entries, matched by name/category), just via a second,
// separate table. This preserves the target $ numbers rather than
// silently dropping them. Only touches categories that don't already
// have a matching envelope, so nothing gets double-counted.
// ============================================================
export async function migrateCategoryBudgetsToEnvelopes() {
  const userId = await getUserId();
  const [budgets, envelopes] = await Promise.all([
    supabase.from('category_budgets').select('*').eq('user_id', userId).then(r => r.data || []),
    supabase.from('budget_envelopes').select('name').eq('user_id', userId).then(r => r.data || []),
  ]);
  const envelopeNames = new Set(envelopes.map(e => e.name));
  const toMigrate = budgets.filter(b => !envelopeNames.has(b.category));

  for (let i = 0; i < toMigrate.length; i++) {
    const b = toMigrate[i];
    await supabase.from('budget_envelopes').insert({
      user_id: userId, name: b.category, assigned_amount: b.monthly_target, sort_order: envelopes.length + i,
    });
  }
  // Also remove every category_budgets row, migrated or not — once
  // this runs, the old system is retired entirely, not left half-
  // populated. Anything that already had a matching envelope (so
  // wasn't in toMigrate) is redundant with that envelope already.
  const allIds = budgets.map(b => b.id);
  if (allIds.length > 0) {
    await supabase.from('category_budgets').delete().in('id', allIds);
  }
  return { migrated: toMigrate.length, removed: allIds.length };
}

/** Debt Snowball — smallest balance first (not smallest term, not
 *  highest interest — that's the Avalanche method, a different
 *  thing). Every debt's minimum payment gets paid every month; any
 *  extra goes entirely at the smallest remaining balance. When that
 *  one hits zero, its minimum payment rolls into the extra amount
 *  for the next-smallest — the "snowball" getting bigger. This is a
 *  real month-by-month simulation (interest accrues monthly on
 *  whatever balance remains), not just a sorted list. */
export function simulateSnowball(debts, extraMonthly = 0) {
  const MAX_MONTHS = 600; // 50-year safety cap, in case minimums don't outpace interest

  const ordered = [...debts]
    .sort((a, b) => Number(a.current_balance) - Number(b.current_balance))
    .map(d => ({
      id: d.id, name: d.name,
      balance: Number(d.current_balance) || 0,
      minPayment: Number(d.minimum_payment) || 0,
      rate: Number(d.interest_rate) || 0,
    }));

  const payoffMonth = {};
  let freedUp = 0;
  let month = 0;
  let stalled = false;

  while (ordered.some(d => d.balance > 0) && month < MAX_MONTHS) {
    month += 1;
    let availableExtra = extraMonthly + freedUp;
    let anyProgress = false;

    for (const d of ordered) {
      if (d.balance <= 0) continue;
      const before = d.balance;

      d.balance += d.balance * (d.rate / 100 / 12); // monthly interest accrual
      d.balance -= Math.min(d.minPayment, d.balance); // minimum payment, every debt, every month

      if (availableExtra > 0 && d.balance > 0) {
        const extra = Math.min(availableExtra, d.balance);
        d.balance -= extra;
        availableExtra -= extra;
      }

      if (d.balance < before) anyProgress = true;

      if (d.balance <= 0.5 && !payoffMonth[d.id]) {
        d.balance = 0;
        payoffMonth[d.id] = month;
        freedUp += d.minPayment; // the snowball grows
      }
    }

    if (!anyProgress) { stalled = true; break; } // minimums don't even cover interest — no amount of time fixes this without a plan change
  }

  const stillOwing = ordered.filter(d => d.balance > 0);
  return {
    order: ordered.map(d => ({ id: d.id, name: d.name, payoffMonth: payoffMonth[d.id] || null })),
    totalMonths: stillOwing.length === 0 ? month : null,
    stalled,
    unresolvedCount: stillOwing.length,
  };
}
