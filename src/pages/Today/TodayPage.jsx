import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Home, Check } from 'lucide-react';
import TodayItemList from '../../components/todayItem/TodayItemList.jsx';
import ScheduleView, { getOverrunningBlock } from '../../components/schedule/ScheduleView.jsx';
import Banner from '../../components/ui/Banner.jsx';
import EnergyCheckIn from '../../components/intelligence/EnergyCheckIn.jsx';
import AnchorTimeAdjuster from '../../components/intelligence/AnchorTimeAdjuster.jsx';
import { getFeatureFlag } from '../../services/settings.js';
import AskAIPanel from '../../components/intelligence/AskAIPanel.jsx';
import Card from '../../components/ui/Card.jsx';
import Button from '../../components/ui/Button.jsx';
import ProgressBar from '../../components/ui/ProgressBar.jsx';
import PageHeader from '../../components/layout/PageHeader.jsx';
import Skeleton from '../../components/ui/Skeleton.jsx';
import { Row } from '../../components/layout/Row.jsx';
import Stack from '../../components/layout/Stack.jsx';
import { listGuardians, getXpProgressWithinLevel } from '../../services/guardians.js';
import { getTodayItems, toggleTodayItem, dismissTodayItem, addCustomTodayItem } from '../../services/todayItems.js';
import { getTodaySchedule, toggleTaskDone, moveTaskToBlock, dismissBlock } from '../../services/dailyExecution.js';
import { listTodayFocusSessions } from '../../services/focusSessions.js';
import { toggleBlockCompletion, toggleBlockStep, addTransitionStep } from '../../services/lifeRhythm.js';
import { getDuePrompt } from '../../services/prompts.js';
import { getNeglectedPriorities } from '../../services/neglected.js';
import { countOverdue } from '../../services/contacts.js';
import { useCapacityMode } from '../../components/layout/CapacityModeContext.jsx';
import { getTodayCommitmentCount, recordCommitmentAdded } from '../../services/commitmentTracking.js';
import WeeklyResetModal from '../Plan/WeeklyResetModal.jsx';
import './TodayPage.css';

// Per the interview: a confirmation dialog on elevated days, never a
// hard block. This threshold is the number of things added *today*
// before the nudge starts appearing — deliberately not configurable
// yet, since it needs real use to know if 5 is right.
const OVERCOMMIT_THRESHOLD = 5;

export default function TodayPage() {
  const { mode } = useCapacityMode();
  const [schedule, setSchedule] = useState(null);
  const [todayItems, setTodayItems] = useState(null);
  const [duePrompt, setDuePrompt] = useState(null);
  const [addingCustom, setAddingCustom] = useState(false);
  const [customTitle, setCustomTitle] = useState('');
  const [showEnergyCheckin, setShowEnergyCheckin] = useState(true);
  const [neglected, setNeglected] = useState([]);
  const [neglectedError, setNeglectedError] = useState(null);
  const [businessOverdueCount, setBusinessOverdueCount] = useState(0);
  const [hyperfocusDismissed, setHyperfocusDismissed] = useState(false);
  const [focusSessions, setFocusSessions] = useState([]);

  const [scheduleError, setScheduleError] = useState(null);

  async function refreshSchedule() {
    try {
      setScheduleError(null);
      const blocks = await getTodaySchedule();
      setSchedule(blocks);
      setFocusSessions(await listTodayFocusSessions());
    } catch (err) {
      console.error('Failed to load today\'s schedule:', err);
      setScheduleError(err.message || 'Something went wrong loading the schedule.');
      setSchedule([]);
    }
  }

  async function refreshTodayItems() {
    const list = await getTodayItems();
    setTodayItems(list);
  }

  useEffect(() => {
    refreshSchedule();
    refreshTodayItems();
    getDuePrompt().then(setDuePrompt);
    getFeatureFlag('show_energy_checkin').then(setShowEnergyCheckin);
    getNeglectedPriorities().then(setNeglected).catch(err => {
      console.error('Failed to load neglected priorities:', err);
      setNeglectedError(err.message || 'Something went wrong.');
    });
    countOverdue().then(setBusinessOverdueCount);
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

  const [justCompletedIds, setJustCompletedIds] = useState(new Set());
  const [showCompleted, setShowCompleted] = useState(false);

  async function handleToggleBlock(block, done) {
    setSchedule(prev => prev.map(b => (b.id === block.id ? { ...b, completed: done } : b)));
    await toggleBlockCompletion(block.id, done);
    if (done) {
      // Brief hold in the main view so the checkmark actually registers
      // before it moves to "Completed today" — the data itself is kept
      // (not deleted), which is what makes that section real instead of
      // a dead end once you navigate away and back.
      setJustCompletedIds(prev => new Set(prev).add(block.id));
      setTimeout(() => {
        setJustCompletedIds(prev => { const next = new Set(prev); next.delete(block.id); return next; });
      }, 650);
    } else {
      setJustCompletedIds(prev => { const next = new Set(prev); next.delete(block.id); return next; });
    }
  }

  async function handleMoveTask(taskId, newBlockId) {
    let movedTask = null;
    setSchedule(prev => {
      // pull the task out of wherever it currently lives
      const next = prev.map(b => {
        const found = b.tasks?.find(t => t.id === taskId);
        if (found) movedTask = found;
        return { ...b, tasks: (b.tasks || []).filter(t => t.id !== taskId) };
      });
      if (!movedTask) return prev;
      // drop it into the target block
      return next.map(b => (b.id === newBlockId ? { ...b, tasks: [...(b.tasks || []), movedTask] } : b));
    });
    await moveTaskToBlock(taskId, newBlockId);
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

  async function handleToggleItem(item, done) {
    setTodayItems(prev => prev.map(m => (m.id === item.id ? { ...m, done } : m)));
    await toggleTodayItem(item, done);
    setTimeout(refreshTodayItems, 450);
  }

  async function handleDismiss(item) {
    await dismissTodayItem(item);
    refreshTodayItems();
  }

  async function handleAddCustom(track) {
    if (!customTitle.trim()) return;
    if (mode === 'elevated') {
      const countSoFar = await getTodayCommitmentCount();
      if (countSoFar >= OVERCOMMIT_THRESHOLD) {
        const proceed = window.confirm(
          `That's ${countSoFar + 1} things added to today already — want to add this one too, or spread some out?`
        );
        if (!proceed) return;
      }
    }
    await addCustomTodayItem(customTitle.trim(), track);
    await recordCommitmentAdded();
    setCustomTitle('');
    setAddingCustom(false);
    refreshTodayItems();
  }

  async function handleDismissBlock(block) {
    setSchedule(prev => prev.filter(b => b.id !== block.id));
    await dismissBlock(block.id);
  }

  const allScheduledTasks = schedule ? schedule.flatMap(b => b.tasks || []) : [];
  const visibleBlocks = schedule ? schedule.filter(b => !b.completed || justCompletedIds.has(b.id)) : schedule;
  const completedBlocks = schedule ? schedule.filter(b => b.completed && !justCompletedIds.has(b.id)) : [];
  // Was scheduled-tasks-only, which is why this permanently read "Nothing
  // assigned yet" for anyone whose day isn't built entirely out of
  // time-blocked tasks — the far more common case. Now reflects
  // everything actually actionable today, matching what "Other Things
  // Today" already shows below it.
  const actionableTodayItems = (todayItems || []).filter(i => !i.informational);
  const doneCount = allScheduledTasks.filter(t => t.completed).length + actionableTodayItems.filter(i => i.done).length;
  const total = allScheduledTasks.length + actionableTodayItems.length;
  const nextUp = allScheduledTasks.find(t => !t.completed) || actionableTodayItems.find(i => !i.done);
  const overrunningBlock = !hyperfocusDismissed ? getOverrunningBlock(schedule, focusSessions) : null;

  // Zone 2 has something to show above the schedule/items columns only
  // if at least one of these three is true — otherwise that container
  // doesn't render at all rather than showing an empty shell.
  const hasZone2Alerts = businessOverdueCount > 0 || !!neglectedError || neglected.length > 0;

  return (
    <div>
      <Banner slotKey="today_banner" scene="today" />
      <PageHeader icon={Home} title="Today" />

      {/* Zone 3 — Companion. Fixed position, every screen it appears
          on: right under the header, above everything else. */}
      <GuardianStrip />

      {/* Zone 1 — Primary. The one thing this screen answers: what's
          next. Loading, in-progress, and done all render here, in the
          same place, at the same weight — a shape while loading
          (never a blank flash), never a second competing hero. */}
      {schedule === null ? (
        <Skeleton variant="card" />
      ) : (
        <Stack gap={3}>
          <Card className="today-summary-card">
            <div className="row-between">
              <div>
                <div className="section-label">Right now</div>
                <div className="today-headline">
                  {total === 0
                    ? 'Nothing assigned yet'
                    : doneCount === total ? (mode === 'elevated' ? 'All done for today' : '🎉 All done — go you!') : (nextUp?.title || 'All caught up')}
                </div>
              </div>
              {total > 0 && <div className="today-progress-chip">{doneCount} / {total}</div>}
            </div>

            {/* Hyperfocus nudge lives inside the hero, not as a second
                competing card — it's still about "right now," just a
                qualifier on it. Supportive framing, not a scold. */}
            {overrunningBlock && (
              <div className="hyperfocus-nudge" style={{ marginTop: 'var(--space-3)', paddingTop: 'var(--space-3)', borderTop: '1px solid var(--border-default)' }}>
                <div style={{ fontSize: 'var(--text-small)' }}>
                  You've been deep in <strong>{overrunningBlock.title}</strong> — it was set to wrap up at{' '}
                  {overrunningBlock.end_time?.slice(0, 5)}. Totally fine to keep going.
                </div>
                <Row gap={2} style={{ marginTop: 'var(--space-2)' }}>
                  <Button size="sm" variant="ghost" onClick={() => setHyperfocusDismissed(true)}>Keep going</Button>
                  <Button size="sm" variant="text" onClick={() => { setHyperfocusDismissed(true); document.querySelector('.today-schedule-col')?.scrollIntoView({ behavior: 'smooth' }); }}>
                    Show me the rest of today
                  </Button>
                </Row>
              </div>
            )}
          </Card>
        </Stack>
      )}

      {/* Zone 4 — Utility. Persistent, slim, same strip every day —
          this is what Capacity Mode reads (via Energy Check-In) to
          set the mode the rest of the page could someday reweight
          around. Never a full-width card competing with Zone 1. */}
      <Row gap={3} wrap style={{ marginTop: 'var(--space-4)' }}>
        {showEnergyCheckin && <EnergyCheckIn onReplanned={refreshSchedule} />}
        <AskAIPanel onApplied={refreshSchedule} />
      </Row>
      <div style={{ marginTop: 'var(--space-2)' }}>
        <AnchorTimeAdjuster onRecalculated={refreshSchedule} />
      </div>

      {/* Zone 2 — Secondary, everything else, consolidated. Business
          overdue, the neglected-priorities error, and "Might be worth
          a look" used to be three separate Cards each competing for
          the same attention as Zone 1. One container now, lower
          visual weight than the hero above, still always visible —
          never collapsed away, only ever reweighted. */}
      {hasZone2Alerts && (
        <Card style={{ marginTop: 'var(--space-4)' }}>
          <Stack gap={3}>
            {businessOverdueCount > 0 && (
              <Link to="/business/weekly-reset" className="row-between neglected-link" style={{ fontSize: 'var(--text-small)', padding: '4px 0' }}>
                <span>You have {businessOverdueCount} overdue Business task{businessOverdueCount === 1 ? '' : 's'}</span>
                <span className="muted" style={{ fontSize: 'var(--text-micro)' }}>See who →</span>
              </Link>
            )}
            {neglectedError && (
              <div style={{ fontSize: 'var(--text-small)', color: 'var(--danger)' }}>
                "Might be worth a look" couldn't load: {neglectedError}
              </div>
            )}
            {neglected.length > 0 && (
              <div>
                <div className="section-label">Might be worth a look</div>
                <div className="stack" style={{ marginTop: 'var(--space-2)' }}>
                  {neglected.map(item => (
                    <Link key={`${item.type}-${item.id}`} to={item.link} className="row-between neglected-link" style={{ fontSize: 'var(--text-small)', padding: '4px 0' }}>
                      <span>{item.label}</span>
                      <span className="muted" style={{ fontSize: 'var(--text-micro)' }}>{item.detail}</span>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </Stack>
        </Card>
      )}

      {/* Zone 2 continued — the schedule and today-items columns are
          the bulk of "everything else." Same content and handlers as
          before; just no longer visually competing with a separate
          alerts card above it. */}
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
            blocks={visibleBlocks}
            onToggleTask={handleToggleTask}
            onToggleBlock={handleToggleBlock}
            onToggleStep={handleToggleStep}
            onAddStep={handleAddStep}
            onMoveTask={handleMoveTask}
            onDismissBlock={handleDismissBlock}
          />
          {scheduleError && (
            <Card style={{ marginTop: 'var(--space-3)', borderLeft: '3px solid var(--danger)' }}>
              <div style={{ fontSize: 'var(--text-small)' }}>Schedule couldn't load: {scheduleError}</div>
              <div className="muted" style={{ fontSize: 'var(--text-micro)', marginTop: 4 }}>
                Most likely cause: the newest database migration (v2_executive_function_layer.sql) hasn't been run yet in Supabase.
              </div>
            </Card>
          )}
          {completedBlocks.length > 0 && (
            <div style={{ marginTop: 'var(--space-3)' }}>
              <Button size="sm" variant="text" onClick={() => setShowCompleted(!showCompleted)}>
                {showCompleted ? '▾' : '▸'} <Check size={13} style={{ verticalAlign: 'middle' }} /> Completed today ({completedBlocks.length})
              </Button>
              {showCompleted && (
                <div style={{ marginTop: 'var(--space-2)', opacity: 0.7 }}>
                  <ScheduleView
                    blocks={completedBlocks}
                    onToggleTask={handleToggleTask}
                    onToggleBlock={handleToggleBlock}
                    onToggleStep={handleToggleStep}
                    onAddStep={handleAddStep}
                    onMoveTask={handleMoveTask}
                  />
                </div>
              )}
            </div>
          )}
        </div>

        <div className="today-items-col">
          <div className="section-label" style={{ marginTop: 'var(--space-5)', marginBottom: 'var(--space-3)' }}>Other things today</div>
          <TodayItemList items={todayItems} onToggle={handleToggleItem} onDismiss={handleDismiss} />

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

const GUARDIAN_EMOJI = { hana: '🌿', rei: '📘', mochi: '🍡', sora: '☁️' };

/** Compact, glance-only — Product Vision's "clarity over completeness"
 *  applies here as much as anywhere else. Full detail still lives in
 *  Control Center; this is just enough to feel real without becoming
 *  another list to manage. */
const GUARDIAN_BADGE_COLOR = { hana: 'var(--sage)', rei: 'var(--navy)', mochi: 'var(--blush)', sora: 'var(--gold)' };

function GuardianStrip() {
  const [guardians, setGuardians] = useState(null);

  useEffect(() => { listGuardians().then(setGuardians); }, []);

  if (!guardians || guardians.length === 0) return null;

  return (
    <div className="guardian-strip">
      {guardians.map(g => (
        <div key={g.id} className="guardian-strip-item">
          <div
            className="guardian-strip-badge"
            style={{ background: GUARDIAN_BADGE_COLOR[g.guardian_key] || 'var(--sage)' }}
          >
            <span>{GUARDIAN_EMOJI[g.guardian_key] || '✨'}</span>
          </div>
          <div className="guardian-strip-label">
            <span>{g.name}</span>
            <span className="muted">Lv {g.level}</span>
          </div>
          <ProgressBar value={getXpProgressWithinLevel(g.experience_points)} max={100} tone="sage" />
        </div>
      ))}
    </div>
  );
}