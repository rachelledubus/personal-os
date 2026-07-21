import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Timer } from 'lucide-react';
import MissionList from '../../components/mission/MissionList.jsx';
import Card from '../../components/ui/Card.jsx';
import Button from '../../components/ui/Button.jsx';
import { getTodayMissions, toggleMission, dismissMission, addCustomMission } from '../../services/missions.js';
import { getDuePrompt } from '../../services/prompts.js';
import { getTodayStats, getWeeklyTrend } from '../../services/timer.js';
import WeeklyResetModal from '../Plan/WeeklyResetModal.jsx';
import './TodayPage.css';

export default function TodayPage() {
  const [missions, setMissions] = useState(null);
  const [duePrompt, setDuePrompt] = useState(null);
  const [addingCustom, setAddingCustom] = useState(false);
  const [customTitle, setCustomTitle] = useState('');
  const [focusStats, setFocusStats] = useState({ totalSeconds: 0, sessionCount: 0 });
  const [trend, setTrend] = useState([]);

  async function refresh() {
    const list = await getTodayMissions();
    setMissions(list);
  }

  useEffect(() => {
    refresh();
    getDuePrompt().then(setDuePrompt);
    getTodayStats().then(setFocusStats);
    getWeeklyTrend().then(setTrend);
  }, []);

  async function handleToggle(mission, done) {
    setMissions(prev => prev.map(m => (m.id === mission.id ? { ...m, done } : m)));
    await toggleMission(mission, done);
    setTimeout(refresh, 450);
  }

  async function handleDismiss(mission) {
    await dismissMission(mission);
    refresh();
  }

  async function handleAddCustom(track) {
    if (!customTitle.trim()) return;
    await addCustomMission(customTitle.trim(), track);
    setCustomTitle('');
    setAddingCustom(false);
    refresh();
  }

  const doneCount = missions ? missions.filter(m => m.done).length : 0;
  const total = missions ? missions.filter(m => !m.informational).length : 0;
  const maxTrendSeconds = Math.max(60, ...trend.map(d => d.seconds));

  return (
    <div>
      <div className="page-title">🏡 Today</div>

      <Card className="today-summary-card">
        <div className="row-between">
          <div>
            <div className="section-label">Right now</div>
            <div className="today-headline">
              {missions === null ? 'Loading…' : total === 0
                ? 'Nothing on deck'
                : (missions.find(m => !m.done && !m.informational)?.title || 'All caught up')}
            </div>
          </div>
          <div className="today-progress-chip">{doneCount} / {total}</div>
        </div>
      </Card>

      <div className="row-between" style={{ marginTop: 'var(--space-5)', marginBottom: 'var(--space-3)' }}>
        <div className="section-label">Today's sequence</div>
        <div className="row" style={{ gap: 'var(--space-2)' }}>
          <Link to="/today/focus"><Button variant="ghost" size="sm">Focus Mode</Button></Link>
          <Link to="/today/research"><Button variant="ghost" size="sm">Research Mode</Button></Link>
        </div>
      </div>

      <MissionList missions={missions} onToggle={handleToggle} onDismiss={handleDismiss} />

      <div className="today-add-custom">
        {addingCustom ? (
          <div className="today-add-row">
            <input
              autoFocus
              value={customTitle}
              onChange={e => setCustomTitle(e.target.value)}
              placeholder="Add something to today..."
              onKeyDown={e => e.key === 'Enter' && handleAddCustom('personal')}
            />
            <div className="today-add-row-buttons">
              <Button size="sm" variant="sage" onClick={() => handleAddCustom('personal')}>Personal</Button>
              <Button size="sm" variant="accent" onClick={() => handleAddCustom('business')}>Business</Button>
            </div>
          </div>
        ) : (
          <Button variant="text" onClick={() => setAddingCustom(true)}>+ Add something to today</Button>
        )}
      </div>

      <Card style={{ marginTop: 'var(--space-5)' }}>
        <div className="row-between">
          <div className="section-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Timer size={13} /> Focus this week
          </div>
          <span className="muted" style={{ fontSize: 12.5 }}>
            Today: {Math.round(focusStats.totalSeconds / 60)}m · {focusStats.sessionCount} session{focusStats.sessionCount === 1 ? '' : 's'}
          </span>
        </div>
        <div className="focus-trend-row">
          {trend.map(d => (
            <div key={d.date} className="focus-trend-bar-wrap" title={`${Math.round(d.seconds / 60)} min`}>
              <div className="focus-trend-bar" style={{ height: `${Math.max(4, (d.seconds / maxTrendSeconds) * 40)}px` }} />
            </div>
          ))}
        </div>
      </Card>

      {duePrompt && (
        <WeeklyResetModal
          promptType={duePrompt.type}
          marker={duePrompt.marker}
          onClose={() => setDuePrompt(null)}
        />
      )}
    </div>
  );
}
