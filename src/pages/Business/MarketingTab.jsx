import React, { useEffect, useState } from 'react';
import { Target } from 'lucide-react';
import Card from '../../components/ui/Card.jsx';
import Button from '../../components/ui/Button.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import { listMarketingActivities, addMarketingActivity, updateMarketingActivity, completeMarketingActivity, deleteMarketingActivity } from '../../services/marketing.js';
import { getCategoryList } from '../../services/settings.js';
import { listGoals } from '../../services/goals.js';

function truncateGoalTitle(title, max = 34) {
  if (!title) return '';
  return title.length > max ? title.slice(0, max).trim() + '…' : title;
}

// ============================================================
// MARKETING — Relationship Marketing / Farming / Networking / Events /
// Campaigns (PRD Module 4). Deliberately separate from ContentTab:
// that tab is the written-content pipeline (brief -> repurpose);
// this tab is dated, real-world activities that aren't "content" —
// a mailer drop, a client appreciation call, a networking event.
// ============================================================
export default
function MarketingTab() {
  const [activities, setActivities] = useState([]);
  const [categories, setCategories] = useState([]);
  const [goals, setGoals] = useState([]);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ title: '', category: '', activity_date: '', notes: '', goal_id: '' });
  const [filter, setFilter] = useState('All');
  const [linkingGoalFor, setLinkingGoalFor] = useState(null);

  async function refresh() {
    setActivities(await listMarketingActivities());
    setCategories(await getCategoryList('marketing_activity_categories'));
    setGoals(await listGoals());
  }
  useEffect(() => { refresh(); }, []);

  async function handleAdd() {
    if (!form.title.trim() || !form.category) return;
    await addMarketingActivity({ ...form, activity_date: form.activity_date || null, goal_id: form.goal_id || null });
    setForm({ title: '', category: categories[0] || '', activity_date: '', notes: '', goal_id: '' });
    setAdding(false);
    refresh();
  }

  async function handleLinkGoal(activity, goalId) {
    await updateMarketingActivity(activity.id, { goal_id: goalId || null });
    setLinkingGoalFor(null);
    refresh();
  }

  async function handleComplete(activity) {
    await completeMarketingActivity(activity.id);
    refresh();
  }

  async function handleDelete(activity) {
    await deleteMarketingActivity(activity.id);
    refresh();
  }

  const filtered = filter === 'All' ? activities : activities.filter(a => a.category === filter);
  const planned = filtered.filter(a => a.status === 'planned');
  const completed = filtered.filter(a => a.status === 'completed');

  return (
    <div className="stack" style={{ gap: 'var(--space-4)' }}>
      <Card>
        <div className="row-between">
          <div className="section-label">Marketing Calendar</div>
          <Button size="sm" variant="ghost" onClick={() => setAdding(!adding)}>{adding ? 'Cancel' : '+ Add activity'}</Button>
        </div>

        {adding && (
          <div className="row" style={{ marginTop: 'var(--space-3)', flexWrap: 'wrap' }}>
            <input placeholder="Activity title" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
            <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
              <option value="">Select category...</option>
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <input type="date" value={form.activity_date} onChange={e => setForm({ ...form, activity_date: e.target.value })} />
            {goals.length > 0 && (
              <select value={form.goal_id} onChange={e => setForm({ ...form, goal_id: e.target.value })}>
                <option value="">Not linked to a goal</option>
                {goals.map(g => <option key={g.id} value={g.id}>{truncateGoalTitle(g.title)}</option>)}
              </select>
            )}
            <Button size="sm" onClick={handleAdd}>Save</Button>
          </div>
        )}
        {adding && (
          <textarea placeholder="Notes (optional)" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })}
            style={{ marginTop: 'var(--space-2)', minHeight: 50, width: '100%' }} />
        )}

        <div className="row" style={{ marginTop: 'var(--space-3)', flexWrap: 'wrap', gap: 4 }}>
          {['All', ...categories].map(c => (
            <button key={c} className={`sub-tab ${filter === c ? 'active' : ''}`} style={{ fontSize: 'var(--text-micro)' }} onClick={() => setFilter(c)}>{c}</button>
          ))}
        </div>
      </Card>

      <Card>
        <div className="section-label">Planned · {planned.length}</div>
        {planned.length === 0 ? <EmptyState icon="sparkles" title="Nothing planned yet" /> : (
          <div className="stack" style={{ marginTop: 'var(--space-2)' }}>
            {planned.map(a => (
              <div key={a.id} className="row-between" style={{ borderBottom: '1px solid var(--sand)', padding: '8px 0' }}>
                <div>
                  <div style={{ fontWeight: 700 }}>{a.title}</div>
                  <div className="muted" style={{ fontSize: 'var(--text-caption)' }}>{a.category}{a.activity_date && ` · ${a.activity_date}`}</div>
                  {a.notes && <div className="muted" style={{ fontSize: 'var(--text-caption)', marginTop: 2 }}>{a.notes}</div>}
                  {goals.length > 0 && (
                    <div style={{ marginTop: 4 }}>
                      {linkingGoalFor === a.id ? (
                        <select style={{ fontSize: 'var(--text-micro)' }} autoFocus value={a.goal_id || ''}
                          onChange={e => handleLinkGoal(a, e.target.value)} onBlur={() => setLinkingGoalFor(null)}>
                          <option value="">Not linked</option>
                          {goals.map(g => <option key={g.id} value={g.id}>{truncateGoalTitle(g.title)}</option>)}
                        </select>
                      ) : (
                        <button className="sub-tab" style={{ fontSize: 'var(--text-micro)' }} onClick={() => setLinkingGoalFor(a.id)}>
                          {a.goals?.title ? <><Target size={11} style={{ verticalAlign: 'middle', marginRight: 3 }} />{truncateGoalTitle(a.goals.title)}</> : '+ Link goal'}
                        </button>
                      )}
                    </div>
                  )}
                </div>
                <div className="row" style={{ gap: 'var(--space-2)' }}>
                  <Button size="sm" variant="ghost" onClick={() => handleComplete(a)}>Mark done</Button>
                  <Button size="sm" variant="text" onClick={() => handleDelete(a)}>Remove</Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {completed.length > 0 && (
        <Card>
          <div className="section-label">Completed · {completed.length}</div>
          <div className="stack" style={{ marginTop: 'var(--space-2)' }}>
            {completed.map(a => (
              <div key={a.id} className="row-between" style={{ padding: '4px 0' }}>
                <span className="muted" style={{ fontSize: 'var(--text-small)' }}>{a.title} · {a.category}{a.goals?.title && <> · <Target size={11} style={{ verticalAlign: 'middle' }} /> {truncateGoalTitle(a.goals.title)}</>}</span>
                <span className="muted" style={{ fontSize: 'var(--text-micro)' }}>{a.activity_date}</span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
