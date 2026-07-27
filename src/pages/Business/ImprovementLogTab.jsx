import React, { useEffect, useState } from 'react';
import Card from '../../components/ui/Card.jsx';
import Button from '../../components/ui/Button.jsx';
import Checkbox from '../../components/ui/Checkbox.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import { PROBLEM_TYPES, listImprovementLogEntries, addImprovementLogEntry, updateImprovementLogEntry, deleteImprovementLogEntry } from '../../services/businessImprovementLog.js';

const BLANK = { problem: '', problem_type: '', evidence: '', root_cause: '', solution: '', result: '' };

// ============================================================
// BUSINESS IMPROVEMENT LOG — System 09. "Use this template any time
// something isn't working." Problem type determines what kind of fix
// actually applies — the reference table is here specifically so
// that classification is easy to check, not memorized.
// ============================================================
export default function ImprovementLogTab() {
  const [entries, setEntries] = useState([]);
  const [showTypes, setShowTypes] = useState(false);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState(BLANK);

  async function refresh() { setEntries(await listImprovementLogEntries()); }
  useEffect(() => { refresh(); }, []);

  async function handleAdd() {
    if (!form.problem.trim()) return;
    await addImprovementLogEntry(form);
    setForm(BLANK);
    setAdding(false);
    refresh();
  }

  async function handleToggleResolved(entry) {
    await updateImprovementLogEntry(entry.id, { result: entry.result, resolved: !entry.resolved });
    refresh();
  }

  return (
    <div className="stack" style={{ gap: 'var(--space-4)' }}>
      <Card>
        <div className="row-between">
          <div className="section-label">Problem types</div>
          <Button size="sm" variant="text" onClick={() => setShowTypes(!showTypes)}>{showTypes ? 'Hide' : 'Show'}</Button>
        </div>
        {showTypes && (
          <div className="stack" style={{ marginTop: 'var(--space-2)', gap: 6 }}>
            {PROBLEM_TYPES.map(t => (
              <div key={t.key} style={{ fontSize: 'var(--text-small)' }}>
                <strong>{t.label}</strong> — <span className="muted">looks like: {t.looksLike}. Solution: {t.solution}</span>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card>
        <div className="row-between">
          <div className="section-label">Log entries</div>
          <Button size="sm" variant="ghost" onClick={() => setAdding(!adding)}>{adding ? 'Cancel' : '+ New entry'}</Button>
        </div>
        {adding && (
          <div className="stack" style={{ marginTop: 'var(--space-3)' }}>
            <textarea placeholder="Problem" value={form.problem} onChange={e => setForm({ ...form, problem: e.target.value })} style={{ minHeight: 44 }} />
            <select value={form.problem_type} onChange={e => setForm({ ...form, problem_type: e.target.value })}>
              <option value="">Problem type...</option>
              {PROBLEM_TYPES.map(t => <option key={t.key} value={t.key}>{t.label}</option>)}
            </select>
            <textarea placeholder="Evidence" value={form.evidence} onChange={e => setForm({ ...form, evidence: e.target.value })} style={{ minHeight: 44 }} />
            <textarea placeholder="Root cause" value={form.root_cause} onChange={e => setForm({ ...form, root_cause: e.target.value })} style={{ minHeight: 44 }} />
            <textarea placeholder="Solution" value={form.solution} onChange={e => setForm({ ...form, solution: e.target.value })} style={{ minHeight: 44 }} />
            <textarea placeholder="Result (fill in once you know)" value={form.result} onChange={e => setForm({ ...form, result: e.target.value })} style={{ minHeight: 44 }} />
            <div><Button size="sm" onClick={handleAdd}>Save</Button></div>
          </div>
        )}

        {entries.length === 0 ? <EmptyState icon="sparkles" title="Nothing logged yet" subtitle="Use this any time something isn't working." /> : (
          <div className="stack" style={{ marginTop: 'var(--space-3)' }}>
            {entries.map(entry => (
              <div key={entry.id} style={{ padding: '10px 0', borderBottom: '1px solid var(--sand)', opacity: entry.resolved ? 0.6 : 1 }}>
                <div className="row-between">
                  <Checkbox checked={entry.resolved} onChange={() => handleToggleResolved(entry)} label={entry.problem} />
                  <button className="row-remove-btn" aria-label="Remove" onClick={() => deleteImprovementLogEntry(entry.id).then(refresh)}>×</button>
                </div>
                <div className="muted" style={{ fontSize: 'var(--text-micro)', marginLeft: 26 }}>
                  {PROBLEM_TYPES.find(t => t.key === entry.problem_type)?.label || 'Unclassified'}
                </div>
                {entry.evidence && <div style={{ fontSize: 'var(--text-small)', marginLeft: 26, marginTop: 2 }}><strong>Evidence:</strong> {entry.evidence}</div>}
                {entry.root_cause && <div style={{ fontSize: 'var(--text-small)', marginLeft: 26, marginTop: 2 }}><strong>Root cause:</strong> {entry.root_cause}</div>}
                {entry.solution && <div style={{ fontSize: 'var(--text-small)', marginLeft: 26, marginTop: 2 }}><strong>Solution:</strong> {entry.solution}</div>}
                {entry.result && <div style={{ fontSize: 'var(--text-small)', marginLeft: 26, marginTop: 2 }}><strong>Result:</strong> {entry.result}</div>}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
