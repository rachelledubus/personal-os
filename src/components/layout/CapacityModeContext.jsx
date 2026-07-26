import React, { createContext, useContext, useEffect, useState } from 'react';
import { getCurrentEnergy } from '../../services/energyIntelligence.js';

// ============================================================
// CAPACITY MODE — now wired to the Energy Check-In (previously
// scaffold only). Three modes, driven by today's most recent
// energy_logs entry:
//   Low -> 'low'        (shrink emphasis, no streak/celebration language)
//   Medium -> 'standard' (today's existing behavior, unchanged)
//   High -> 'elevated'   (soften reward, room for a gentle overcommitment nudge later)
//
// Per the UX spec: mode is never silently decided *for* the user.
// setMode is exposed and always wins over the auto-loaded value —
// "you are always the authority on what mode you're in, not the app."
// If nothing has been logged today, mode stays 'standard' (unchanged
// default), not guessed from history.
// ============================================================

export const CAPACITY_MODES = ['low', 'standard', 'elevated'];

const ENERGY_TO_MODE = { Low: 'low', Medium: 'standard', High: 'elevated' };

/** Exported so EnergyCheckIn (or anything else that logs energy) can
 *  reuse the exact same mapping instead of re-deriving it. */
export function energyLevelToMode(level) {
  return ENERGY_TO_MODE[level] || 'standard';
}

const CapacityModeContext = createContext({ mode: 'standard', setMode: () => {}, loading: true });

export function CapacityModeProvider({ children }) {
  const [mode, setMode] = useState('standard');
  const [loading, setLoading] = useState(true);

  // Initialize from today's most recent check-in on load, so mode
  // survives a refresh instead of silently resetting to 'standard'.
  // A manual setMode() call always takes priority after this point —
  // this effect only runs once, on mount.
  useEffect(() => {
    let cancelled = false;
    getCurrentEnergy()
      .then(log => {
        if (cancelled || !log) return;
        setMode(energyLevelToMode(log.energy_level));
      })
      .catch(() => {
        // No log yet today, or not signed in — stay on the 'standard'
        // default rather than surface an error for this.
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  return (
    <CapacityModeContext.Provider value={{ mode, setMode, loading }}>
      <div data-mode={mode}>{children}</div>
    </CapacityModeContext.Provider>
  );
}

export function useCapacityMode() {
  return useContext(CapacityModeContext);
}