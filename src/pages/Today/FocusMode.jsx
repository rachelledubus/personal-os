import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../../components/ui/Button.jsx';
import Overlay from '../../components/ui/Overlay.jsx';
import TimerWidget from '../../components/timer/TimerWidget.jsx';
import { getTodayItems, toggleTodayItem } from '../../services/todayItems.js';
import { startFocusSession, endFocusSession } from '../../services/focusSessions.js';
import './FocusMode.css';

// Hyperfocus PROTECTION, not hyperfocus interruption — the Today
// page's existing nudge already encourages continuing when a block
// runs long, correctly, per the UX spec. This is the complementary
// piece: a single, quiet, dismissible check on basic needs (water,
// a stretch, whether you've eaten) after sustained focus — never a
// pause, never an exit, never repeated within the same session.
const PROTECTION_CHECK_MINUTES = 60;

export default function FocusMode() {
  const navigate = useNavigate();
  const [item, setItem] = useState(null);
  const [showProtectionNudge, setShowProtectionNudge] = useState(false);
  const sessionIdRef = useRef(null);

  useEffect(() => {
    getTodayItems().then(list => {
      setItem(list.find(m => !m.done && !m.informational) || null);
    });
  }, []);

  // Focus session logging (hyperfocus-fix Area) — starts the moment
  // this screen opens, closes out on exit however that happens (Mark
  // complete, the X button, or navigating away entirely).
  useEffect(() => {
    startFocusSession().then(id => { sessionIdRef.current = id; });
    return () => { endFocusSession(sessionIdRef.current); };
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setShowProtectionNudge(true), PROTECTION_CHECK_MINUTES * 60 * 1000);
    return () => clearTimeout(timer);
  }, []);

  async function handleComplete() {
    if (item) await toggleTodayItem(item, true);
    await endFocusSession(sessionIdRef.current);
    navigate('/today');
  }

  function handleExit() {
    endFocusSession(sessionIdRef.current);
    navigate('/today');
  }

  return (
    <Overlay open variant="fullscreen" onClose={handleExit} showScrim={false}>
      {!item ? (
        <div className="focus-empty">Nothing left to focus on — you're clear.</div>
      ) : (
        <div className="focus-content">
          <div className={`focus-track-tag track-${item.track}`}>{item.track === 'business' ? 'Business' : 'Personal'}</div>
          <h1 className="focus-title">{item.title}</h1>
          {item.context && <p className="focus-context">{item.context}</p>}

          <TimerWidget mission={{ sourceTable: item.sourceTable, sourceId: item.sourceId, title: item.title }} />

          {showProtectionNudge && (
            <div className="focus-protection-nudge">
              You've been at this a while — water, a stretch, or a bite to eat, whenever you get a natural pause. No need to stop now.
              <button className="focus-protection-dismiss" onClick={() => setShowProtectionNudge(false)} aria-label="Dismiss">×</button>
            </div>
          )}

          <div className="row" style={{ justifyContent: 'center', gap: 'var(--space-3)', marginTop: 'var(--space-4)' }}>
            <Button variant="primary" onClick={handleComplete}>Mark complete</Button>
          </div>
        </div>
      )}
    </Overlay>
  );
}
