import React from 'react';
import './ProgressBar.css';

export default function ProgressBar({ value, max, tone = 'sage' }) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
  return (
    <div className="progress-track">
      <div className={`progress-fill tone-${tone}`} style={{ width: `${pct}%` }} />
    </div>
  );
}
