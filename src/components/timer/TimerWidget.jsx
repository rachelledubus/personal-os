import React, { useEffect, useState } from 'react';
import { Play, Pause, RotateCcw, SkipForward, Plus } from 'lucide-react';
import Button from '../ui/Button.jsx';
import { useTimerContext } from '../../context/TimerContext.jsx';
import { BUILT_IN_PRESETS, listCustomPresets, saveCustomPreset, getTodayStats } from '../../services/timer.js';
import './TimerWidget.css';

function formatTime(totalSeconds) {
  const m = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
  const s = String(totalSeconds % 60).padStart(2, '0');
  return `${m}:${s}`;
}

/** Full timer panel: preset picker (when idle) + live controls (when
 *  running/paused). Drop this into Focus Mode, Research Mode, or
 *  anywhere else a task view wants an inline timer. `mission` (optional)
 *  links session history back to the Today item being worked on. */
export default function TimerWidget({ mission = null, compact = false }) {
  const timer = useTimerContext();
  const [customPresets, setCustomPresets] = useState([]);
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [customMinutes, setCustomMinutes] = useState(20);
  const [stats, setStats] = useState({ totalSeconds: 0, sessionCount: 0 });

  useEffect(() => {
    listCustomPresets().then(setCustomPresets);
    getTodayStats().then(setStats);
  }, []);

  useEffect(() => {
    // Refresh today's stats whenever a session finishes (phase returns to idle).
    if (!timer.isActive) getTodayStats().then(setStats);
  }, [timer.isActive]);

  async function handleAddCustom() {
    const preset = {
      id: `custom-${Date.now()}`,
      label: `${customMinutes} min focus`,
      mode: 'countdown',
      focusMinutes: Number(customMinutes),
      breakMinutes: 0,
    };
    const next = await saveCustomPreset(preset);
    setCustomPresets(next);
    setShowCustomForm(false);
  }

  const displaySeconds = timer.mode === 'countdown' ? timer.secondsLeft : timer.secondsElapsed;
  const allPresets = [...BUILT_IN_PRESETS, ...customPresets];

  if (!timer.isActive) {
    return (
      <div className={`timer-widget ${compact ? 'timer-widget-compact' : ''}`}>
        <div className="timer-stats-row">
          <span className="muted" style={{ fontSize: 12.5 }}>
            Today: {Math.round(stats.totalSeconds / 60)} min · {stats.sessionCount} session{stats.sessionCount === 1 ? '' : 's'}
          </span>
        </div>

        <div className="timer-preset-grid">
          {allPresets.map(p => (
            <button key={p.id} className="timer-preset-card" onClick={() => timer.start(p, mission)}>
              <span className="timer-preset-label">{p.label}</span>
              <span className="timer-preset-sub">
                {p.mode === 'stopwatch' ? 'Count up' : `${p.focusMinutes}m${p.breakMinutes ? ` / ${p.breakMinutes}m break` : ''}`}
              </span>
            </button>
          ))}

          {!showCustomForm ? (
            <button className="timer-preset-card timer-preset-add" onClick={() => setShowCustomForm(true)}>
              <Plus size={16} /> <span>Custom</span>
            </button>
          ) : (
            <div className="timer-preset-card timer-custom-form">
              <input
                type="number" min="1" max="180" value={customMinutes}
                onChange={e => setCustomMinutes(e.target.value)}
                aria-label="Custom minutes"
              />
              <Button size="sm" onClick={handleAddCustom}>Save</Button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`timer-widget timer-widget-active ${compact ? 'timer-widget-compact' : ''}`}>
      {timer.phase === 'break' && <div className="timer-phase-tag">Break</div>}
      <div className="timer-display">{formatTime(displaySeconds)}</div>
      {timer.preset?.label && <div className="timer-preset-name muted">{timer.preset.label}</div>}

      <div className="timer-controls">
        {timer.running ? (
          <button className="timer-control-btn" onClick={timer.pause} aria-label="Pause timer"><Pause size={20} /></button>
        ) : (
          <button className="timer-control-btn timer-control-primary" onClick={timer.resume} aria-label="Resume timer"><Play size={20} /></button>
        )}
        <button className="timer-control-btn" onClick={timer.reset} aria-label="Reset timer"><RotateCcw size={18} /></button>
        <button className="timer-control-btn" onClick={() => timer.skip(true)} aria-label="Complete session"><SkipForward size={18} /></button>
      </div>
      <button className="btn-text" style={{ marginTop: 8 }} onClick={timer.stop}>Stop session</button>
    </div>
  );
}
