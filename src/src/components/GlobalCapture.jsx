import React, { useState } from 'react';
import { X } from 'lucide-react';
import { quickCapture } from '../../services/capture.js';
import './GlobalCapture.css';

const TYPE_OPTIONS = [
  { value: null, label: "Not sure yet" },
  { value: 'task', label: 'Task' },
  { value: 'idea', label: 'Idea' },
  { value: 'content_idea', label: 'Content idea' },
  { value: 'buyer_question', label: 'Buyer question' },
  { value: 'note', label: 'Note' },
  { value: 'research', label: 'Research' },
  { value: 'purchase', label: 'Purchase' },
  { value: 'reminder', label: 'Reminder' },
  { value: 'opportunity', label: 'Opportunity' },
  { value: 'thought', label: 'Random thought' },
];

// A friendly face instead of a bare plus icon — this IS "the floating
// smiley." Explicit z-index rule lives in GlobalCapture.css: nothing
// decorative is ever placed above interactive elements, so this can't
// end up visually buried under a background element again.
function SmileyFace() {
  return (
    <svg width="26" height="26" viewBox="0 0 26 26" aria-hidden="true">
      <circle cx="9" cy="11" r="1.6" fill="currentColor" />
      <circle cx="17" cy="11" r="1.6" fill="currentColor" />
      <path d="M8 15.5 Q13 19.5 18 15.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none" />
    </svg>
  );
}

// A tiny companion that bobs beside the button — purely decorative,
// pointer-events:none, explicitly BEHIND the button in z-index, so it
// can never intercept a click or sit on top of the button visually.
function CompanionSprite() {
  return (
    <svg className="global-capture-companion" viewBox="0 0 40 40" aria-hidden="true">
      <ellipse cx="20" cy="22" rx="15" ry="13" fill="var(--gold)" opacity="0.85" />
      <circle cx="15" cy="20" r="1.8" fill="var(--navy)" opacity="0.7" />
      <circle cx="25" cy="20" r="1.8" fill="var(--navy)" opacity="0.7" />
      <path d="M15 26 Q20 29 25 26" stroke="var(--navy)" strokeWidth="1.4" strokeLinecap="round" fill="none" opacity="0.6" />
    </svg>
  );
}

export default function GlobalCapture() {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [type, setType] = useState(null);
  const [saving, setSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);

  async function handleSave() {
    if (!text.trim()) return;
    setSaving(true);
    await quickCapture(text, type);
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
      <div className="global-capture-wrap">
        <CompanionSprite />
        <button className="global-capture-fab" onClick={() => setOpen(true)} aria-label="Capture something">
          <SmileyFace />
        </button>
      </div>

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
              <div className="muted" style={{ fontSize: 12 }}>
                {justSaved ? 'Captured ✓' : 'Sorted later in the Inbox'}
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
