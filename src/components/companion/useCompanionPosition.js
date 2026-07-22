import { useEffect, useRef, useState } from 'react';
import { POSITION_RULES, getBreakpoint } from './companion.config.js';

/** Tracks viewport breakpoint and returns the current position anchor
 *  plus whether the companion should currently be in "run" mode
 *  (mid-transition between anchors). Debounced so rapid resize events
 *  don't spam re-renders, and the transition itself is handled in CSS
 *  (transform + transition on the wrapper) — this hook only decides
 *  *when* to switch anchor and *how long* to hold the run animation,
 *  it never sets inline top/left math itself beyond the named anchors. */
export function useCompanionPosition() {
  const [breakpoint, setBreakpoint] = useState(() => getBreakpoint(window.innerWidth));
  const [isRunning, setIsRunning] = useState(false);
  const resizeTimeout = useRef(null);
  const runTimeout = useRef(null);

  useEffect(() => {
    function handleResize() {
      clearTimeout(resizeTimeout.current);
      resizeTimeout.current = setTimeout(() => {
        const next = getBreakpoint(window.innerWidth);
        setBreakpoint(prev => {
          if (next !== prev) {
            // Breakpoint actually changed — trigger the "run to new spot"
            // animation for a fixed window, matched to the CSS transition.
            setIsRunning(true);
            clearTimeout(runTimeout.current);
            runTimeout.current = setTimeout(() => setIsRunning(false), 700);
          }
          return next;
        });
      }, 120); // debounce so a drag-resize doesn't thrash state
    }
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(resizeTimeout.current);
      clearTimeout(runTimeout.current);
    };
  }, []);

  return { anchor: POSITION_RULES[breakpoint], breakpoint, isRunning };
}
