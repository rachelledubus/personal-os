import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Card from '../ui/Card.jsx';
import { toggleMilestoneStep } from '../../services/goals.js';
import { getTodayBusinessAction, toggleMilestone } from '../../services/websiteBuildImport.js';

const NATURE_LABEL = {
  recurring: 'ongoing habit',
  'scheduled-later': 'not due yet',
  reactive: 'as it comes up',
};

// ============================================================
// TODAY'S BUSINESS ACTION — the actual "what do I do today" answer,
// not just the roadmap's shape for the next 30/60/90 days. Skips
// recurring habits and things with nothing to do yet, and surfaces
// the one concrete, doable-right-now step instead of making that
// decision every day.
// ============================================================
export default function TodayBusinessAction() {
  const [action, setAction] = useState(undefined); // undefined = loading

  async function refresh() {
    setAction(await getTodayBusinessAction());
  }
  useEffect(() => { refresh(); }, []);

  async function handleDoneStep(stepId) {
    await toggleMilestoneStep(stepId, true);
    refresh();
  }

  async function handleDoneMilestone(milestoneId) {
    await toggleMilestone(milestoneId, true);
    refresh();
  }

  if (action === undefined || action === null) return null;

  return (
    <Card>
      <div className="section-label">Today's business focus</div>
      {action.kind === 'step' && (
        <div style={{ marginTop: 6 }}>
          <div className="muted" style={{ fontSize: 'var(--text-micro)' }}>{action.phaseKey} · {action.milestoneTitle}</div>
          <div className="row-between" style={{ marginTop: 4 }}>
            <div style={{ fontSize: 'var(--text-small)', fontWeight: 700 }}>{action.stepTitle}</div>
            <button className="row-remove-btn" aria-label="Mark done" onClick={() => handleDoneStep(action.stepId)} style={{ fontSize: 'var(--text-small)' }}>✓</button>
          </div>
        </div>
      )}
      {action.kind === 'milestone' && (
        <div style={{ marginTop: 6 }}>
          <div className="muted" style={{ fontSize: 'var(--text-micro)' }}>{action.phaseKey}</div>
          <div className="row-between" style={{ marginTop: 4 }}>
            <div style={{ fontSize: 'var(--text-small)', fontWeight: 700 }}>{action.milestoneTitle}</div>
            <button className="row-remove-btn" aria-label="Mark done" onClick={() => handleDoneMilestone(action.milestoneId)} style={{ fontSize: 'var(--text-small)' }}>✓</button>
          </div>
        </div>
      )}
      {action.kind === 'ongoing' && (
        <div className="stack" style={{ marginTop: 6, gap: 4 }}>
          <div className="muted" style={{ fontSize: 'var(--text-caption)' }}>Nothing new to build today — just keep these going:</div>
          {action.items.map((it, i) => (
            <div key={i} style={{ fontSize: 'var(--text-small)' }}>{it.title} <span className="muted" style={{ fontSize: 'var(--text-micro)' }}>({NATURE_LABEL[it.nature]})</span></div>
          ))}
        </div>
      )}
      {action.kind === 'clear' && (
        <div className="muted" style={{ fontSize: 'var(--text-small)', marginTop: 6 }}>Everything actionable is done for now.</div>
      )}
      <Link to="/business/roadmap" className="muted" style={{ fontSize: 'var(--text-micro)', display: 'inline-block', marginTop: 8 }}>Full roadmap →</Link>
    </Card>
  );
}
