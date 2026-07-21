import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import MissionList from '../../components/mission/MissionList.jsx';
import ScheduleView, { getOverrunningBlock } from '../../components/schedule/ScheduleView.jsx';
import EnergyCheckIn from '../../components/intelligence/EnergyCheckIn.jsx';
import { getFeatureFlag } from '../../services/settings.js';
import AskAIPanel from '../../components/intelligence/AskAIPanel.jsx';
import Card from '../../components/ui/Card.jsx';
import Button from '../../components/ui/Button.jsx';
import { getTodayMissions, toggleMission, dismissMission, addCustomMission } from '../../services/missions.js';
import { getTodaySchedule, toggleTaskDone } from '../../services/dailyExecution.js';
import { toggleBlockCompletion, toggleBlockStep, addTransitionStep } from '../../services/lifeRhythm.js';
import { getDuePrompt } from '../../services/prompts.js';
import { getNeglectedPriorities } from '../../services/neglected.js';
import WeeklyResetModal from '../Plan/WeeklyResetModal.jsx';
import './TodayPage.css';

export default function TodayPage() {
  const [schedule, setSchedule] = useState(null);
  const [missions, setMissions] = useState(null);
  const [duePrompt, setDuePrompt] = useState(null);
  const [addingCustom, setAddingCustom] = useState(false);
  const [customTitle, setCustomTitle] = useState('');
  const [showEnergyCheckin, setShowEnergyCheckin] = useState(true);
  const [neglected, setNeglected] = useState([]);
  const [neglectedError, setNeglectedError] = useState(null);
  const [hyperfocusDismissed, setHyperfocusDismissed] = useState(false);

  const [scheduleError, setScheduleError] = useState(null);

  async function refreshSchedule() {
    try {
      setScheduleError(null);
      const blocks = await getTodaySchedule();
      setSchedule(blocks);
    } catch (err) {
      console.error('Failed to load today\'s schedule:', err);
      setScheduleError(err.message || 'Something went wrong loading the schedule.');
      setSchedule([]);
    }
  }

  async function refreshMissions() {
    const list = await getTodayMissions();
    setMissions(list);
  }

  useEffect(() => {
    refreshSchedule();
    refreshMissions();
    getDuePrompt().then(setDuePrompt);
    getFeatureFlag('show_energy_checkin').then(setShowEnergyCheckin);
    getNeglectedPriorities().then(setNeglected).catch(err => {
      console.error('Failed to load neglected priorities:', err);
      setNeglectedError(err.message || 'Something went wrong.');
    });
  }, []);

  async function handleToggleTask(task, done) {
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

  async function handleToggleBlock(block, done) {
    setSchedule(prev => prev.map(b => (b.id === block.id ? { ...b, completed: done } : b)));
    await toggleBlockCompletion(block.id, done);
    if (done) {
      setTimeout(() => {
        setSchedule(prev => prev.filter(b => b.id !== block.id));
      }, 650);
    }
  }

  async function handleToggleStep(block, stepIndex, done) {
    const currentSteps = block.completed_steps || [];
    setSchedule(prev => prev.map(b => {
      if (b.id !== block.id) return b;
      const next = [...(b.completed_steps || [])];
      next[stepIndex] = done;
      return { ...b, completed_steps: next };
    }));
    await toggleBlockStep(block.id, stepIndex, currentSteps, done);
  }

  async function handleAddStep(block, stepLabel) {
    if (!block.source_template_id) return; // manually-added blocks have no template to attach steps to
    await addTransitionStep(block.source_template_id, stepLabel);
    refreshSchedule();
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
  const overrunningBlock = !hyperfocusDismissed ? getOverrunningBlock(schedule) : null;

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

      {/* Hyperfocus nudge (Area 4) — no timer, no tracking, just the
          block's own end_time. Supportive framing, not a scold. */}
      {overrunningBlock && (
        <Card className="hyperfocus-nudge">
          <div className="row-between">
            <div style={{ fontSize: 13 }}>
              You've been deep in <strong>{overrunningBlock.title}</strong> — it was set to wrap up at{' '}
              {overrunningBlock.end_time?.slice(0, 5)}. Totally fine to keep going.
            </div>
          </div>
          <div className="row" style={{ marginTop: 'var(--space-2)', gap: 'var(--space-2)' }}>
            <Button size="sm" variant="ghost" onClick={() => setHyperfocusDismissed(true)}>Keep going</Button>
            <Button size="sm" variant="text" onClick={() => { setHyperfocusDismissed(true); document.querySelector('.today-schedule-col')?.scrollIntoView({ behavior: 'smooth' }); }}>
              Show me the rest of today
            </Button>
          </div>
        </Card>
      )}

      <div className="row-between" style={{ marginTop: 'var(--space-4)', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
        {showEnergyCheckin && <EnergyCheckIn onReplanned={refreshSchedule} />}
        <AskAIPanel onApplied={refreshSchedule} />
      </div>

      {/* Neglected Priorities (Area 1/2) — the one place that looks
          across goals, relationships, habits, and maintenance at once. */}
      {neglectedError && (
        <Card style={{ marginTop: 'var(--space-4)', borderLeft: '3px solid var(--danger)' }}>
          <div style={{ fontSize: 13 }}>"Might be worth a look" couldn't load: {neglectedError}</div>
        </Card>
      )}
      {neglected.length > 0 && (
        <Card style={{ marginTop: 'var(--space-4)' }}>
          <div className="section-label">Might be worth a look</div>
          <div className="stack" style={{ marginTop: 'var(--space-2)' }}>
            {neglected.map(item => (
              <Link key={`${item.type}-${item.id}`} to={item.link} className="row-between neglected-link" style={{ fontSize: 13, padding: '4px 0' }}>
                <span>{item.label}</span>
                <span className="muted" style={{ fontSize: 11 }}>{item.detail}</span>
              </Link>
            ))}
          </div>
        </Card>
      )}

      <div className="today-columns">
        <div className="today-schedule-col">
          <div className="row-between" style={{ marginTop: 'var(--space-5)', marginBottom: 'var(--space-3)' }}>
            <div className="section-label">Today's schedule</div>
            <div className="row" style={{ gap: 'var(--space-2)' }}>
              <Link to="/today/focus"><Button variant="ghost" size="sm">Focus Mode</Button></Link>
              <Link to="/today/research"><Button variant="ghost" size="sm">Research Mode</Button></Link>
            </div>
          </div>
          <ScheduleView
            blocks={schedule}
            onToggleTask={handleToggleTask}
            onToggleBlock={handleToggleBlock}
            onToggleStep={handleToggleStep}
            onAddStep={handleAddStep}
          />
          {scheduleError && (
            <Card style={{ marginTop: 'var(--space-3)', borderLeft: '3px solid var(--danger)' }}>
              <div style={{ fontSize: 13 }}>Schedule couldn't load: {scheduleError}</div>
              <div className="muted" style={{ fontSize: 11, marginTop: 4 }}>
                Most likely cause: the newest database migration (v2_executive_function_layer.sql) hasn't been run yet in Supabase.
              </div>
            </Card>
          )}
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
