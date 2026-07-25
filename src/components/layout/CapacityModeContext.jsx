import React, { createContext, useContext, useState } from 'react';

// ============================================================
// CAPACITY MODE — scaffold only. The actual logic (Energy Check-In
// driving this, the elevated-mode overcommitment nudge, etc.) is
// separate in-progress work meant to feed into this. What lives here:
// the three modes as a real type, a context to hold the current one,
// and a hook so components can read it — all defaulting to
// 'standard' (today's only behavior) until that logic lands.
//
// Per the UX spec: mode changes are always manually overridable
// ("you are always the authority on what mode you're in, not the
// app") — setMode is exposed for exactly that, not just for internal
// automatic use.
// ============================================================

export const CAPACITY_MODES = ['low', 'standard', 'elevated'];

const CapacityModeContext = createContext({ mode: 'standard', setMode: () => {} });

export function CapacityModeProvider({ children }) {
  const [mode, setMode] = useState('standard');
  return (
    <CapacityModeContext.Provider value={{ mode, setMode }}>
      <div data-mode={mode}>{children}</div>
    </CapacityModeContext.Provider>
  );
}

export function useCapacityMode() {
  return useContext(CapacityModeContext);
}
