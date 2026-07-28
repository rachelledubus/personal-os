import React, { useEffect, useState } from 'react';
import { Check } from 'lucide-react';
import Card from '../ui/Card.jsx';
import Button from '../ui/Button.jsx';
import Overlay from '../ui/Overlay.jsx';
import { ALIGNMENT_PROMPTS, getTodayAlignment, saveTodayAlignment } from '../../services/morningAlignment.js';

export default function MorningAlignmentCard() {
  const [entry, setEntry] = useState(undefined); // undefined = loading, null = none yet
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => { refresh(); }, []);

  async function refresh() {
    const today = await getTodayAlignment();
    setEntry(today || null);
    setForm({
      creating: today?.creating || '', becoming: today?.becoming || '', matters_today: today?.matters_today || '',
      next_action: today?.next_action || '', grateful_for: today?.grateful_for || '',
    });
  }

  async function handleSave(complete) {
    setSaving(true);
    await saveTodayAlignment(form, complete);
    setSaving(false);
    if (complete) setOpen(false);
    refresh();
  }

  if (entry === undefined) return null; // still loading — nothing to flash

  const completed = !!entry?.completed_at;

  return (
    <>
      <Card style={completed ? { opacity: 0.7 } : undefined}>
        {completed ? (
          <div className="row" style={{ gap: 8, alignItems: 'center' }}>
            <Check size={16} style={{ color: 'var(--sage)' }} />
            <span className="muted" style={{ fontSize: 'var(--text-small)' }}>Morning alignment done for today</span>
            <Button size="sm" variant="text" onClick={() => setOpen(true)}>Revisit</Button>
          </div>
        ) : (
          <div className="row-between">
            <div>
              <div style={{ fontWeight: 700, fontSize: 'var(--text-small)' }}>Morning alignment</div>
              <div className="muted" style={{ fontSize: 'var(--text-caption)' }}>Five questions, whenever you're ready — no rush.</div>
            </div>
            <Button size="sm" variant="ghost" onClick={() => setOpen(true)}>Start</Button>
          </div>
        )}
      </Card>

      <Overlay open={open} onClose={() => setOpen(false)} variant="sheet" title="Morning alignment">
        <div className="stack" style={{ gap: 'var(--space-3)' }}>
          {ALIGNMENT_PROMPTS.map(p => (
            <label key={p.key} className="reset-field">
              <span>{p.label}</span>
              <textarea
                placeholder={p.placeholder}
                value={form[p.key] || ''}
                onChange={e => setForm({ ...form, [p.key]: e.target.value })}
                style={{ minHeight: 56 }}
              />
            </label>
          ))}
          <div className="row" style={{ gap: 'var(--space-2)' }}>
            <Button size="sm" onClick={() => handleSave(true)} disabled={saving}>{saving ? 'Saving…' : 'Save & complete'}</Button>
            <Button size="sm" variant="text" onClick={() => handleSave(false)} disabled={saving}>Save as draft</Button>
          </div>
        </div>
      </Overlay>
    </>
  );
}
