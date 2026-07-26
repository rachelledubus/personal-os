import React, { useEffect, useState } from 'react';
import { Flame, Bell, Clock, Lightbulb } from 'lucide-react';
import Card from '../../components/ui/Card.jsx';
import Button from '../../components/ui/Button.jsx';
import Checkbox from '../../components/ui/Checkbox.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import { loadHabitsData, addHabit, toggleHabitLog, archiveHabit } from '../../services/habits.js';
import { getHabitPatternInsights } from '../../services/habitInsights.js';
import { suggestInterval, setHabitReminderInterval, setHabitReminderTimes, clearHabitReminder } from '../../services/habitReminders.js';

export default function HabitsTab() {
  const [habits, setHabits] = useState([]);
  const [doneIds, setDoneIds] = useState(new Set());
  const [streaks, setStreaks] = useState({});
  const [insights, setInsights] = useState([]);
  const [reminderBusyId, setReminderBusyId] = useState(null);
  const [reminderNote, setReminderNote] = useState({});
  const [pickingTimesFor, setPickingTimesFor] = useState(null);
  const [draftTimes, setDraftTimes] = useState([]);
  const [newTimeInput, setNewTimeInput] = useState('');
  const [newSystemName, setNewSystemName] = useState('');
  const [addError, setAddError] = useState(null);

  useEffect(() => { load(); getHabitPatternInsights().then(setInsights); }, []);

  async function load() {
    const { habits: h, doneIds: d, streaks: s } = await loadHabitsData();
    setHabits(h);
    setDoneIds(d);
    setStreaks(s);
  }

  async function handleAddSystem() {
    const name = newSystemName.trim();
    if (!name) return;
    setAddError(null);
    try {
      await addHabit(name);
    } catch (err) {
      setAddError(err.message || String(err));
      return;
    }
    setNewSystemName('');
    load();
  }

  async function toggle(habitId, checked) {
    await toggleHabitLog(habitId, checked);
    load();
  }

  async function handleArchive(habit) {
    const confirmed = window.confirm(`Remove "${habit.name}"? Your streak history stays on record, it just won't show here anymore.`);
    if (!confirmed) return;
    await archiveHabit(habit.id);
    load();
  }

  async function handleUseInterval(habit) {
    setReminderBusyId(habit.id);
    const suggestion = await suggestInterval(habit.name);
    setReminderBusyId(null);
    if (!suggestion) {
      setReminderNote(prev => ({ ...prev, [habit.id]: 'AI suggestion unavailable right now — try again shortly.' }));
      return;
    }
    await setHabitReminderInterval(habit.id, suggestion.interval_minutes);
    setReminderNote(prev => ({ ...prev, [habit.id]: `Reminding every ~${Math.round(suggestion.interval_minutes / 60 * 10) / 10}hr. ${suggestion.reasoning || ''}` }));
    load();
  }

  function openTimesPicker(habit) {
    setPickingTimesFor(habit.id);
    setDraftTimes(habit.reminder_mode === 'times' && habit.reminder_times ? [...habit.reminder_times] : []);
    setNewTimeInput('');
  }

  function addDraftTime() {
    if (!newTimeInput) return;
    if (!draftTimes.includes(newTimeInput)) {
      setDraftTimes([...draftTimes, newTimeInput].sort());
    }
    setNewTimeInput('');
  }

  function removeDraftTime(t) {
    setDraftTimes(draftTimes.filter(x => x !== t));
  }

  async function handleSaveTimes(habit) {
    if (draftTimes.length === 0) return;
    await setHabitReminderTimes(habit.id, draftTimes);
    setReminderNote(prev => ({ ...prev, [habit.id]: `Reminding at ${draftTimes.join(', ')}.` }));
    setPickingTimesFor(null);
    load();
  }

  async function handleClearReminder(habit) {
    await clearHabitReminder(habit.id);
    setReminderNote(prev => ({ ...prev, [habit.id]: null }));
    setPickingTimesFor(null);
    load();
  }

  return (
    <Card>
      <div className="section-label">Daily systems</div>
      {habits.length === 0 ? <EmptyState icon="sparkles" title="No systems yet" /> : (
        <div className="stack">
          {habits.map(h => (
            <div key={h.id}>
              <div className="row-between">
                <Checkbox checked={doneIds.has(h.id)} onChange={v => toggle(h.id, v)} label={h.name} />
                <div className="row" style={{ gap: 'var(--space-2)', alignItems: 'center', flexWrap: 'wrap' }}>
                  {streaks[h.id] > 1 && <span className="muted" style={{ fontSize: 'var(--text-caption)', display: 'inline-flex', alignItems: 'center', gap: 3 }}><Flame size={13} />{streaks[h.id]} day streak</span>}
                  {h.remind_periodically ? (
                    <Button size="sm" variant="accent" onClick={() => handleClearReminder(h)}><Bell size={13} style={{ verticalAlign: 'middle', marginRight: 4 }} />Reminding — turn off</Button>
                  ) : (
                    <>
                      <Button size="sm" variant="text" onClick={() => handleUseInterval(h)} disabled={reminderBusyId === h.id}>
                        {reminderBusyId === h.id ? '☁️ asking Sora...' : <><Bell size={13} style={{ verticalAlign: 'middle', marginRight: 4 }} />AI interval</>}
                      </Button>
                      <Button size="sm" variant="text" onClick={() => openTimesPicker(h)}><Clock size={13} style={{ verticalAlign: 'middle', marginRight: 4 }} />Specific times</Button>
                    </>
                  )}
                  <button className="row-remove-btn" aria-label="Remove system" onClick={() => handleArchive(h)}>×</button>
                </div>
              </div>
              {reminderNote[h.id] && (
                <div className="muted" style={{ fontSize: 'var(--text-micro)', marginTop: 2, marginLeft: 2 }}>{reminderNote[h.id]}</div>
              )}
              {pickingTimesFor === h.id && (
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
                    <Button size="sm" onClick={() => handleSaveTimes(h)} disabled={draftTimes.length === 0}>Save</Button>
                    <Button size="sm" variant="text" onClick={() => setPickingTimesFor(null)}>Cancel</Button>
                  </div>
                </div>
              )}
            </div>
          ))}
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

      <div className="row" style={{ marginTop: 'var(--space-4)', paddingTop: 'var(--space-3)', borderTop: '1px solid var(--border-default)' }}>
        <input
          placeholder="New system (e.g. Health Identity System)..."
          value={newSystemName}
          onChange={e => setNewSystemName(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleAddSystem(); }}
        />
        <Button size="sm" onClick={handleAddSystem}>+ Add system</Button>
      </div>
      {addError && <div className="muted" style={{ fontSize: 'var(--text-micro)', marginTop: 4, color: 'var(--danger)' }}>Couldn't add: {addError}</div>}
    </Card>
  );
}
