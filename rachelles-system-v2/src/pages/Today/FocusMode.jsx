import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X } from 'lucide-react';
import Button from '../../components/ui/Button.jsx';
import { getTodayMissions, toggleMission } from '../../services/missions.js';
import './FocusMode.css';

export default function FocusMode() {
  const navigate = useNavigate();
  const [mission, setMission] = useState(null);
  const [seconds, setSeconds] = useState(0);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    getTodayMissions().then(list => {
      setMission(list.find(m => !m.done && !m.informational) || null);
    });
  }, []);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setSeconds(s => s + 1), 1000);
    return () => clearInterval(id);
  }, [running]);

  async function handleComplete() {
    if (mission) await toggleMission(mission, true);
    navigate('/today');
  }

  const mm = String(Math.floor(seconds / 60)).padStart(2, '0');
  const ss = String(seconds % 60).padStart(2, '0');

  return (
    <div className="focus-shell">
      <button className="focus-exit" onClick={() => navigate('/today')} aria-label="Exit focus mode">
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
