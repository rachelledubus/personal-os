import React, { useEffect, useState } from 'react';
import Card from '../../components/ui/Card.jsx';
import Button from '../../components/ui/Button.jsx';
import ProgressBar from '../../components/ui/ProgressBar.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import Skeleton from '../../components/ui/Skeleton.jsx';
import {
  addEntry, deleteEntry, listThisMonthEntries, listLegacyBills, getMonthSummary,
  listBudgets, listSavingsGoals, addToSavingsGoal, addSavingsGoal,
  listDebts, addDebt, updateDebt, deleteDebt, logDebtPayment, getTotalDebt, simulateSnowball,
} from '../../services/finance.js';
import { getCategoryList } from '../../services/settings.js';
import {
  getEnvelopeSummary, setStartingAmount, addEnvelope, updateEnvelope, deleteEnvelope,
} from '../../services/envelopeBudget.js';

export default function FinanceTab() {
  const [summary, setSummary] = useState(null);
  const [entries, setEntries] = useState([]);
  const [legacyBills, setLegacyBills] = useState([]);
  const [budgets, setBudgets] = useState([]);
  const [savingsGoals, setSavingsGoals] = useState([]);
  const [expenseCategories, setExpenseCategories] = useState(['Other']);
  const [incomeCategories, setIncomeCategories] = useState(['Other']);
  const [form, setForm] = useState({ entry_type: 'expense', category: 'Other', amount: '', notes: '', is_recurring: false });
  const [addingGoal, setAddingGoal] = useState(false);
  const [newGoal, setNewGoal] = useState({ title: '', target_value: '' });
  const [depositAmounts, setDepositAmounts] = useState({});

  const [envelopeSummary, setEnvelopeSummary] = useState(null);
  const [editingStarting, setEditingStarting] = useState(false);
  const [startingInput, setStartingInput] = useState('');
  const [newEnvelope, setNewEnvelope] = useState({ name: '', assigned_amount: '' });
  const [editingEnvelopeId, setEditingEnvelopeId] = useState(null);
  const [editEnvelope, setEditEnvelope] = useState({ name: '', assigned_amount: '' });

  const [debts, setDebts] = useState([]);
  const [addingDebt, setAddingDebt] = useState(false);
  const [addDebtError, setAddDebtError] = useState(null);
  const [newDebt, setNewDebt] = useState({ name: '', debt_type: 'Credit Card', original_balance: '', interest_rate: '', minimum_payment: '' });
  const [extraMonthly, setExtraMonthly] = useState('');
  const [showSnowball, setShowSnowball] = useState(false);
  const [paymentAmounts, setPaymentAmounts] = useState({});

  async function refresh() {
    setSummary(await getMonthSummary());
    setEntries(await listThisMonthEntries());
    setLegacyBills(await listLegacyBills());
    setBudgets(await listBudgets());
    setSavingsGoals(await listSavingsGoals());
    setExpenseCategories(await getCategoryList('finance_expense_categories'));
    setIncomeCategories(await getCategoryList('finance_income_categories'));
    setEnvelopeSummary(await getEnvelopeSummary());
    setDebts(await listDebts());
  }
  useEffect(() => { refresh(); }, []);

  async function handleAddDebt() {
    if (!newDebt.name.trim()) return;
    setAddDebtError(null);
    try {
      await addDebt(newDebt);
    } catch (err) {
      setAddDebtError(err.message || String(err));
      return;
    }
    setNewDebt({ name: '', debt_type: 'Credit Card', original_balance: '', interest_rate: '', minimum_payment: '' });
    setAddingDebt(false);
    refresh();
  }

  async function handleLogPayment(debt) {
    const amount = Number(paymentAmounts[debt.id]);
    if (!amount) return;
    try {
      await logDebtPayment(debt, amount);
    } catch (err) {
      setAddDebtError(err.message || String(err));
      return;
    }
    setPaymentAmounts({ ...paymentAmounts, [debt.id]: '' });
    refresh();
  }

  async function handleSaveStarting() {
    if (startingInput === '') return;
    await setStartingAmount(Number(startingInput));
    setEditingStarting(false);
    setStartingInput('');
    refresh();
  }

  async function handleAddEnvelope() {
    if (!newEnvelope.name.trim()) return;
    await addEnvelope(newEnvelope.name.trim(), Number(newEnvelope.assigned_amount) || 0);
    setNewEnvelope({ name: '', assigned_amount: '' });
    refresh();
  }

  function startEditEnvelope(env) {
    setEditingEnvelopeId(env.id);
    setEditEnvelope({ name: env.name, assigned_amount: String(env.assigned_amount) });
  }

  async function handleSaveEnvelope(id) {
    if (!editEnvelope.name.trim()) return;
    await updateEnvelope(id, { name: editEnvelope.name.trim(), assigned_amount: Number(editEnvelope.assigned_amount) || 0 });
    setEditingEnvelopeId(null);
    refresh();
  }

  async function handleDeleteEnvelope(id) {
    await deleteEnvelope(id);
    refresh();
  }

  const categories = form.entry_type === 'income' ? incomeCategories : expenseCategories;

  async function handleQuickAdd() {
    if (!form.amount) return;
    await addEntry({
      entry_type: form.entry_type,
      category: form.category,
      amount: Number(form.amount),
      notes: form.notes || null,
      is_recurring: form.entry_type === 'bill' ? form.is_recurring : false,
    });
    setForm({ entry_type: form.entry_type, category: form.category, amount: '', notes: '', is_recurring: false });
    refresh();
  }

  async function handleAddGoal() {
    if (!newGoal.title.trim() || !newGoal.target_value) return;
    await addSavingsGoal({ title: newGoal.title.trim(), target_value: Number(newGoal.target_value) });
    setNewGoal({ title: '', target_value: '' });
    setAddingGoal(false);
    refresh();
  }

  async function handleDeposit(goalId) {
    const amount = Number(depositAmounts[goalId]);
    if (!amount) return;
    await addToSavingsGoal(goalId, amount);
    setDepositAmounts({ ...depositAmounts, [goalId]: '' });
    refresh();
  }

  // Was `if (!summary || !envelopeSummary) return null;` — a blank
  // flash while this loads. Skeleton cards instead, matching the rule
  // from Batch 1 (every loading state renders a shape).
  if (!summary || !envelopeSummary) {
    return (
      <div className="stack" style={{ gap: 'var(--space-4)' }}>
        <Skeleton variant="card" />
        <Skeleton variant="card" />
      </div>
    );
  }

  return (
    <div className="stack" style={{ gap: 'var(--space-4)' }}>
      <Card>
        <div className="row-between">
          <div className="section-label">Budget — every dollar a home</div>
          {!editingStarting && (
            <Button size="sm" variant="text" onClick={() => { setEditingStarting(true); setStartingInput(String(envelopeSummary.starting)); }}>
              Edit starting amount
            </Button>
          )}
        </div>

        {editingStarting ? (
          <div className="row" style={{ marginTop: 'var(--space-2)', gap: 'var(--space-2)' }}>
            <input type="number" placeholder="Starting amount" value={startingInput}
              onChange={e => setStartingInput(e.target.value)} style={{ width: 120 }} />
            <Button size="sm" onClick={handleSaveStarting}>Save</Button>
            <Button size="sm" variant="text" onClick={() => setEditingStarting(false)}>Cancel</Button>
          </div>
        ) : (
          <div className="macro-grid" style={{ marginTop: 'var(--space-3)' }}>
            <div className="macro-cell"><span className="muted">Starting amount</span><div style={{ fontSize: 'var(--text-subtitle)', fontWeight: 700 }}>${envelopeSummary.starting.toFixed(0)}</div></div>
            <div className="macro-cell"><span className="muted">Assigned</span><div style={{ fontSize: 'var(--text-subtitle)', fontWeight: 700 }}>${envelopeSummary.totalAssigned.toFixed(0)}</div></div>
            <div className="macro-cell">
              <span className="muted">Unassigned</span>
              <div style={{ fontSize: 'var(--text-subtitle)', fontWeight: 700, color: envelopeSummary.unassigned < 0 ? 'var(--danger)' : 'var(--success)' }}>
                ${envelopeSummary.unassigned.toFixed(0)}
              </div>
            </div>
          </div>
        )}

        <div className="stack" style={{ marginTop: 'var(--space-4)' }}>
          {envelopeSummary.envelopes.length === 0 ? <EmptyState icon="leaf" title="No envelopes yet — add your first below" /> : (
            envelopeSummary.envelopes.map(env => (
              editingEnvelopeId === env.id ? (
                <div key={env.id} className="row" style={{ gap: 'var(--space-2)', flexWrap: 'wrap' }}>
                  <input value={editEnvelope.name} onChange={e => setEditEnvelope({ ...editEnvelope, name: e.target.value })} style={{ flex: 1, minWidth: 100 }} />
                  <input type="number" value={editEnvelope.assigned_amount} onChange={e => setEditEnvelope({ ...editEnvelope, assigned_amount: e.target.value })} style={{ width: 90 }} />
                  <Button size="sm" variant="ghost" onClick={() => handleSaveEnvelope(env.id)}>Save</Button>
                  <Button size="sm" variant="text" onClick={() => setEditingEnvelopeId(null)}>Cancel</Button>
                </div>
              ) : (
                <div key={env.id}>
                  <div className="row-between" style={{ fontSize: 'var(--text-small)' }}>
                    <span style={{ fontWeight: 700 }}>{env.name}</span>
                    <div className="row" style={{ gap: 'var(--space-2)' }}>
                      <span className={env.remaining < 0 ? 'muted' : 'muted'} style={{ color: env.remaining < 0 ? 'var(--danger)' : undefined }}>
                        ${env.spent.toFixed(0)} / ${Number(env.assigned_amount).toFixed(0)}
                      </span>
                      <Button size="sm" variant="text" onClick={() => startEditEnvelope(env)}>Edit</Button>
                      <Button size="sm" variant="text" onClick={() => handleDeleteEnvelope(env.id)}>Delete</Button>
                    </div>
                  </div>
                  <ProgressBar value={env.spent} max={env.assigned_amount || 1} tone={env.remaining < 0 ? 'danger' : 'sage'} />
                </div>
              )
            ))
          )}
        </div>

        <div className="row" style={{ marginTop: 'var(--space-3)', flexWrap: 'wrap' }}>
          <input placeholder="New envelope name" value={newEnvelope.name}
            onChange={e => setNewEnvelope({ ...newEnvelope, name: e.target.value })} style={{ flex: 1, minWidth: 140 }} />
          <input type="number" placeholder="$ assigned" value={newEnvelope.assigned_amount}
            onChange={e => setNewEnvelope({ ...newEnvelope, assigned_amount: e.target.value })} style={{ width: 100 }} />
          <Button size="sm" onClick={handleAddEnvelope}>+ Add envelope</Button>
        </div>
      </Card>

      <Card>
        <div className="section-label">This month</div>
        <div className="macro-grid" style={{ marginTop: 'var(--space-3)' }}>
          <div className="macro-cell"><span className="muted">Income</span><div style={{ fontSize: 'var(--text-subtitle)', fontWeight: 700 }}>${summary.income.toFixed(0)}</div></div>
          <div className="macro-cell"><span className="muted">Spent</span><div style={{ fontSize: 'var(--text-subtitle)', fontWeight: 700 }}>${summary.spend.toFixed(0)}</div></div>
          <div className="macro-cell"><span className="muted">Net</span><div style={{ fontSize: 'var(--text-subtitle)', fontWeight: 700, color: summary.net >= 0 ? 'var(--success)' : 'var(--danger)' }}>${summary.net.toFixed(0)}</div></div>
        </div>
      </Card>

      <Card>
        <div className="section-label">Quick add</div>
        <div className="row" style={{ marginTop: 'var(--space-3)', flexWrap: 'wrap' }}>
          <select value={form.entry_type} onChange={e => setForm({ ...form, entry_type: e.target.value, category: e.target.value === 'income' ? incomeCategories[0] : expenseCategories[0] })}>
            <option value="expense">Expense</option>
            <option value="bill">Bill</option>
            <option value="income">Income</option>
          </select>
          <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <input type="number" placeholder="Amount" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} style={{ width: 100 }} />
          <input placeholder="Note (optional)" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
          {form.entry_type === 'bill' && (
            <label className="row" style={{ gap: 4, fontSize: 'var(--text-caption)' }}>
              <input type="checkbox" checked={form.is_recurring} onChange={e => setForm({ ...form, is_recurring: e.target.checked })} />
              Recurring monthly
            </label>
          )}
          <Button size="sm" onClick={handleQuickAdd}>+ Add</Button>
        </div>
      </Card>

      <Card>
        <div className="section-label">Spending by category</div>
        <div className="stack" style={{ marginTop: 'var(--space-3)' }}>
          {Object.keys(summary.byCategory).length === 0 ? <EmptyState icon="leaf" title="Nothing logged yet this month" /> : (
            Object.entries(summary.byCategory).map(([cat, amount]) => {
              const budget = budgets.find(b => b.category === cat);
              return (
                <div key={cat}>
                  <div className="row-between" style={{ fontSize: 'var(--text-small)' }}>
                    <span>{cat}</span>
                    <span className="muted">${amount.toFixed(0)}{budget ? ` / ${budget.monthly_target}` : ''}</span>
                  </div>
                  {budget && <ProgressBar value={amount} max={budget.monthly_target} tone={amount > budget.monthly_target ? 'danger' : 'sage'} />}
                </div>
              );
            })
          )}
        </div>
      </Card>

      <Card>
        <div className="section-label">Savings goals</div>
        {savingsGoals.length === 0 ? <EmptyState icon="star" title="No savings goals yet" /> : (
          <div className="stack" style={{ marginTop: 'var(--space-3)' }}>
            {savingsGoals.map(g => (
              <div key={g.id}>
                <div className="row-between" style={{ fontSize: 'var(--text-small)' }}>
                  <span style={{ fontWeight: 700 }}>{g.title}</span>
                  <span className="muted">${(g.current_value || 0).toFixed(0)} / ${g.target_value}</span>
                </div>
                <ProgressBar value={g.current_value || 0} max={g.target_value} tone="gold" />
                <div className="row" style={{ marginTop: 'var(--space-2)' }}>
                  <input type="number" placeholder="Add $" value={depositAmounts[g.id] || ''} onChange={e => setDepositAmounts({ ...depositAmounts, [g.id]: e.target.value })} style={{ width: 90 }} />
                  <Button size="sm" variant="ghost" onClick={() => handleDeposit(g.id)}>Log deposit</Button>
                </div>
              </div>
            ))}
          </div>
        )}
        <div style={{ marginTop: 'var(--space-3)' }}>
          {addingGoal ? (
            <div className="row" style={{ flexWrap: 'wrap' }}>
              <input placeholder="Goal name" value={newGoal.title} onChange={e => setNewGoal({ ...newGoal, title: e.target.value })} />
              <input type="number" placeholder="Target $" value={newGoal.target_value} onChange={e => setNewGoal({ ...newGoal, target_value: e.target.value })} style={{ width: 100 }} />
              <Button size="sm" onClick={handleAddGoal}>Add goal</Button>
              <Button size="sm" variant="text" onClick={() => setAddingGoal(false)}>Cancel</Button>
            </div>
          ) : (
            <Button size="sm" variant="ghost" onClick={() => setAddingGoal(true)}>+ Add savings goal</Button>
          )}
        </div>
      </Card>

      <Card>
        <div className="row-between">
          <div className="section-label">Debts</div>
          {debts.length > 0 && (
            <span className="muted" style={{ fontSize: 'var(--text-caption)' }}>${getTotalDebt(debts).toFixed(0)} total</span>
          )}
        </div>
        {addDebtError && <div className="muted" style={{ fontSize: 'var(--text-micro)', color: 'var(--danger)', marginTop: 4 }}>{addDebtError}</div>}
        {debts.length === 0 ? <EmptyState icon="leaf" title="No debts tracked" /> : (
          <div className="stack" style={{ marginTop: 'var(--space-3)' }}>
            {debts.map(d => (
              <div key={d.id} style={{ padding: '8px 0', borderBottom: '1px solid var(--sand)' }}>
                <div className="row-between">
                  <div>
                    <div style={{ fontWeight: 700 }}>{d.name}</div>
                    <div className="muted" style={{ fontSize: 'var(--text-caption)' }}>
                      {d.debt_type}{d.interest_rate ? ` \u00b7 ${d.interest_rate}% APR` : ''}{d.minimum_payment ? ` \u00b7 $${d.minimum_payment} min` : ''}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 700 }}>${Number(d.current_balance).toFixed(0)}</div>
                    <button className="row-remove-btn" aria-label="Remove" onClick={() => deleteDebt(d.id).then(refresh)}>×</button>
                  </div>
                </div>
                {d.original_balance > 0 && <ProgressBar value={d.original_balance - d.current_balance} max={d.original_balance} tone="sage" />}
                <div className="row" style={{ marginTop: 'var(--space-2)' }}>
                  <input type="number" placeholder="Log a payment" value={paymentAmounts[d.id] || ''}
                    onChange={e => setPaymentAmounts({ ...paymentAmounts, [d.id]: e.target.value })} style={{ width: 120 }} />
                  <Button size="sm" variant="ghost" onClick={() => handleLogPayment(d)}>Log payment</Button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div style={{ marginTop: 'var(--space-3)' }}>
          {addingDebt ? (
            <div className="stack">
              <input placeholder="Debt name (e.g. Visa card)" value={newDebt.name} onChange={e => setNewDebt({ ...newDebt, name: e.target.value })} />
              <select value={newDebt.debt_type} onChange={e => setNewDebt({ ...newDebt, debt_type: e.target.value })}>
                <option value="Credit Card">Credit Card</option>
                <option value="Student Loan">Student Loan</option>
                <option value="Auto Loan">Auto Loan</option>
                <option value="Mortgage">Mortgage</option>
                <option value="Personal Loan">Personal Loan</option>
                <option value="Medical">Medical</option>
                <option value="Other">Other</option>
              </select>
              <div className="row">
                <input type="number" placeholder="Current balance" value={newDebt.original_balance}
                  onChange={e => setNewDebt({ ...newDebt, original_balance: e.target.value })} style={{ width: 130 }} />
                <input type="number" placeholder="Interest rate %" value={newDebt.interest_rate}
                  onChange={e => setNewDebt({ ...newDebt, interest_rate: e.target.value })} style={{ width: 130 }} />
                <input type="number" placeholder="Min payment" value={newDebt.minimum_payment}
                  onChange={e => setNewDebt({ ...newDebt, minimum_payment: e.target.value })} style={{ width: 130 }} />
              </div>
              <div className="row">
                <Button size="sm" onClick={handleAddDebt}>Add debt</Button>
                <Button size="sm" variant="text" onClick={() => setAddingDebt(false)}>Cancel</Button>
              </div>
            </div>
          ) : (
            <Button size="sm" variant="ghost" onClick={() => setAddingDebt(true)}>+ Add debt</Button>
          )}
        </div>
      </Card>

      {debts.length > 0 && (
        <Card>
          <div className="row-between">
            <div className="section-label">Snowball payoff plan</div>
            <Button size="sm" variant="text" onClick={() => setShowSnowball(!showSnowball)}>{showSnowball ? 'Hide' : 'Show'}</Button>
          </div>
          <p className="muted" style={{ fontSize: 'var(--text-caption)', marginTop: 4 }}>
            Smallest balance first — every debt keeps getting its minimum payment, and any extra goes entirely at the smallest one.
            When that's paid off, its payment rolls into the next smallest. The wins come fast at the start, which is the whole point.
          </p>
          {showSnowball && (
            <SnowballPlan debts={debts} extraMonthly={extraMonthly} setExtraMonthly={setExtraMonthly} />
          )}
        </Card>
      )}

      {legacyBills.length > 0 && (
        <Card>
          <div className="section-label">Older bills</div>
          <div className="stack" style={{ marginTop: 'var(--space-2)' }}>
            {legacyBills.map(b => (
              <div key={b.id} className="row-between" style={{ padding: '4px 0' }}>
                <span>{b.name}</span><span className="muted">${b.amount}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card>
        <div className="section-label">Recent entries</div>
        <div className="stack" style={{ marginTop: 'var(--space-2)' }}>
          {entries.slice(0, 15).map(e => (
            <div key={e.id} className="row-between" style={{ fontSize: 'var(--text-small)', padding: '4px 0' }}>
              <span>{e.category}{e.notes ? ` — ${e.notes}` : ''}</span>
              <div className="row" style={{ gap: 'var(--space-2)' }}>
                <span className={e.entry_type === 'income' ? '' : 'muted'}>{e.entry_type === 'income' ? '+' : '-'}${Number(e.amount).toFixed(0)}</span>
                <button className="row-remove-btn" aria-label="Remove" onClick={() => deleteEntry(e.id).then(refresh)}>×</button>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function SnowballPlan({ debts, extraMonthly, setExtraMonthly }) {
  const result = simulateSnowball(debts, Number(extraMonthly) || 0);

  function formatMonths(m) {
    if (m === null) return null;
    const years = Math.floor(m / 12);
    const months = m % 12;
    if (years === 0) return `${months} month${months === 1 ? '' : 's'}`;
    return `${years} year${years === 1 ? '' : 's'}${months ? `, ${months} month${months === 1 ? '' : 's'}` : ''}`;
  }

  return (
    <div style={{ marginTop: 'var(--space-3)' }}>
      <label className="reset-field">
        <span>Extra you can put toward debt each month, beyond minimums</span>
        <input type="number" placeholder="0" value={extraMonthly} onChange={e => setExtraMonthly(e.target.value)} style={{ width: 140 }} />
      </label>

      {result.stalled ? (
        <p style={{ fontSize: 'var(--text-small)', color: 'var(--danger)', marginTop: 'var(--space-3)' }}>
          At these minimums and rates, {result.unresolvedCount} debt{result.unresolvedCount === 1 ? '' : 's'} won't actually shrink over time — the interest is outpacing what's being paid. Adding some extra monthly amount above will change this.
        </p>
      ) : result.totalMonths ? (
        <p style={{ fontSize: 'var(--text-small)', marginTop: 'var(--space-3)' }}>
          Debt-free in <strong>{formatMonths(result.totalMonths)}</strong> at this pace.
        </p>
      ) : null}

      <div className="stack" style={{ marginTop: 'var(--space-3)', gap: 4 }}>
        {result.order.map((d, i) => (
          <div key={d.id} className="row-between" style={{ fontSize: 'var(--text-small)' }}>
            <span>{i + 1}. {d.name}</span>
            <span className="muted">{d.payoffMonth ? `paid off in ${formatMonths(d.payoffMonth)}` : 'beyond 50 years at this pace'}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
