import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X } from 'lucide-react';
import Button from '../../components/ui/Button.jsx';
import TimerWidget from '../../components/timer/TimerWidget.jsx';
import { getTodayMissions, toggleMission } from '../../services/missions.js';
import './FocusMode.css';

export default function FocusMode() {
  const navigate = useNavigate();
  const [mission, setMission] = useState(null);

  useEffect(() => {
    getTodayMissions().then(list => {
      setMission(list.find(m => !m.done && !m.informational) || null);
    });
  }, []);

  async function handleComplete() {
    if (mission) await toggleMission(mission, true);
    navigate('/today');
  }

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

          <TimerWidget mission={{ sourceTable: mission.sourceTable, sourceId: mission.sourceId, title: mission.title }} />

          <div className="row" style={{ justifyContent: 'center', gap: 'var(--space-3)', marginTop: 'var(--space-4)' }}>
            <Button variant="primary" onClick={handleComplete}>Mark complete</Button>
          </div>
        </div>
      )}
    </div>
  );
}
