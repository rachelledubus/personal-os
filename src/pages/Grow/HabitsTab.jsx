import React, { useEffect, useState } from 'react';
import { Flame, Bell, Clock, Lightbulb } from 'lucide-react';
import Card from '../../components/ui/Card.jsx';
import Button from '../../components/ui/Button.jsx';
import Checkbox from '../../components/ui/Checkbox.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import {
  loadHabitsData, addHabit, toggleHabitLog, archiveHabit,
  listHabitSystems, addHabitSystem, archiveHabitSystem, moveHabitToSystem, generateStarterSystems,
} from '../../services/habits.js';
import { getHabitPatternInsights } from '../../services/habitInsights.js';
import { suggestInterval, setHabitReminderInterval, setHabitReminderTimes, clearHabitReminder } from '../../services/habitReminders.js';

export default function HabitsTab() {
  const [habits, setHabits] = useState([]);
  const [systems, setSystems] = useState([]);
  const [doneIds, setDoneIds] = useState(new Set());
  const [streaks, setStreaks] = useState({});
  const [insights, setInsights] = useState([]);
  const [newHabitName, setNewHabitName] = useState('');
  const [newHabitSystem, setNewHabitSystem] = useState('');
  const [newSystemName, setNewSystemName] = useState('');
  const [addingSystem, setAddingSystem] = useState(false);
  const [addError, setAddError] = useState(null);

  useEffect(() => { load(); getHabitPatternInsights().then(setInsights); }, []);

  async function load() {
    const [{ habits: h, doneIds: d, streaks: s }, sys] = await Promise.all([loadHabitsData(), listHabitSystems()]);
    setHabits(h);
    setDoneIds(d);
    setStreaks(s);
    setSystems(sys);
  }

  async function handleAddHabit() {
    const name = newHabitName.trim();
    if (!name) return;
    setAddError(null);
    try {
      await addHabit(name, newHabitSystem || null);
    } catch (err) {
      setAddError(err.message || String(err));
      return;
    }
    setNewHabitName('');
    load();
  }

  async function handleAddSystem() {
    const name = newSystemName.trim();
    if (!name) return;
    setAddError(null);
    try {
      await addHabitSystem(name);
    } catch (err) {
      setAddError(err.message || String(err));
      return;
    }
    setNewSystemName('');
    setAddingSystem(false);
    load();
  }

  async function handleGenerateStarters() {
    const confirmed = window.confirm(
      "This creates 3 starter systems (7 habits total): Medication & Health Basics, Business Momentum, and Evening Wind-Down — grounded in what's actually come up in this project, not generic suggestions. You can archive anything you don't want afterward. Create them?"
    );
    if (!confirmed) return;
    setAddError(null);
    try {
      const result = await generateStarterSystems();
      if (result.systemsCreated === 0) {
        setAddError('All three starter systems already exist \u2014 nothing new to add.');
      }
    } catch (err) {
      setAddError(err.message || String(err));
      return;
    }
    load();
  }

  async function handleArchiveSystem(system) {
    const confirmed = window.confirm(`Remove "${system.name}"? Its habits stay — they'll just move back to Ungrouped instead of being deleted.`);
    if (!confirmed) return;
    await archiveHabitSystem(system.id);
    load();
  }

  const grouped = systems.map(sys => ({ system: sys, habits: habits.filter(h => h.system_id === sys.id) }));
  const ungrouped = habits.filter(h => !h.system_id);

  const sharedProps = { doneIds, streaks, load };

  return (
    <Card>
      <div className="section-label">Systems</div>
      {habits.length === 0 && systems.length === 0 ? (
        <EmptyState icon="sparkles" title="No systems yet" />
      ) : (
        <div className="stack" style={{ gap: 'var(--space-4)', marginTop: 'var(--space-2)' }}>
          {grouped.map(({ system, habits: groupHabits }) => (
            <div key={system.id}>
              <div className="row-between">
                <div style={{ fontWeight: 700, fontSize: 'var(--text-small)' }}>{system.name}</div>
                <button className="row-remove-btn" aria-label="Remove system" onClick={() => handleArchiveSystem(system)}>×</button>
              </div>
              {system.description && <div className="muted" style={{ fontSize: 'var(--text-micro)', marginBottom: 4 }}>{system.description}</div>}
              <div className="stack" style={{ marginTop: 'var(--space-2)', paddingLeft: 'var(--space-3)', borderLeft: '2px solid var(--sand)' }}>
                {groupHabits.length === 0 ? (
                  <div className="muted" style={{ fontSize: 'var(--text-micro)' }}>No habits in this system yet.</div>
                ) : groupHabits.map(h => <HabitRow key={h.id} habit={h} systems={systems} {...sharedProps} />)}
              </div>
            </div>
          ))}

          {ungrouped.length > 0 && (
            <div>
              {systems.length > 0 && <div className="muted" style={{ fontSize: 'var(--text-micro)', textTransform: 'uppercase', marginBottom: 4 }}>Ungrouped</div>}
              <div className="stack">
                {ungrouped.map(h => <HabitRow key={h.id} habit={h} systems={systems} {...sharedProps} />)}
              </div>
            </div>
          )}
        </div>
      )}

      {insights.length > 0 && (
        <div className="stack" style={{ marginTop: 'var(--space-4)', paddingTop: 'var(--space-3)', borderTop: '1px solid var(--border-default)' }}>
          <div className="section-label">Patterns</div>
          <div className="stack" style={{ marginTop: 'var(--space-2)' }}>
            {insights.map((line, i) => <div key={i} style={{ fontSize: 'var(--text-small)', display: 'flex', alignItems: 'flex-start', gap: 6 }}><Lightbulb size={14} style={{ flexShrink: 0, marginTop: 2 }} />{line}</div>)}
          </div>
        </div>
      )}

      <div className="stack" style={{ marginTop: 'var(--space-4)', paddingTop: 'var(--space-3)', borderTop: '1px solid var(--border-default)', gap: 'var(--space-2)' }}>
        <div className="row" style={{ flexWrap: 'wrap' }}>
          <input placeholder="New habit..." value={newHabitName} onChange={e => setNewHabitName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleAddHabit(); }} />
          <select value={newHabitSystem} onChange={e => setNewHabitSystem(e.target.value)}>
            <option value="">No system</option>
            {systems.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <Button size="sm" onClick={handleAddHabit}>+ Add habit</Button>
        </div>
        {addingSystem ? (
          <div className="row" style={{ flexWrap: 'wrap' }}>
            <input placeholder="New system name (e.g. Health Identity System)..." value={newSystemName} onChange={e => setNewSystemName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleAddSystem(); }} />
            <Button size="sm" variant="ghost" onClick={handleAddSystem}>Create system</Button>
            <Button size="sm" variant="text" onClick={() => setAddingSystem(false)}>Cancel</Button>
          </div>
        ) : (
          <Button size="sm" variant="text" onClick={() => setAddingSystem(true)}>+ New system</Button>
        )}
        <Button size="sm" variant="ghost" onClick={handleGenerateStarters}>Generate starter systems for me</Button>
      </div>
      {addError && <div className="muted" style={{ fontSize: 'var(--text-micro)', marginTop: 4, color: 'var(--danger)' }}>Couldn't add: {addError}</div>}
    </Card>
  );
}

function HabitRow({ habit: h, systems, doneIds, streaks, load }) {
  const [reminderBusy, setReminderBusy] = useState(false);
  const [reminderNote, setReminderNote] = useState(null);
  const [pickingTimes, setPickingTimes] = useState(false);
  const [draftTimes, setDraftTimes] = useState([]);
  const [newTimeInput, setNewTimeInput] = useState('');

  async function toggle(checked) {
    await toggleHabitLog(h.id, checked);
    load();
  }

  async function handleArchive() {
    const confirmed = window.confirm(`Remove "${h.name}"? Your streak history stays on record, it just won't show here anymore.`);
    if (!confirmed) return;
    await archiveHabit(h.id);
    load();
  }

  async function handleMoveSystem(systemId) {
    await moveHabitToSystem(h.id, systemId || null);
    load();
  }

  async function handleUseInterval() {
    setReminderBusy(true);
    const suggestion = await suggestInterval(h.name);
    setReminderBusy(false);
    if (!suggestion) {
      setReminderNote('AI suggestion unavailable right now — try again shortly.');
      return;
    }
    await setHabitReminderInterval(h.id, suggestion.interval_minutes);
    setReminderNote(`Reminding every ~${Math.round(suggestion.interval_minutes / 60 * 10) / 10}hr. ${suggestion.reasoning || ''}`);
    load();
  }

  function openTimesPicker() {
    setPickingTimes(true);
    setDraftTimes(h.reminder_mode === 'times' && h.reminder_times ? [...h.reminder_times] : []);
    setNewTimeInput('');
  }

  function addDraftTime() {
    if (!newTimeInput) return;
    if (!draftTimes.includes(newTimeInput)) setDraftTimes([...draftTimes, newTimeInput].sort());
    setNewTimeInput('');
  }

  function removeDraftTime(t) {
    setDraftTimes(draftTimes.filter(x => x !== t));
  }

  async function handleSaveTimes() {
    if (draftTimes.length === 0) return;
    await setHabitReminderTimes(h.id, draftTimes);
    setReminderNote(`Reminding at ${draftTimes.join(', ')}.`);
    setPickingTimes(false);
    load();
  }

  async function handleClearReminder() {
    await clearHabitReminder(h.id);
    setReminderNote(null);
    setPickingTimes(false);
    load();
  }

  return (
    <div>
      <div className="row-between">
        <Checkbox checked={doneIds.has(h.id)} onChange={v => toggle(v)} label={h.name} />
        <div className="row" style={{ gap: 'var(--space-2)', alignItems: 'center', flexWrap: 'wrap' }}>
          {streaks[h.id] > 1 && <span className="muted" style={{ fontSize: 'var(--text-caption)', display: 'inline-flex', alignItems: 'center', gap: 3 }}><Flame size={13} />{streaks[h.id]} day streak</span>}
          {systems.length > 0 && (
            <select value={h.system_id || ''} onChange={e => handleMoveSystem(e.target.value)} style={{ fontSize: 'var(--text-micro)' }}>
              <option value="">Ungrouped</option>
              {systems.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          )}
          {h.remind_periodically ? (
            <Button size="sm" variant="accent" onClick={handleClearReminder}><Bell size={13} style={{ verticalAlign: 'middle', marginRight: 4 }} />Reminding — turn off</Button>
          ) : (
            <>
              <Button size="sm" variant="text" onClick={handleUseInterval} disabled={reminderBusy}>
                {reminderBusy ? '☁️ asking Sora...' : <><Bell size={13} style={{ verticalAlign: 'middle', marginRight: 4 }} />AI interval</>}
              </Button>
              <Button size="sm" variant="text" onClick={openTimesPicker}><Clock size={13} style={{ verticalAlign: 'middle', marginRight: 4 }} />Specific times</Button>
            </>
          )}
          <button className="row-remove-btn" aria-label="Remove habit" onClick={handleArchive}>×</button>
        </div>
      </div>
      {reminderNote && <div className="muted" style={{ fontSize: 'var(--text-micro)', marginTop: 2, marginLeft: 2 }}>{reminderNote}</div>}
      {pickingTimes && (
        <div style={{ marginTop: 'var(--space-2)', marginLeft: 2, padding: 'var(--space-2)', background: 'var(--cream)', borderRadius: 'var(--radius-sm)' }}>
          <div className="row" style={{ gap: 'var(--space-2)', flexWrap: 'wrap' }}>
            {draftTimes.map(t => (
              <span key={t} className="muted" style={{ fontSize: 'var(--text-caption)', background: 'var(--white)', padding: '2px 8px', borderRadius: 'var(--radius-pill)' }}>
                {t} <button onClick={() => removeDraftTime(t)} style={{ background: 'none', border: 'none', cursor: 'pointer', marginLeft: 2 }}>×</button>
              </span>
            ))}
          </div>
          <div className="row" style={{ marginTop: 'var(--space-2)', gap: 'var(--space-2)' }}>
            <input type="time" value={newTimeInput} onChange={e => setNewTimeInput(e.target.value)} />
            <Button size="sm" variant="ghost" onClick={addDraftTime}>+ Add time</Button>
            <Button size="sm" onClick={handleSaveTimes} disabled={draftTimes.length === 0}>Save</Button>
            <Button size="sm" variant="text" onClick={() => setPickingTimes(false)}>Cancel</Button>
          </div>
        </div>
      )}
    </div>
  );
}
