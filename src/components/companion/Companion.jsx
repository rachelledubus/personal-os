import React, { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import {
  USE_SPRITE_SHEET, DISPLAY_SIZE, DISPLAY_SIZE_MOBILE, BLINK_CHANCE, BLINK_CHECK_MS,
} from './companion.config.js';
import { useCompanionPosition } from './useCompanionPosition.js';
import { useSpriteAnimation } from './useSpriteAnimation.js';
import CompanionPlaceholderArt from './CompanionPlaceholderArt.jsx';
import CompanionSpriteFrame from './CompanionSpriteFrame.jsx';
import { getPreference, setPreference } from '../../services/preferences.js';
import './Companion.css';

/** Mounted once in App.jsx, outside <Routes>, so it persists across
 *  navigation instead of remounting per page. Reacts to viewport size
 *  (via useCompanionPosition) rather than being pushed around by
 *  layout — it decides its own anchor and animates *itself* to the
 *  new spot, which is what makes it read as a companion reacting to
 *  its environment rather than an element caught in a resize. */
export default function Companion() {
  const location = useLocation();
  const { anchor, breakpoint, isRunning } = useCompanionPosition();
  const [blinking, setBlinking] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [dismissedThisSession, setDismissedThisSession] = useState(false);
  const blinkCheckRef = useRef(null);

  // Persisted minimize preference (user_preferences, category 'companion') —
  // no new table, reuses the existing generic settings store.
  useEffect(() => {
    getPreference('companion', 'minimized', false).then(v => setMinimized(!!v));
  }, []);

  // Blink loop — probabilistic, not metronomic, so it reads as alive.
  useEffect(() => {
    blinkCheckRef.current = setInterval(() => {
      if (Math.random() < BLINK_CHANCE) {
        setBlinking(true);
        setTimeout(() => setBlinking(false), 180);
      }
    }, BLINK_CHECK_MS);
    return () => clearInterval(blinkCheckRef.current);
  }, []);

  // Full-screen Focus/Research modes already own the screen — stay out
  // of the way there rather than floating over a distraction-free view.
  const hiddenOnRoute = location.pathname.startsWith('/today/focus') || location.pathname.startsWith('/today/research');

  function toggleMinimized() {
    const next = !minimized;
    setMinimized(next);
    setPreference('companion', 'minimized', next);
  }

  // Hooks must run unconditionally every render, so compute animation
  // state and call useSpriteAnimation BEFORE the early-return below.
  const animState = isRunning ? 'run' : blinking ? 'blink' : 'idle';
  const frame = useSpriteAnimation(animState);

  if (hiddenOnRoute || dismissedThisSession) return null;

  const size = breakpoint === 'mobile' ? DISPLAY_SIZE_MOBILE : DISPLAY_SIZE;
  const anchorClass = `companion-anchor-${anchor.corner}`;

  return (
    <div
      className={`companion-wrapper ${anchorClass} ${minimized ? 'companion-minimized' : ''} ${isRunning ? 'companion-transitioning' : ''}`}
      style={{
        '--companion-offset-x': `${anchor.offsetX}px`,
        '--companion-offset-y': `${anchor.offsetY}px`,
        '--companion-size': `${size}px`,
      }}
    >
      <button className="companion-toggle" onClick={toggleMinimized} aria-label={minimized ? 'Show companion' : 'Minimize companion'}>
        {minimized ? '›' : '‹'}
      </button>
      <div className="companion-figure" role="img" aria-label="Your Personal OS companion">
        {USE_SPRITE_SHEET ? (
          <CompanionSpriteFrame stateName={animState} frame={frame} size={size} />
        ) : (
          <CompanionPlaceholderArt animState={animState} />
        )}
      </div>
    </div>
  );
}
