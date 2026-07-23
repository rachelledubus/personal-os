import React from 'react';
import { Pause, Play, X } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { useTimerContext } from '../../context/TimerContext.jsx';
import './MiniTimerBar.css';

function formatTime(totalSeconds) {
  const m = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
  const s = String(totalSeconds % 60).padStart(2, '0');
  return `${m}:${s}`;
}

/** Mounted once, globally, outside <Routes>. Shows nothing when no
 *  timer is active. Lets a focus/break session keep running (and stay
 *  visible + controllable) no matter where the person navigates —
 *  the old FocusMode-local timer reset itself on route change; this
 *  doesn't. Hidden on the Focus/Research full-screen views themselves
 *  since the full timer is already shown there. */
export default function MiniTimerBar() {
  const timer = useTimerContext();
  const location = useLocation();

  if (!timer.isActive) return null;
  if (location.pathname.startsWith('/today/focus') || location.pathname.startsWith('/today/research')) return null;

  const displaySeconds = timer.mode === 'countdown' ? timer.secondsLeft : timer.secondsElapsed;

  return (
    <div className="mini-timer-bar">
      <div className="mini-timer-info">
        <span className={`mini-timer-dot ${timer.phase === 'break' ? 'break' : ''}`} />
        <span className="mini-timer-time">{formatTime(displaySeconds)}</span>
        <span className="mini-timer-label muted">{timer.preset?.label}{timer.phase === 'break' ? ' · Break' : ''}</span>
      </div>
      <div className="mini-timer-actions">
        {timer.running ? (
          <button onClick={timer.pause} aria-label="Pause"><Pause size={16} /></button>
        ) : (
          <button onClick={timer.resume} aria-label="Resume"><Play size={16} /></button>
        )}
        <button onClick={timer.stop} aria-label="Stop timer"><X size={16} /></button>
      </div>
    </div>
  );
}
