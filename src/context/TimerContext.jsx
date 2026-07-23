import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { BUILT_IN_PRESETS, logSession } from '../services/timer.js';

// ============================================================
// TimerContext — one timer lives here for the whole app session.
// This replaces the two separate, page-local stopwatches that used
// to live in FocusMode.jsx and ResearchMode.jsx (each reset if you
// navigated away). Now a timer keeps running no matter what page
// you're on, and a MiniTimerBar can surface it anywhere.
// ============================================================

const TimerContext = createContext(null);

const PHASE = { IDLE: 'idle', FOCUS: 'focus', BREAK: 'break' };

export function TimerProvider({ children }) {
  const [preset, setPreset] = useState(null);       // active preset object
  const [phase, setPhase] = useState(PHASE.IDLE);    // idle | focus | break
  const [mode, setMode] = useState('countdown');     // countdown | stopwatch
  const [secondsLeft, setSecondsLeft] = useState(0); // countdown mode
  const [secondsElapsed, setSecondsElapsed] = useState(0); // stopwatch mode / total elapsed this phase
  const [running, setRunning] = useState(false);
  const [linkedMission, setLinkedMission] = useState(null); // { sourceTable, sourceId, title }

  const intervalRef = useRef(null);
  const plannedSecondsRef = useRef(0);

  useEffect(() => {
    if (!running) return;
    intervalRef.current = setInterval(() => {
      if (mode === 'countdown') {
        setSecondsLeft(s => {
          if (s <= 1) {
            handlePhaseComplete();
            return 0;
          }
          return s - 1;
        });
        setSecondsElapsed(s => s + 1);
      } else {
        setSecondsElapsed(s => s + 1);
      }
    }, 1000);
    return () => clearInterval(intervalRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, mode]);

  function handlePhaseComplete() {
    // Countdown hit zero — log the completed phase, then either roll
    // into break or stop, depending on what was running.
    clearInterval(intervalRef.current);
    setRunning(false);
    logSession({
      presetId: preset?.id, presetLabel: preset?.label, mode,
      plannedSeconds: plannedSecondsRef.current, actualSeconds: plannedSecondsRef.current,
      completed: true,
      missionSourceTable: linkedMission?.sourceTable, missionSourceId: linkedMission?.sourceId,
    });

    if (phase === PHASE.FOCUS && preset?.breakMinutes) {
      setPhase(PHASE.BREAK);
      setSecondsLeft(preset.breakMinutes * 60);
      plannedSecondsRef.current = preset.breakMinutes * 60;
      setSecondsElapsed(0);
      setRunning(true); // break auto-starts — one less thing to click
    } else {
      setPhase(PHASE.IDLE);
    }
  }

  const start = useCallback((chosenPreset, mission = null) => {
    const p = chosenPreset || BUILT_IN_PRESETS[0];
    setPreset(p);
    setLinkedMission(mission);
    setMode(p.mode);
    setPhase(p.mode === 'stopwatch' ? PHASE.FOCUS : PHASE.FOCUS);
    setSecondsElapsed(0);
    if (p.mode === 'countdown') {
      const secs = (p.focusMinutes || 25) * 60;
      setSecondsLeft(secs);
      plannedSecondsRef.current = secs;
    } else {
      setSecondsLeft(0);
      plannedSecondsRef.current = 0;
    }
    setRunning(true);
  }, []);

  const pause = useCallback(() => setRunning(false), []);
  const resume = useCallback(() => setRunning(true), []);

  const reset = useCallback(() => {
    setRunning(false);
    if (mode === 'countdown' && preset) {
      const secs = (phase === PHASE.BREAK ? preset.breakMinutes : preset.focusMinutes || 25) * 60;
      setSecondsLeft(secs);
      plannedSecondsRef.current = secs;
    }
    setSecondsElapsed(0);
  }, [mode, preset, phase]);

  /** Skip/complete early — logs whatever was actually done, doesn't
   *  pretend the full planned duration happened. */
  const skip = useCallback((completed = true) => {
    clearInterval(intervalRef.current);
    setRunning(false);
    if (preset) {
      logSession({
        presetId: preset.id, presetLabel: preset.label, mode,
        plannedSeconds: plannedSecondsRef.current, actualSeconds: secondsElapsed,
        completed,
        missionSourceTable: linkedMission?.sourceTable, missionSourceId: linkedMission?.sourceId,
      });
    }
    setPhase(PHASE.IDLE);
    setPreset(null);
    setLinkedMission(null);
  }, [preset, mode, secondsElapsed, linkedMission]);

  const stop = useCallback(() => skip(false), [skip]);

  const value = {
    preset, phase, mode, secondsLeft, secondsElapsed, running, linkedMission,
    isActive: phase !== PHASE.IDLE,
    start, pause, resume, reset, skip, stop,
  };

  return <TimerContext.Provider value={value}>{children}</TimerContext.Provider>;
}

export function useTimerContext() {
  const ctx = useContext(TimerContext);
  if (!ctx) throw new Error('useTimerContext must be used within TimerProvider');
  return ctx;
}
