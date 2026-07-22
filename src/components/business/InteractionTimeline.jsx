import React, { useEffect, useState } from 'react';
import Button from '../ui/Button.jsx';
import { listInteractions, addInteraction, deleteInteraction, typeLabel } from '../../services/interactions.js';
import './InteractionTimeline.css';

const TYPES = [
  { value: 'call', label: 'Call' },
  { value: 'text', label: 'Text' },
  { value: 'email', label: 'Email' },
  { value: 'meeting', label: 'Meeting' },
  { value: 'note', label: 'Note' },
];

/** The real relationship history for one contact — calls, texts,
 *  emails, meetings, and notes, newest first. Logging here keeps
 *  contacts.relationship_notes and .last_contact_date in sync
 *  automatically (see interactions.js), so nothing else needs to
 *  change to benefit from this becoming the source of truth. */
export default function InteractionTimeline({ contactId }) {
  const [interactions, setInteractions] = useState(null);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ type: 'call', notes: '' });
  const [saving, setSaving] = useState(false);

  async function refresh() {
    setInteractions(await listInteractions(contactId));
  }
  useEffect(() => { refresh(); }, [contactId]);

  async function handleAdd() {
    if (!form.notes.trim()) return;
    setSaving(true);
    await addInteraction(contactId, { type: form.type, notes: form.notes.trim() });
    setForm({ type: 'call', notes: '' });
    setAdding(false);
    setSaving(false);
    refresh();
  }

  async function handleDelete(id) {
    await deleteInteraction(id);
    refresh();
  }

  return (
    <div className="interaction-timeline">
      <div className="row-between">
        <div className="interaction-timeline-label">Relationship history</div>
        <Button size="sm" variant="text" onClick={() => setAdding(!adding)}>
          {adding ? 'Cancel' : '+ Log interaction'}
        </Button>
      </div>

      {adding && (
        <div className="interaction-add-form">
          <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
            {TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
          <textarea
            placeholder="What happened?"
            value={form.notes}
            onChange={e => setForm({ ...form, notes: e.target.value })}
            rows={2}
          />
          <Button size="sm" onClick={handleAdd} disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
        </div>
      )}

      {interactions === null ? null : interactions.length === 0 ? (
        <div className="muted interaction-timeline-empty">No relationship history logged yet.</div>
      ) : (
        <div className="interaction-list">
          {interactions.map(i => (
            <div key={i.id} className="interaction-row">
              <div className="interaction-row-header">
                <span className={`interaction-type-tag interaction-type-${i.type}`}>{typeLabel(i.type)}</span>
                <span className="muted interaction-date">{i.occurred_at}</span>
                <button className="row-remove-btn" onClick={() => handleDelete(i.id)} title="Delete">×</button>
              </div>
              {i.notes && <div className="interaction-notes">{i.notes}</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
