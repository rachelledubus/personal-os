import React, { useState } from 'react';
import { Battery, BatteryLow, BatteryFull } from 'lucide-react';
import { logEnergy } from '../../services/energyIntelligence.js';
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

  async function handleCheckIn(level) {
    setActive(level);
    setBusy(true);
    await logEnergy(level);
    await reassignForEnergyChange();
    setBusy(false);
    onReplanned?.();
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
    </div>
  );
}
