import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import MissionList from '../../components/mission/MissionList.jsx';
import ScheduleView from '../../components/schedule/ScheduleView.jsx';
import EnergyCheckIn from '../../components/intelligence/EnergyCheckIn.jsx';
import AskAIPanel from '../../components/intelligence/AskAIPanel.jsx';
import Card from '../../components/ui/Card.jsx';
import Button from '../../components/ui/Button.jsx';
import { getTodayMissions, toggleMission, dismissMission, addCustomMission } from '../../services/missions.js';
import { getTodaySchedule, toggleTaskDone } from '../../services/dailyExecution.js';
import { getDuePrompt } from '../../services/prompts.js';
import WeeklyResetModal from '../Plan/WeeklyResetModal.jsx';
import './TodayPage.css';

export default function TodayPage() {
  const [schedule, setSchedule] = useState(null);
  const [missions, setMissions] = useState(null);
  const [duePrompt, setDuePrompt] = useState(null);
  const [addingCustom, setAddingCustom] = useState(false);
  const [customTitle, setCustomTitle] = useState('');

  async function refreshSchedule() {
    const blocks = await getTodaySchedule();
    setSchedule(blocks);
  }

  async function refreshMissions() {
    const list = await getTodayMissions();
    setMissions(list);
  }

  useEffect(() => {
    refreshSchedule();
    refreshMissions();
    getDuePrompt().then(setDuePrompt);
  }, []);

  async function handleToggleTask(task, done) {
    // Mark it done first so the checkmark/strikethrough shows briefly —
    // then it actually disappears from the schedule, not just fades in place.
    setSchedule(prev => prev.map(b => ({
      ...b,
      tasks: b.tasks.map(t => (t.id === task.id ? { ...t, completed: done } : t)),
    })));
    await toggleTaskDone(task.id, done);
    if (done) {
      setTimeout(() => {
        setSchedule(prev => prev.map(b => ({
          ...b,
          tasks: b.tasks.filter(t => t.id !== task.id),
        })));
      }, 650);
    }
  }

  async function handleToggleMission(mission, done) {
    setMissions(prev => prev.map(m => (m.id === mission.id ? { ...m, done } : m)));
    await toggleMission(mission, done);
    setTimeout(refreshMissions, 450);
  }

  async function handleDismiss(mission) {
    await dismissMission(mission);
    refreshMissions();
  }

  async function handleAddCustom(track) {
    if (!customTitle.trim()) return;
    await addCustomMission(customTitle.trim(), track);
    setCustomTitle('');
    setAddingCustom(false);
    refreshMissions();
  }

  const allScheduledTasks = schedule ? schedule.flatMap(b => b.tasks || []) : [];
  const doneCount = allScheduledTasks.filter(t => t.completed).length;
  const total = allScheduledTasks.length;
  const nextUp = allScheduledTasks.find(t => !t.completed);

  return (
    <div>
      <div className="page-title">🏡 Today</div>

      <Card className="today-summary-card">
        <div className="row-between">
          <div>
            <div className="section-label">Right now</div>
            <div className="today-headline">
              {schedule === null ? 'Building your day…' : total === 0
                ? 'Nothing assigned yet'
                : doneCount === total ? '🎉 All done — go you!' : (nextUp?.title || 'All caught up')}
            </div>
          </div>
          {total > 0 && <div className="today-progress-chip">{doneCount} / {total}</div>}
        </div>
      </Card>

      <div className="row-between" style={{ marginTop: 'var(--space-4)', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
        <EnergyCheckIn onReplanned={refreshSchedule} />
        <AskAIPanel onApplied={refreshSchedule} />
      </div>

      <div className="today-columns">
        <div className="today-schedule-col">
          <div className="row-between" style={{ marginTop: 'var(--space-5)', marginBottom: 'var(--space-3)' }}>
            <div className="section-label">Today's schedule</div>
            <div className="row" style={{ gap: 'var(--space-2)' }}>
              <Link to="/today/focus"><Button variant="ghost" size="sm">Focus Mode</Button></Link>
              <Link to="/today/research"><Button variant="ghost" size="sm">Research Mode</Button></Link>
            </div>
          </div>
          <ScheduleView blocks={schedule} onToggleTask={handleToggleTask} />
        </div>

        <div className="today-missions-col">
          <div className="section-label" style={{ marginTop: 'var(--space-5)', marginBottom: 'var(--space-3)' }}>Other things today</div>
          <MissionList missions={missions} onToggle={handleToggleMission} onDismiss={handleDismiss} />

          <div className="today-add-custom">
            {addingCustom ? (
              <div className="row">
                <input
                  autoFocus
                  value={customTitle}
                  onChange={e => setCustomTitle(e.target.value)}
                  placeholder="Add something to today..."
                  onKeyDown={e => e.key === 'Enter' && handleAddCustom('personal')}
                />
                <Button size="sm" variant="sage" onClick={() => handleAddCustom('personal')}>Personal</Button>
                <Button size="sm" variant="accent" onClick={() => handleAddCustom('business')}>Business</Button>
              </div>
            ) : (
              <Button variant="text" onClick={() => setAddingCustom(true)}>+ Add something to today</Button>
            )}
          </div>
        </div>
      </div>

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
