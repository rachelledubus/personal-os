import React, { useState } from 'react';
import { Clock, AlertTriangle } from 'lucide-react';
import { recalculateChainForToday } from '../../services/lifeRhythm.js';
import '../intelligence/EnergyCheckIn.css';

function nowAsTimeInput() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export default function AnchorTimeAdjuster({ onRecalculated }) {
  const [time, setTime] = useState(nowAsTimeInput());
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  async function handleUpdate() {
    setBusy(true);
    setError(null);
    try {
      const res = await recalculateChainForToday(time);
      setResult(res);
      onRecalculated?.();
    } catch (err) {
      // Most likely cause: v2_dependency_schedule_layer.sql hasn't been run yet.
      setError(err.message || String(err));
    }
    setBusy(false);
    setTimeout(() => setResult(null), 4000);
  }

  return (
    <div className="energy-checkin">
      <Clock size={14} />
      <span className="muted" style={{ fontSize: 12 }}>Actually woke up at:</span>
      <input type="time" value={time} onChange={e => setTime(e.target.value)} style={{ fontSize: 12, padding: '2px 6px' }} />
      <button className="energy-chip" onClick={handleUpdate} disabled={busy}>
        {busy ? 'Updating…' : 'Update today\'s schedule'}
      </button>
      {result && (
        <span className="muted" style={{ fontSize: 11 }}>
          {result.updated === 0 ? 'Nothing to reflow yet' : `${result.updated} block${result.updated === 1 ? '' : 's'} updated`}
          {result.conflicts > 0 && <span style={{ color: 'var(--danger)', display: 'inline-flex', alignItems: 'center', gap: 3 }}> — <AlertTriangle size={12} />{result.conflicts} running tight</span>}
        </span>
      )}
      {error && <span style={{ fontSize: 11, color: 'var(--danger)' }}>Couldn't update: {error}</span>}
    </div>
  );
}
