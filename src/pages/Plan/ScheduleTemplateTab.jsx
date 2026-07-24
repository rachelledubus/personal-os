import React, { useEffect, useState } from 'react';
import Card from '../../components/ui/Card.jsx';
import Button from '../../components/ui/Button.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import {
  listLifeRhythmTemplate, addLifeRhythmBlock, updateLifeRhythmBlock, deleteLifeRhythmBlock,
  addTransitionStep, removeTransitionStep,
} from '../../services/lifeRhythm.js';

const DAYS = [
  { value: 0, label: 'Sun' }, { value: 1, label: 'Mon' }, { value: 2, label: 'Tue' },
  { value: 3, label: 'Wed' }, { value: 4, label: 'Thu' }, { value: 5, label: 'Fri' }, { value: 6, label: 'Sat' },
];
const BLOCK_TYPES = ['routine', 'workout', 'work', 'meal', 'reset', 'personal'];
const TRACKS = ['personal', 'business'];

export default function ScheduleTemplateTab() {
  const [activeDay, setActiveDay] = useState(new Date().getDay());
  const [blocks, setBlocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [drafts, setDrafts] = useState({}); // { [blockId]: { title, notes, steps } } — local text buffer, saved on blur
  const [newStepInput, setNewStepInput] = useState({}); // { [blockId]: string }

  useEffect(() => { refresh(); }, []);

  async function refresh() {
    setLoading(true);
    const data = await listLifeRhythmTemplate();
    setBlocks(data);
    const nextDrafts = {};
    data.forEach(b => { nextDrafts[b.id] = { title: b.title, notes: b.notes || '', steps: [...(b.steps || [])] }; });
    setDrafts(nextDrafts);
    setLoading(false);
  }

  async function handleAdd() {
    const dayBlocks = blocks.filter(b => b.day_of_week === activeDay);
    await addLifeRhythmBlock({
      day_of_week: activeDay, title: 'New block', block_type: 'routine', track: 'personal',
      sort_order: dayBlocks.length, active: true,
    });
    refresh();
  }

  // Immediate-save fields (time inputs, chip picks) — discrete actions, fine to write on every change.
  async function handleField(block, field, value) {
    await updateLifeRhythmBlock(block.id, { [field]: value });
    setBlocks(bs => bs.map(b => (b.id === block.id ? { ...b, [field]: value } : b)));
  }

  // Buffered text fields (title, notes) — update locally on every keystroke, write to DB only on blur.
  function handleDraft(blockId, field, value) {
    setDrafts(d => ({ ...d, [blockId]: { ...d[blockId], [field]: value } }));
  }
  async function saveDraft(block, field) {
    const value = drafts[block.id]?.[field] ?? '';
    if (value === (block[field] || '')) return; // unchanged, skip the write
    await updateLifeRhythmBlock(block.id, { [field]: value });
    setBlocks(bs => bs.map(b => (b.id === block.id ? { ...b, [field]: value } : b)));
  }

  async function handleDelete(id) {
    await deleteLifeRhythmBlock(id);
    refresh();
  }

  // Step text editing — buffered locally like title/notes, but writes the
  // whole steps array back on blur (steps are just an array of strings).
  function handleStepDraft(blockId, index, value) {
    setDrafts(d => {
      const steps = [...(d[blockId]?.steps || [])];
      steps[index] = value;
      return { ...d, [blockId]: { ...d[blockId], steps } };
    });
  }
  async function saveSteps(block) {
    const steps = drafts[block.id]?.steps || [];
    if (JSON.stringify(steps) === JSON.stringify(block.steps || [])) return; // unchanged, skip the write
    await updateLifeRhythmBlock(block.id, { steps });
    setBlocks(bs => bs.map(b => (b.id === block.id ? { ...b, steps } : b)));
  }
  async function handleAddStep(block) {
    const label = (newStepInput[block.id] || '').trim();
    if (!label) return;
    await addTransitionStep(block.id, label);
    setNewStepInput(s => ({ ...s, [block.id]: '' }));
    refresh();
  }
  async function handleRemoveStep(block, index) {
    await removeTransitionStep(block.id, index);
    refresh();
  }

  if (loading) return null;

  const dayBlocks = blocks.filter(b => b.day_of_week === activeDay).sort((a, b) => a.sort_order - b.sort_order);

  return (
    <div className="stack" style={{ gap: 'var(--space-4)' }}>
      <p className="muted" style={{ marginTop: -4 }}>
        This is your recurring weekly rhythm — edits here apply to every future occurrence of that day, not just today.
        <br />
        <strong>Not the same as Time Blocks:</strong> this edits the repeating pattern itself. Time Blocks (in Plan) shows what actually
        got generated for a specific date, and is still where you add one-off events (like a dentist appointment) that shouldn't repeat.
      </p>

      <div className="row" style={{ gap: 'var(--space-2)', flexWrap: 'wrap' }}>
        {DAYS.map(d => (
          <button key={d.value} className={`sub-tab ${activeDay === d.value ? 'active' : ''}`} onClick={() => setActiveDay(d.value)}>
            {d.label}
          </button>
        ))}
      </div>

      {dayBlocks.length === 0 ? (
        <EmptyState icon="calendar" title="Nothing scheduled this day" subtitle="Add your first block below." />
      ) : (
        <div className="stack" style={{ gap: 'var(--space-3)' }}>
          {dayBlocks.map(block => (
            <Card key={block.id}>
              <div className="row" style={{ flexWrap: 'wrap', gap: 'var(--space-2)', alignItems: 'center' }}>
                <input
                  value={drafts[block.id]?.title ?? block.title}
                  onChange={e => handleDraft(block.id, 'title', e.target.value)}
                  onBlur={() => saveDraft(block, 'title')}
                  style={{ fontWeight: 700, flex: 1, minWidth: 160 }}
                />
                <input type="time" value={block.start_time || ''} onChange={e => handleField(block, 'start_time', e.target.value || null)} />
                <span className="muted">–</span>
                <input type="time" value={block.end_time || ''} onChange={e => handleField(block, 'end_time', e.target.value || null)} />
                <button className="row-remove-btn" onClick={() => handleDelete(block.id)}>×</button>
              </div>

              <div className="row" style={{ marginTop: 'var(--space-2)', flexWrap: 'wrap', gap: 4 }}>
                <span className="muted" style={{ fontSize: 11, marginRight: 4 }}>Type:</span>
                {BLOCK_TYPES.map(t => (
                  <button key={t} className={`sub-tab ${block.block_type === t ? 'active' : ''}`} style={{ fontSize: 11 }}
                    onClick={() => handleField(block, 'block_type', t)}>{t}</button>
                ))}
                <span className="muted" style={{ fontSize: 11, margin: '0 4px 0 12px' }}>Track:</span>
                {TRACKS.map(t => (
                  <button key={t} className={`sub-tab ${block.track === t ? 'active' : ''}`} style={{ fontSize: 11 }}
                    onClick={() => handleField(block, 'track', t)}>{t}</button>
                ))}
              </div>

              <textarea
                placeholder="Notes (optional)"
                value={drafts[block.id]?.notes ?? (block.notes || '')}
                onChange={e => handleDraft(block.id, 'notes', e.target.value)}
                onBlur={() => saveDraft(block, 'notes')}
                style={{ width: '100%', marginTop: 'var(--space-2)', minHeight: 40 }}
              />

              <div style={{ marginTop: 'var(--space-2)' }}>
                <span className="muted" style={{ fontSize: 11 }}>Checklist (applies to every future occurrence):</span>
                <div className="stack" style={{ marginTop: 4, gap: 4 }}>
                  {(drafts[block.id]?.steps || []).map((step, i) => (
                    <div key={i} className="row" style={{ gap: 4, alignItems: 'center' }}>
                      <input
                        value={step}
                        onChange={e => handleStepDraft(block.id, i, e.target.value)}
                        onBlur={() => saveSteps(block)}
                        style={{ flex: 1, fontSize: 13 }}
                      />
                      <button className="row-remove-btn" onClick={() => handleRemoveStep(block, i)}>×</button>
                    </div>
                  ))}
                </div>
                <div className="row" style={{ marginTop: 4, gap: 4 }}>
                  <input
                    placeholder="Add a checklist step..."
                    value={newStepInput[block.id] || ''}
                    onChange={e => setNewStepInput(s => ({ ...s, [block.id]: e.target.value }))}
                    onKeyDown={e => { if (e.key === 'Enter') handleAddStep(block); }}
                    style={{ flex: 1, fontSize: 13 }}
                  />
                  <Button size="sm" variant="ghost" onClick={() => handleAddStep(block)}>+ Step</Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Button size="sm" onClick={handleAdd}>+ Add block to {DAYS.find(d => d.value === activeDay).label}</Button>
    </div>
  );
}
