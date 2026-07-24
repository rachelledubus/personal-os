import React, { useEffect, useState } from 'react';
import Card from '../../components/ui/Card.jsx';
import Button from '../../components/ui/Button.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import {
  listLifeRhythmTemplate, addLifeRhythmBlock, updateLifeRhythmBlock, deleteLifeRhythmBlock,
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
  const [drafts, setDrafts] = useState({}); // { [blockId]: { title, notes } } — local text buffer, saved on blur

  useEffect(() => { refresh(); }, []);

  async function refresh() {
    setLoading(true);
    const data = await listLifeRhythmTemplate();
    setBlocks(data);
    const nextDrafts = {};
    data.forEach(b => { nextDrafts[b.id] = { title: b.title, notes: b.notes || '' }; });
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

  if (loading) return null;

  const dayBlocks = blocks.filter(b => b.day_of_week === activeDay).sort((a, b) => a.sort_order - b.sort_order);

  return (
    <div className="stack" style={{ gap: 'var(--space-4)' }}>
      <p className="muted" style={{ marginTop: -4 }}>
        This is your recurring weekly rhythm — edits here apply to every future occurrence of that day, not just today.
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
            </Card>
          ))}
        </div>
      )}

      <Button size="sm" onClick={handleAdd}>+ Add block to {DAYS.find(d => d.value === activeDay).label}</Button>
    </div>
  );
}
