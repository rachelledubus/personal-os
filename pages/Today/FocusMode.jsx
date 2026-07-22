import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { X } from 'lucide-react';
import Button from '../../components/ui/Button.jsx';
import { getTodayMissions, toggleMission } from '../../services/missions.js';
import { startFocusSession, endFocusSession } from '../../services/focusSessions.js';
import './FocusMode.css';

export default function FocusMode() {
  const navigate = useNavigate();
  const [mission, setMission] = useState(null);
  const [seconds, setSeconds] = useState(0);
  const [running, setRunning] = useState(false);
  const sessionIdRef = useRef(null);

  useEffect(() => {
    getTodayMissions().then(list => {
      setMission(list.find(m => !m.done && !m.informational) || null);
    });
  }, []);

  // Focus session logging (Area for the hyperfocus fix) — starts the
  // moment this screen opens, closes out on exit however that happens
  // (Mark complete, the X button, or navigating away entirely).
  useEffect(() => {
    startFocusSession().then(id => { sessionIdRef.current = id; });
    return () => { endFocusSession(sessionIdRef.current); };
  }, []);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setSeconds(s => s + 1), 1000);
    return () => clearInterval(id);
  }, [running]);

  async function handleComplete() {
    if (mission) await toggleMission(mission, true);
    await endFocusSession(sessionIdRef.current);
    navigate('/today');
  }

  function handleExit() {
    endFocusSession(sessionIdRef.current);
    navigate('/today');
  }

  const mm = String(Math.floor(seconds / 60)).padStart(2, '0');
  const ss = String(seconds % 60).padStart(2, '0');

  return (
    <div className="focus-shell">
      <button className="focus-exit" onClick={handleExit} aria-label="Exit focus mode">
        <X size={22} />
      </button>

      {!mission ? (
        <div className="focus-empty">Nothing left to focus on — you're clear.</div>
      ) : (
        <div className="focus-content">
          <div className={`focus-track-tag track-${mission.track}`}>{mission.track === 'business' ? 'Business' : 'Personal'}</div>
          <h1 className="focus-title">{mission.title}</h1>
          {mission.context && <p className="focus-context">{mission.context}</p>}

          <div className="focus-timer">{mm}:{ss}</div>
          <div className="row" style={{ justifyContent: 'center', gap: 'var(--space-3)' }}>
            <Button variant="ghost" onClick={() => setRunning(r => !r)}>{running ? 'Pause' : 'Start timer'}</Button>
            <Button variant="primary" onClick={handleComplete}>Mark complete</Button>
          </div>
        </div>
      )}
    </div>
  );
}
