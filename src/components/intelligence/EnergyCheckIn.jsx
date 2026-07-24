import React, { useState } from 'react';
import { Battery, BatteryLow, BatteryFull } from 'lucide-react';
import { logEnergy, logMomentum } from '../../services/energyIntelligence.js';
import { reassignForEnergyChange } from '../../services/dailyExecution.js';
import './EnergyCheckIn.css';

const LEVELS = [
  { value: 'Low', label: 'Low', icon: BatteryLow },
  { value: 'Medium', label: 'Medium', icon: Battery },
  { value: 'High', label: 'High', icon: BatteryFull },
];

export default function EnergyCheckIn({ onReplanned }) {
  const [active, setActive] = useState(null);
  const [busy, setBusy] = useState(false);
  const [logId, setLogId] = useState(null);
  const [momentum, setMomentum] = useState({ gain: '', drain: '' });
  const [momentumSaved, setMomentumSaved] = useState(false);

  async function handleCheckIn(level) {
    setActive(level);
    setBusy(true);
    const row = await logEnergy(level);
    setLogId(row.id);
    await reassignForEnergyChange();
    setBusy(false);
    onReplanned?.();
  }

  async function saveMomentum() {
    if (!logId) return;
    await logMomentum(logId, momentum.gain, momentum.drain);
    setMomentumSaved(true);
    setTimeout(() => setMomentumSaved(false), 1500);
  }

  return (
    <div className="energy-checkin">
      <span className="muted" style={{ fontSize: 12 }}>Energy right now:</span>
      {LEVELS.map(({ value, label, icon: Icon }) => (
        <button
          key={value}
          className={`energy-chip ${active === value ? 'active' : ''}`}
          onClick={() => handleCheckIn(value)}
          disabled={busy}
        >
          <Icon size={13} /> {label}
        </button>
      ))}
      {busy && <span className="muted" style={{ fontSize: 11 }}>Adjusting today's plan…</span>}

      {/* Joy Tracking — optional, appears only after a level is picked, never blocks the tap-and-go flow above */}
      {logId && (
        <div className="energy-momentum">
          <input
            placeholder="What's creating momentum? (optional)"
            value={momentum.gain}
            onChange={e => setMomentum(m => ({ ...m, gain: e.target.value }))}
            onBlur={saveMomentum}
          />
          <input
            placeholder="What's draining you? (optional)"
            value={momentum.drain}
            onChange={e => setMomentum(m => ({ ...m, drain: e.target.value }))}
            onBlur={saveMomentum}
          />
          {momentumSaved && <span className="muted" style={{ fontSize: 11 }}>Saved</span>}
        </div>
      )}
    </div>
  );
}
