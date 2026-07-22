import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { X } from 'lucide-react';
import Button from '../../components/ui/Button.jsx';
import TimerWidget from '../../components/timer/TimerWidget.jsx';
import { getTodayItems, toggleTodayItem } from '../../services/todayItems.js';
import { startFocusSession, endFocusSession } from '../../services/focusSessions.js';
import './FocusMode.css';

export default function FocusMode() {
  const navigate = useNavigate();
  const [item, setItem] = useState(null);
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
    <div className="focus-shell">
      <button className="focus-exit" onClick={handleExit} aria-label="Exit focus mode">
        <X size={22} />
      </button>

      {!item ? (
        <div className="focus-empty">Nothing left to focus on — you're clear.</div>
      ) : (
        <div className="focus-content">
          <div className={`focus-track-tag track-${item.track}`}>{item.track === 'business' ? 'Business' : 'Personal'}</div>
          <h1 className="focus-title">{item.title}</h1>
          {item.context && <p className="focus-context">{item.context}</p>}

          <TimerWidget mission={{ sourceTable: item.sourceTable, sourceId: item.sourceId, title: item.title }} />

          <div className="row" style={{ justifyContent: 'center', gap: 'var(--space-3)', marginTop: 'var(--space-4)' }}>
            <Button variant="primary" onClick={handleComplete}>Mark complete</Button>
          </div>
        </div>
      )}
    </div>
  );
}
