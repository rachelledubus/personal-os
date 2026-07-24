import React, { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import {
  USE_SPRITE_SHEET, DISPLAY_SIZE, DISPLAY_SIZE_MOBILE, BLINK_CHANCE, BLINK_CHECK_MS,
} from './companion.config.js';
import { useCompanionPosition } from './useCompanionPosition.js';
import { useSpriteAnimation } from './useSpriteAnimation.js';
import CompanionPlaceholderArt from './CompanionPlaceholderArt.jsx';
import CompanionSpriteFrame from './CompanionSpriteFrame.jsx';
import { getPreference, setPreference } from '../../services/settings.js';
import { getPmRoutineStatus } from '../../services/sleepCountdown.js';
import { getRecentLevelUp } from '../../services/guardians.js';
import { getDueReminderHabit, markHabitReminded } from '../../services/habitReminders.js';
import './Companion.css';

const BUBBLE_CHECK_MS = 5 * 60 * 1000; // check every 5 minutes — this is a light nudge, not a live countdown
const LEVELUP_CHECK_MS = 20 * 1000; // level-ups should feel snappy, not lag 5 minutes behind the action
const SORA_CHECK_MS = 5 * 60 * 1000; // check every 5 min — actual reminder cadence is per-habit (reminder_interval_minutes), this is just the polling resolution

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
  const [bubbleMessage, setBubbleMessage] = useState(null);
  const [bubbleDismissed, setBubbleDismissed] = useState(false);
  const [levelUpMessage, setLevelUpMessage] = useState(null);
  const [levelUpDismissed, setLevelUpDismissed] = useState(false);
  const [soraMessage, setSoraMessage] = useState(null);
  const [soraDismissed, setSoraDismissed] = useState(false);
  const shownLevelUpsRef = useRef(new Set());
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

  // PM routine / bedtime nudge — checks on mount, then every 5 minutes.
  // A fresh status re-check clears any earlier dismissal so a genuinely
  // new situation (e.g. it got later) can speak up again.
  useEffect(() => {
    let cancelled = false;
    async function check() {
      try {
        const status = await getPmRoutineStatus();
        if (cancelled) return;
        if (status.shouldWarn) {
          setBubbleMessage(prev => {
            if (prev !== status.message) setBubbleDismissed(false);
            return status.message;
          });
        } else {
          setBubbleMessage(null);
        }
      } catch {
        // Bedtime nudge is a nice-to-have — never let it break the companion.
      }
    }
    check();
    const id = setInterval(check, BUBBLE_CHECK_MS);
    return () => { cancelled = true; clearInterval(id); };
  }, []);

  // Guardian level-up celebration — checks more often than the sleep
  // nudge since this should feel like a real-time moment, not a batch
  // job. "Already shown" is tracked per-session (a ref, not persisted)
  // — good enough since the underlying event itself has a 2-minute
  // window server-side, so nothing stale can resurface after a reload.
  useEffect(() => {
    let cancelled = false;
    async function checkLevelUp() {
      try {
        const levelUp = await getRecentLevelUp();
        if (cancelled || !levelUp) return;
        const key = `${levelUp.guardianId}:${levelUp.at}`;
        if (shownLevelUpsRef.current.has(key)) return;
        shownLevelUpsRef.current.add(key);
        setLevelUpMessage(levelUp.reaction);
        setLevelUpDismissed(false);
      } catch {
        // Same principle as the sleep nudge — never let this break the companion.
      }
    }
    checkLevelUp();
    const id = setInterval(checkLevelUp, LEVELUP_CHECK_MS);
    return () => { cancelled = true; clearInterval(id); };
  }, []);

  // Sora's habit reminders — each flagged habit has its own AI-suggested
  // interval (reminder_interval_minutes), tracked server-side via
  // last_reminded_at so it survives page reloads, not a session-only
  // timer. Polling resolution (SORA_CHECK_MS) is just how often we
  // check whether any flagged habit's own interval has elapsed —
  // never overnight, waking hours only.
  useEffect(() => {
    let cancelled = false;
    async function checkSora() {
      try {
        const hour = new Date().getHours();
        if (hour < 8 || hour >= 21) { setSoraMessage(null); return; }
        const habit = await getDueReminderHabit();
        if (cancelled || !habit) { setSoraMessage(null); return; }
        setSoraMessage(`Sora: Has "${habit.name}" happened yet today?`);
        setSoraDismissed(false);
        await markHabitReminded(habit.id);
      } catch {
        // Same principle as the other nudges — never let this break the companion.
      }
    }
    checkSora();
    const id = setInterval(checkSora, SORA_CHECK_MS);
    return () => { cancelled = true; clearInterval(id); };
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
      {levelUpMessage && !levelUpDismissed && !minimized && (
        <div className="companion-bubble companion-bubble-celebrate">
          <button className="companion-bubble-close" onClick={() => setLevelUpDismissed(true)} aria-label="Dismiss">×</button>
          <div className="companion-bubble-text">✨ {levelUpMessage}</div>
        </div>
      )}
      {(!levelUpMessage || levelUpDismissed) && soraMessage && !soraDismissed && !minimized && (
        <div className="companion-bubble">
          <button className="companion-bubble-close" onClick={() => setSoraDismissed(true)} aria-label="Dismiss">×</button>
          <div className="companion-bubble-text">{soraMessage}</div>
        </div>
      )}
      {(!levelUpMessage || levelUpDismissed) && (!soraMessage || soraDismissed) ? (
        bubbleMessage && !bubbleDismissed && !minimized && (
          <div className="companion-bubble">
            <button className="companion-bubble-close" onClick={() => setBubbleDismissed(true)} aria-label="Dismiss">×</button>
            <div className="companion-bubble-text">{bubbleMessage}</div>
          </div>
        )
      ) : null}
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
