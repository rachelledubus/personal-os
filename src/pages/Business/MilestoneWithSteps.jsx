import React, { useEffect, useState } from 'react';
import { Check } from 'lucide-react';
import Checkbox from '../../components/ui/Checkbox.jsx';
import { listMilestoneSteps, toggleMilestoneStep, addMilestoneStep, deleteMilestoneStep } from '../../services/goals.js';
import { natureOf } from '../../services/websiteBuildImport.js';

// ============================================================
// A milestone row that can expand into its real sub-step checklist —
// "Build the first referral asset" becomes 5 concrete things you
// actually do, instead of one undifferentiated checkbox. Requested
// multiple times before this existed.
// ============================================================
export default function MilestoneWithSteps({ milestone, onToggleMilestone, onDeleteMilestone, locked }) {
  const [steps, setSteps] = useState(null); // null = not loaded yet
  const [expanded, setExpanded] = useState(false);
  const [newStepText, setNewStepText] = useState('');

  async function loadSteps() {
    setSteps(await listMilestoneSteps(milestone.id));
  }

  useEffect(() => {
    if (expanded && steps === null) loadSteps();
  }, [expanded]);

  async function handleToggleStep(id, value) {
    await toggleMilestoneStep(id, value);
    loadSteps();
  }

  async function handleAddStep() {
    if (!newStepText.trim()) return;
    await addMilestoneStep(milestone.id, newStepText.trim(), steps?.length || 0);
    setNewStepText('');
    loadSteps();
  }

  async function handleDeleteStep(id) {
    await deleteMilestoneStep(id);
    loadSteps();
  }

  const doneSteps = (steps || []).filter(s => s.completed).length;

  return (
    <div>
      <div className="row-between" style={{ cursor: 'pointer' }} onClick={() => setExpanded(!expanded)}>
        <div className="row" style={{ gap: 'var(--space-2)', alignItems: 'center' }}>
          <button
            type="button"
            className={`checkbox-box ${milestone.completed ? 'checked' : ''}`}
            onClick={e => { e.stopPropagation(); if (!locked) onToggleMilestone(milestone.id, !milestone.completed); }}
            aria-pressed={milestone.completed}
            aria-label={milestone.completed ? 'Mark not done' : 'Mark done'}
            disabled={locked}
          >
            {milestone.completed && <Check size={14} strokeWidth={3} />}
          </button>
          <span className={milestone.completed ? 'checkbox-label done' : 'checkbox-label'}>{milestone.label}</span>
          {natureOf(milestone.title) !== 'one-time' && (
            <span className="muted" style={{ fontSize: 'var(--text-micro)', fontStyle: 'italic' }}>
              ({natureOf(milestone.title) === 'recurring' ? 'ongoing habit' : natureOf(milestone.title) === 'scheduled-later' ? 'not due yet' : 'as it comes up'})
            </span>
          )}
        </div>
        <div className="row" style={{ gap: 4 }} onClick={e => e.stopPropagation()}>
          {steps && steps.length > 0 && <span className="muted" style={{ fontSize: 'var(--text-micro)' }}>{doneSteps}/{steps.length} steps</span>}
          <span className="muted" style={{ fontSize: 'var(--text-small)' }}>{expanded ? '−' : '+'}</span>
          <button className="row-remove-btn" aria-label="Remove" onClick={() => onDeleteMilestone(milestone.id, milestone.label)}>×</button>
        </div>
      </div>
      {expanded && (
        <div className="stack" style={{ marginLeft: 28, marginTop: 6, gap: 4, paddingLeft: 'var(--space-3)', borderLeft: '2px solid var(--sand)' }} onClick={e => e.stopPropagation()}>
          {steps === null ? (
            <div className="muted" style={{ fontSize: 'var(--text-micro)' }}>Loading steps...</div>
          ) : steps.length === 0 ? (
            <div className="muted" style={{ fontSize: 'var(--text-micro)' }}>No sub-steps yet for this one.</div>
          ) : (
            steps.map(s => (
              <div key={s.id} className="row-between">
                <Checkbox checked={s.completed} onChange={v => handleToggleStep(s.id, v)} label={s.title} disabled={locked} />
                <button className="row-remove-btn" aria-label="Remove step" onClick={() => handleDeleteStep(s.id)}>×</button>
              </div>
            ))
          )}
          {!locked && (
            <div className="row" style={{ gap: 4, marginTop: 4 }}>
              <input placeholder="Add a step..." value={newStepText} onChange={e => setNewStepText(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleAddStep(); }} style={{ fontSize: 'var(--text-micro)' }} />
              <button className="row-remove-btn" aria-label="Add step" onClick={handleAddStep} style={{ fontSize: 'var(--text-small)' }}>+</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
