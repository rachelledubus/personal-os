import React, { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { quickCapture } from '../../services/capture.js';
import './GlobalCapture.css';

const TYPE_OPTIONS = [
  { value: null, label: "Not sure yet" },
  { value: 'task', label: 'Task' },
  { value: 'idea', label: 'Idea' },
  { value: 'backlog', label: 'Backlog idea' },
  { value: 'content_idea', label: 'Content idea' },
  { value: 'buyer_question', label: 'Buyer question' },
  { value: 'note', label: 'Note' },
  { value: 'research', label: 'Research' },
  { value: 'purchase', label: 'Purchase' },
  { value: 'reminder', label: 'Reminder' },
  { value: 'opportunity', label: 'Opportunity' },
  { value: 'thought', label: 'Random thought' },
];

export default function GlobalCapture() {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [type, setType] = useState(null);
  const [saving, setSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const [saveError, setSaveError] = useState(null);

  async function handleSave() {
    if (!text.trim()) return;
    setSaving(true);
    setSaveError(null);
    try {
      await quickCapture(text, type);
    } catch (err) {
      setSaving(false);
      setSaveError("Couldn't save that — try again.");
      return;
    }
    setSaving(false);
    setText('');
    setType(null);
    setJustSaved(true);
    window.dispatchEvent(new CustomEvent('capture:added'));
    setTimeout(() => {
      setJustSaved(false);
      setOpen(false);
    }, 900);
  }

  return (
    <>
      <button className="global-capture-fab" onClick={() => setOpen(true)} aria-label="Capture something">
        <Plus size={24} strokeWidth={2.5} />
      </button>

      {open && (
        <div className="global-capture-overlay" onClick={() => setOpen(false)}>
          <div className="global-capture-modal" onClick={e => e.stopPropagation()}>
            <div className="row-between">
              <div className="section-label">Capture</div>
              <button className="row-remove-btn" onClick={() => setOpen(false)}><X size={16} /></button>
            </div>

            <textarea
              autoFocus
              className="global-capture-input"
              placeholder="Whatever's on your mind — sort it later..."
              value={text}
              onChange={e => setText(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && e.metaKey) handleSave(); }}
            />

            <div className="global-capture-types">
              {TYPE_OPTIONS.map(opt => (
                <button
                  key={opt.label}
                  className={`capture-type-chip ${type === opt.value ? 'active' : ''}`}
                  onClick={() => setType(opt.value)}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            <div className="row-between" style={{ marginTop: 'var(--space-3)' }}>
              <div className="muted" style={{ fontSize: 12, color: saveError ? 'var(--danger)' : undefined }}>
                {saveError || (justSaved ? 'Captured ✓' : 'Sorted later in the Inbox')}
              </div>
              <button className="btn btn-primary btn-sm" onClick={handleSave} disabled={saving || !text.trim()}>
                {saving ? 'Saving…' : 'Capture'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
