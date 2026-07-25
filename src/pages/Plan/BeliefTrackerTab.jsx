import React, { useEffect, useState } from 'react';
import Card from '../../components/ui/Card.jsx';
import Button from '../../components/ui/Button.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import { listBeliefs, addBelief, updateBelief, deleteBelief } from '../../services/beliefs.js';

const FIELDS = [
  { key: 'situation', label: 'Situation', placeholder: 'e.g. Slow business week' },
  { key: 'old_belief', label: 'Old Belief', placeholder: 'e.g. "I\'m failing"' },
  { key: 'new_belief', label: 'New Belief', placeholder: 'e.g. "Systems compound over time"' },
  { key: 'evidence', label: 'Evidence', placeholder: 'e.g. CRM improving' },
];

export default function BeliefTrackerTab() {
  const [beliefs, setBeliefs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [drafts, setDrafts] = useState({}); // { [id]: { situation, old_belief, new_belief, evidence } }
  const [newEntry, setNewEntry] = useState({ situation: '', old_belief: '', new_belief: '', evidence: '' });
  const [addError, setAddError] = useState(null);

  useEffect(() => { refresh(); }, []);

  async function refresh() {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await listBeliefs();
      setBeliefs(data);
      const nextDrafts = {};
      data.forEach(b => { nextDrafts[b.id] = { situation: b.situation, old_belief: b.old_belief || '', new_belief: b.new_belief || '', evidence: b.evidence || '' }; });
      setDrafts(nextDrafts);
    } catch (err) {
      // Most likely cause: v2_limiting_belief_tracker_layer.sql hasn't been run yet.
      setLoadError(err.message || String(err));
    }
    setLoading(false);
  }

  async function handleAdd() {
    if (!newEntry.situation.trim()) return;
    try {
      await addBelief(newEntry);
    } catch (err) {
      setAddError(err.message || String(err));
      return;
    }
    setAddError(null);
    setNewEntry({ situation: '', old_belief: '', new_belief: '', evidence: '' });
    refresh();
  }

  function handleDraft(id, field, value) {
    setDrafts(d => ({ ...d, [id]: { ...d[id], [field]: value } }));
  }

  async function saveDraft(belief, field) {
    const value = drafts[belief.id]?.[field] ?? '';
    if (value === (belief[field] || '')) return;
    await updateBelief(belief.id, { [field]: value });
    setBeliefs(bs => bs.map(b => (b.id === belief.id ? { ...b, [field]: value } : b)));
  }

  async function handleDelete(id) {
    await deleteBelief(id);
    refresh();
  }

  if (loading) return null;
  if (loadError) {
    return (
      <Card>
        <div className="section-label">Limiting Belief Tracker</div>
        <div className="muted" style={{ fontSize: 12, marginTop: 'var(--space-2)', color: 'var(--danger)' }}>
          Couldn't load: {loadError}
          <br />If this mentions a missing table, the v2_limiting_belief_tracker_layer.sql migration likely hasn't been run yet.
        </div>
      </Card>
    );
  }

  return (
    <div className="stack" style={{ gap: 'var(--space-4)' }}>
      <p className="muted" style={{ marginTop: -4 }}>
        The blocker between a goal and the action toward it is usually a belief, not a fact. Track the shift as it happens.
      </p>

      {beliefs.length === 0 ? (
        <EmptyState icon="sparkles" title="No entries yet" subtitle="Add your first one below." />
      ) : (
        <div className="stack" style={{ gap: 'var(--space-3)' }}>
          {beliefs.map(belief => (
            <Card key={belief.id}>
              <div className="row-between">
                <span className="muted" style={{ fontSize: 11 }}>{new Date(belief.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                <button className="row-remove-btn" onClick={() => handleDelete(belief.id)}>×</button>
              </div>
              <div className="stack" style={{ gap: 'var(--space-2)', marginTop: 'var(--space-2)' }}>
                {FIELDS.map(f => (
                  <div key={f.key}>
                    <div className="muted" style={{ fontSize: 11, marginBottom: 2 }}>{f.label}</div>
                    <input
                      value={drafts[belief.id]?.[f.key] ?? ''}
                      placeholder={f.placeholder}
                      onChange={e => handleDraft(belief.id, f.key, e.target.value)}
                      onBlur={() => saveDraft(belief, f.key)}
                      style={{ width: '100%' }}
                    />
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>
      )}

      <Card>
        <div className="section-label">New entry</div>
        <div className="stack" style={{ gap: 'var(--space-2)', marginTop: 'var(--space-2)' }}>
          {FIELDS.map(f => (
            <div key={f.key}>
              <div className="muted" style={{ fontSize: 11, marginBottom: 2 }}>{f.label}</div>
              <input
                placeholder={f.placeholder}
                value={newEntry[f.key]}
                onChange={e => setNewEntry(n => ({ ...n, [f.key]: e.target.value }))}
                style={{ width: '100%' }}
              />
            </div>
          ))}
        </div>
        <Button size="sm" onClick={handleAdd} style={{ marginTop: 'var(--space-3)' }}>+ Add entry</Button>
        {addError && <div className="muted" style={{ fontSize: 11, marginTop: 4, color: 'var(--danger)' }}>Couldn't add: {addError}</div>}
      </Card>
    </div>
  );
}
