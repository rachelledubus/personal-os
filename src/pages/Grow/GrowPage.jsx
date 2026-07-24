import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Card from '../../components/ui/Card.jsx';
import Button from '../../components/ui/Button.jsx';
import Checkbox from '../../components/ui/Checkbox.jsx';
import ProgressBar from '../../components/ui/ProgressBar.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import { supabase } from '../../lib/supabaseClient.js';
import { todayStr } from '../../utils/date.js';
import {
  listMaintenanceItems, addMaintenanceItem, completeMaintenanceItem, getPatternSuggestions,
} from '../../services/maintenance.js';
import {
  seedDefaultWorkoutTemplatesIfEmpty, listTemplateForDay, addTemplateExercise, getLastExerciseEntry,
  logWorkoutSession, generateInsights, requestExerciseSwap,
  saveWorkoutDraft, loadWorkoutDraft, clearWorkoutDraft,
} from '../../services/workoutAnalytics.js';
import { listChores, listCurrentCompletions, toggleChore, addChore, seedStarterChoresIfEmpty, getLastCompletedDates } from '../../services/chores.js';
import {
  addEntry, deleteEntry, listThisMonthEntries, listLegacyBills, getMonthSummary,
  listBudgets, listSavingsGoals, addToSavingsGoal, addSavingsGoal,
} from '../../services/finance.js';
import { getCategoryList } from '../../services/settings.js';
import {
  getEnvelopeSummary, setStartingAmount, addEnvelope, updateEnvelope, deleteEnvelope,
} from '../../services/envelopeBudget.js';
import { logActivity } from '../../services/goals.js';
import { getHabitPatternInsights } from '../../services/habitInsights.js';
import { suggestInterval, setHabitReminderInterval, setHabitReminderTimes, clearHabitReminder } from '../../services/habitReminders.js';
import Banner from '../../components/ui/Banner.jsx';
import MealPlannerPage from '../Plan/MealPlannerPage.jsx';

const TABS = ['habits', 'workouts', 'chores', 'maintenance', 'finance', 'nutrition'];
// "Habits" -> "Systems": per backlog #8, track the system not the single habit
// (e.g. "Health Identity System" rather than "Exercise"). Copy-only change —
// the route key and habits table stay as-is so nothing downstream breaks.
const TAB_LABELS = { habits: 'Systems', nutrition: 'Nutrition' };

const LIFTING_DAYS = [
  { key: 'A', label: 'Upper Body', weekday: 'Tue' },
  { key: 'B', label: 'Lower / Quad', weekday: 'Thu' },
  { key: 'C', label: 'Posterior Chain', weekday: 'Sat' },
];
const TODAY_DAY_KEY = { 2: 'A', 4: 'B', 6: 'C' }[new Date().getDay()] || 'B';

export default function GrowPage() {
  const { tab = 'habits' } = useParams();
  const navigate = useNavigate();

  return (
    <div>
      <Banner slotKey="grow_banner" scene="grow" />
      <div className="page-title">🌱 Grow</div>
      <div className="row" style={{ marginBottom: 'var(--space-4)', flexWrap: 'wrap' }}>
        {TABS.map(t => (
          <button key={t} className={`sub-tab ${tab === t ? 'active' : ''}`} onClick={() => navigate(`/grow/${t}`)}>
            {TAB_LABELS[t] || (t.charAt(0).toUpperCase() + t.slice(1))}
          </button>
        ))}
      </div>
      {tab === 'habits' && <HabitsTab />}
      {tab === 'workouts' && <WorkoutsTab />}
      {tab === 'chores' && <ChoresTab />}
      {tab === 'maintenance' && <MaintenanceTab />}
      {tab === 'finance' && <FinanceTab />}
      {tab === 'nutrition' && <MealPlannerPage embedded />}
    </div>
  );
}

function HabitsTab() {
  const [habits, setHabits] = useState([]);
  const [doneIds, setDoneIds] = useState(new Set());
  const [streaks, setStreaks] = useState({});
  const [insights, setInsights] = useState([]);
  const [reminderBusyId, setReminderBusyId] = useState(null);
  const [reminderNote, setReminderNote] = useState({});
  const [pickingTimesFor, setPickingTimesFor] = useState(null);
  const [draftTimes, setDraftTimes] = useState([]);
  const [newTimeInput, setNewTimeInput] = useState('');

  useEffect(() => { load(); getHabitPatternInsights().then(setInsights); }, []);

  async function load() {
    const { data: { user } } = await supabase.auth.getUser();
    const { data: h } = await supabase.from('habits').select('*').eq('user_id', user.id).eq('archived', false);
    const { data: logs } = await supabase.from('habit_logs').select('*').eq('user_id', user.id).eq('log_date', todayStr());
    setHabits(h || []);
    setDoneIds(new Set((logs || []).filter(l => l.completed).map(l => l.habit_id)));

    const { data: allLogs } = await supabase.from('habit_logs').select('habit_id, log_date, completed')
      .eq('user_id', user.id).eq('completed', true).order('log_date', { ascending: false }).limit(400);
    const byHabit = {};
    (allLogs || []).forEach(l => (byHabit[l.habit_id] ||= new Set()).add(l.log_date));
    const streakMap = {};
    (h || []).forEach(habit => {
      let count = 0;
      let d = new Date();
      while (byHabit[habit.id]?.has(d.toISOString().slice(0, 10))) {
        count += 1;
        d.setDate(d.getDate() - 1);
      }
      streakMap[habit.id] = count;
    });
    setStreaks(streakMap);
  }

  async function toggle(habitId, checked) {
    const { data: { user } } = await supabase.auth.getUser();
    if (checked) {
      await supabase.from('habit_logs').upsert(
        { user_id: user.id, habit_id: habitId, log_date: todayStr(), completed: true },
        { onConflict: 'habit_id,log_date' }
      );
      await logActivity('habits', habitId, 'completed');
    } else {
      await supabase.from('habit_logs').delete().eq('habit_id', habitId).eq('log_date', todayStr());
    }
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
                  {streaks[h.id] > 1 && <span className="muted" style={{ fontSize: 12 }}>🔥 {streaks[h.id]} day streak</span>}
                  {h.remind_periodically ? (
                    <Button size="sm" variant="accent" onClick={() => handleClearReminder(h)}>🔔 Reminding — turn off</Button>
                  ) : (
                    <>
                      <Button size="sm" variant="text" onClick={() => handleUseInterval(h)} disabled={reminderBusyId === h.id}>
                        {reminderBusyId === h.id ? '☁️ asking Sora...' : '🔔 AI interval'}
                      </Button>
                      <Button size="sm" variant="text" onClick={() => openTimesPicker(h)}>🕐 Specific times</Button>
                    </>
                  )}
                </div>
              </div>
              {reminderNote[h.id] && (
                <div className="muted" style={{ fontSize: 11, marginTop: 2, marginLeft: 2 }}>{reminderNote[h.id]}</div>
              )}
              {pickingTimesFor === h.id && (
                <div style={{ marginTop: 'var(--space-2)', marginLeft: 2, padding: 'var(--space-2)', background: 'var(--cream)', borderRadius: 'var(--radius-sm)' }}>
                  <div className="row" style={{ gap: 'var(--space-2)', flexWrap: 'wrap' }}>
                    {draftTimes.map(t => (
                      <span key={t} className="muted" style={{ fontSize: 12, background: 'var(--white)', padding: '2px 8px', borderRadius: 'var(--radius-pill)' }}>
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
        <div className="stack" style={{ marginTop: 'var(--space-4)', paddingTop: 'var(--space-3)', borderTop: '1px solid var(--border-soft, #e2ded4)' }}>
          <div className="section-label">Patterns</div>
          <div className="stack" style={{ marginTop: 'var(--space-2)' }}>
            {insights.map((line, i) => <div key={i} style={{ fontSize: 13 }}>💡 {line}</div>)}
          </div>
        </div>
      )}
    </Card>
  );
}



function WorkoutsTab() {
  const [activeDay, setActiveDay] = useState(TODAY_DAY_KEY);
  const [template, setTemplate] = useState(null);
  const [lastEntries, setLastEntries] = useState({});
  const [entries, setEntries] = useState({});
  const [swaps, setSwaps] = useState({});
  const [swapProposal, setSwapProposal] = useState(null);
  const [swapping, setSwapping] = useState(null);
  const [insights, setInsights] = useState([]);
  const [addingExercise, setAddingExercise] = useState(false);
  const [newExercise, setNewExercise] = useState({ exercise_name: '', target_sets: 3, target_reps: '' });
  const [saved, setSaved] = useState(false);
  const [restoredDraft, setRestoredDraft] = useState(false);
  const draftSaveTimer = useRef(null);

  useEffect(() => { seedDefaultWorkoutTemplatesIfEmpty().then(loadDay); generateInsights().then(setInsights); }, []);
  useEffect(() => { loadDay(); }, [activeDay]);

  async function loadDay() {
    const tmpl = await listTemplateForDay(activeDay);
    setTemplate(tmpl);
    setSwaps({});
    const initialEntries = {};
    const last = {};
    for (const ex of tmpl) {
      const targetSets = ex.target_sets || 3;
      initialEntries[ex.exercise_name] = Array.from({ length: targetSets }, () => ({ weight: '', reps: '' }));
      last[ex.exercise_name] = await getLastExerciseEntry(ex.exercise_name);
    }

    const draft = await loadWorkoutDraft(activeDay);
    if (draft) {
      setEntries(draft);
      setRestoredDraft(true);
    } else {
      setEntries(initialEntries);
      setRestoredDraft(false);
    }
    setLastEntries(last);
  }

  function updateSet(displayName, setIndex, field, value) {
    setEntries(prev => {
      const next = {
        ...prev,
        [displayName]: prev[displayName].map((s, i) => (i === setIndex ? { ...s, [field]: value } : s)),
      };
      // Debounced, not literally every keystroke — saves a real database
      // write, not a browser-local one, so it's the same across devices.
      // 800ms after typing stops, not on every character.
      clearTimeout(draftSaveTimer.current);
      draftSaveTimer.current = setTimeout(() => saveWorkoutDraft(activeDay, next), 800);
      return next;
    });
    setRestoredDraft(false); // once you're actively editing, the "restored" banner has served its purpose
  }

  async function handleRequestSwap(ex) {
    setSwapping(ex.exercise_name);
    const dayMeta = LIFTING_DAYS.find(d => d.key === activeDay);
    const others = template.filter(t => t.exercise_name !== ex.exercise_name).map(t => t.exercise_name);
    const result = await requestExerciseSwap(ex.exercise_name, ex.target_reps, dayMeta?.label, others);
    setSwapping(null);
    if (result) setSwapProposal({ originalName: ex.exercise_name, ...result });
  }

  function acceptSwap() {
    const { originalName, substitute_name } = swapProposal;
    setSwaps(prev => ({ ...prev, [originalName]: substitute_name }));
    setEntries(prev => {
      const next = { ...prev };
      next[substitute_name] = next[originalName] || [{ weight: '', reps: '' }];
      delete next[originalName];
      return next;
    });
    setSwapProposal(null);
  }

  async function handleAddExercise() {
    if (!newExercise.exercise_name.trim()) return;
    await addTemplateExercise(activeDay, {
      exercise_name: newExercise.exercise_name.trim(),
      target_sets: Number(newExercise.target_sets) || 3,
      target_reps: newExercise.target_reps || null,
    });
    setNewExercise({ exercise_name: '', target_sets: 3, target_reps: '' });
    setAddingExercise(false);
    loadDay();
  }

  async function handleSaveSession() {
    const exercises = Object.entries(entries).map(([exercise_name, sets]) => ({
      exercise_name,
      sets_detail: sets
        .map((s, i) => ({ set: i + 1, weight: s.weight ? Number(s.weight) : null, reps: s.reps ? Number(s.reps) : null }))
        .filter(s => s.weight || s.reps),
    }));
    await logWorkoutSession({ workout_date: todayStr(), day_key: activeDay, exercises });
    clearWorkoutDraft(activeDay); // now safely in the database — the draft's job is done
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
    loadDay();
  }

  const dayMeta = LIFTING_DAYS.find(d => d.key === activeDay);

  return (
    <div className="stack" style={{ gap: 'var(--space-4)' }}>
      {insights.length > 0 && (
        <Card>
          <div className="section-label">Insights</div>
          <div className="stack" style={{ marginTop: 'var(--space-2)' }}>
            {insights.map((line, i) => <div key={i} style={{ fontSize: 13 }}>💡 {line}</div>)}
          </div>
        </Card>
      )}

      {restoredDraft && (
        <div className="muted" style={{ fontSize: 12, background: 'var(--cream)', padding: '8px 12px', borderRadius: 'var(--radius-sm)' }}>
          ✓ Restored your unsaved numbers from earlier — nothing was lost.
        </div>
      )}

      <div className="row" style={{ gap: 'var(--space-2)' }}>
        {LIFTING_DAYS.map(d => (
          <button key={d.key} className={`sub-tab ${activeDay === d.key ? 'active' : ''}`} onClick={() => setActiveDay(d.key)}>
            {d.weekday} — {d.label}
          </button>
        ))}
      </div>

      {template && template.length === 0 && (
        <EmptyState icon="dumbbell" title={`No exercises set up for ${dayMeta?.label} yet`} subtitle="Add your first one below." />
      )}

      {template && template.map(ex => {
        const displayName = swaps[ex.exercise_name] || ex.exercise_name;
        const last = lastEntries[ex.exercise_name];
        const proposalHere = swapProposal?.originalName === ex.exercise_name;

        return (
          <Card key={ex.id}>
            <div className="row-between">
              <div style={{ fontWeight: 700 }}>
                {displayName}
                {swaps[ex.exercise_name] && <span className="muted" style={{ fontSize: 11 }}> (swapped from {ex.exercise_name}, today only)</span>}
              </div>
              <div className="muted" style={{ fontSize: 12 }}>{ex.target_reps} reps · {ex.target_sets} sets</div>
            </div>
            <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>
              {last ? `Last: ${(last.sets_detail || []).map(s => `${s.weight}×${s.reps}`).join(', ') || `${last.weight}×${last.reps}`} on ${last.workouts?.workout_date}` : 'No sessions logged yet'}
            </div>

            <div className="row" style={{ marginTop: 'var(--space-3)', flexWrap: 'wrap', gap: 'var(--space-4)' }}>
              {(entries[displayName] || []).map((s, i) => (
                <div key={i}>
                  <div className="muted" style={{ fontSize: 11 }}>SET {i + 1} · LB</div>
                  <input type="number" value={s.weight} onChange={e => updateSet(displayName, i, 'weight', e.target.value)} style={{ width: 64 }} />
                  <div className="muted" style={{ fontSize: 11, marginTop: 4 }}>REPS</div>
                  <input type="number" value={s.reps} onChange={e => updateSet(displayName, i, 'reps', e.target.value)} style={{ width: 64 }} />
                </div>
              ))}
            </div>

            {!swaps[ex.exercise_name] && !proposalHere && (
              <Button size="sm" variant="text" onClick={() => handleRequestSwap(ex)} disabled={swapping === ex.exercise_name} style={{ marginTop: 'var(--space-2)' }}>
                {swapping === ex.exercise_name ? 'Finding a swap…' : "🔄 Not feeling this one? Swap it"}
              </Button>
            )}
            {proposalHere && (
              <div className="inbox-suggestion" style={{ marginTop: 'var(--space-2)' }}>
                <span>
                  Try <strong>{swapProposal.substitute_name}</strong> ({swapProposal.target_reps}) instead — {swapProposal.reasoning}
                </span>
                <div className="row" style={{ marginTop: 'var(--space-2)', gap: 'var(--space-2)' }}>
                  <Button size="sm" onClick={acceptSwap}>Swap it</Button>
                  <Button size="sm" variant="text" onClick={() => setSwapProposal(null)}>Never mind</Button>
                </div>
              </div>
            )}
          </Card>
        );
      })}

      <Card>
        {addingExercise ? (
          <div className="row" style={{ flexWrap: 'wrap' }}>
            <input placeholder="Exercise name" value={newExercise.exercise_name} onChange={e => setNewExercise({ ...newExercise, exercise_name: e.target.value })} />
            <input type="number" placeholder="Target sets" value={newExercise.target_sets} onChange={e => setNewExercise({ ...newExercise, target_sets: e.target.value })} style={{ width: 100 }} />
            <input placeholder="Target reps (e.g. 8-10)" value={newExercise.target_reps} onChange={e => setNewExercise({ ...newExercise, target_reps: e.target.value })} style={{ width: 140 }} />
            <Button size="sm" onClick={handleAddExercise}>Add to {dayMeta?.label}</Button>
            <Button size="sm" variant="text" onClick={() => setAddingExercise(false)}>Cancel</Button>
          </div>
        ) : (
          <Button size="sm" variant="ghost" onClick={() => setAddingExercise(true)}>+ Add exercise to {dayMeta?.label}</Button>
        )}
      </Card>

      {template && template.length > 0 && (
        <Button onClick={handleSaveSession}>{saved ? 'Nice work! Saved ✓ 🎉' : `Save ${dayMeta?.label} session`}</Button>
      )}
    </div>
  );
}

function ChoresTab() {
  const [items, setItems] = useState([]);
  const [doneIds, setDoneIds] = useState(new Set());
  const [lastCompleted, setLastCompleted] = useState({});
  const [newChore, setNewChore] = useState({ 'chores-daily': '', 'chores-weekly': '', 'chores-monthly': '' });

  async function refresh() {
    setItems(await listChores());
    setDoneIds(await listCurrentCompletions());
    setLastCompleted(await getLastCompletedDates());
  }
  useEffect(() => { seedStarterChoresIfEmpty().then(refresh); }, []);

  async function handleToggle(item, checked) {
    setDoneIds(prev => {
      const next = new Set(prev);
      checked ? next.add(item.id) : next.delete(item.id);
      return next;
    });
    await toggleChore(item, checked);
  }

  async function handleAdd(listKey) {
    if (!newChore[listKey].trim()) return;
    await addChore(listKey, newChore[listKey].trim());
    setNewChore({ ...newChore, [listKey]: '' });
    refresh();
  }

  const LABELS = { 'chores-daily': 'Daily (resets tomorrow)', 'chores-weekly': 'Weekly (resets Monday)', 'chores-monthly': 'Monthly (resets 1st)' };

  // Most-overdue-first for weekly/monthly — a chore with no completion
  // on record sorts first (never done beats "done a while ago").
  function sortedItemsFor(key) {
    const list = items.filter(i => i.list_key === key);
    if (key === 'chores-daily') return list;
    return [...list].sort((a, b) => (lastCompleted[a.id] || '').localeCompare(lastCompleted[b.id] || ''));
  }

  return (
    <div className="stack">
      {Object.keys(LABELS).map(key => (
        <Card key={key}>
          <div className="section-label">{LABELS[key]}</div>
          <div className="stack" style={{ marginTop: 'var(--space-2)' }}>
            {sortedItemsFor(key).length === 0
              ? <EmptyState icon="leaf" title="Nothing here yet" />
              : sortedItemsFor(key).map(i => (
                <Checkbox key={i.id} checked={doneIds.has(i.id)} onChange={v => handleToggle(i, v)} label={i.name} />
              ))}
          </div>
          <div className="row" style={{ marginTop: 'var(--space-3)' }}>
            <input placeholder="Add a chore..." value={newChore[key]} onChange={e => setNewChore({ ...newChore, [key]: e.target.value })}
              onKeyDown={e => e.key === 'Enter' && handleAdd(key)} />
            <Button size="sm" variant="ghost" onClick={() => handleAdd(key)}>+ Add</Button>
          </div>
        </Card>
      ))}
    </div>
  );
}

function MaintenanceTab() {
  const [items, setItems] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [form, setForm] = useState({ title: '', area: 'home', interval_days: '', next_due_date: '' });

  async function refresh() {
    setItems(await listMaintenanceItems());
    setSuggestions(await getPatternSuggestions());
  }
  useEffect(() => { refresh(); }, []);

  async function handleAdd() {
    if (!form.title.trim()) return;
    await addMaintenanceItem({
      title: form.title.trim(),
      area: form.area,
      interval_days: form.interval_days ? Number(form.interval_days) : null,
      next_due_date: form.next_due_date || null,
    });
    setForm({ title: '', area: 'home', interval_days: '', next_due_date: '' });
    refresh();
  }

  const today = todayStr();

  return (
    <div className="stack" style={{ gap: 'var(--space-4)' }}>
      {suggestions.map((s, i) => (
        <Card key={i} className="track-personal">
          <div className="row-between">
            <div style={{ fontSize: 13 }}>{s.suggestion}</div>
            <Button size="sm" variant="ghost" onClick={() => {
              addMaintenanceItem({ title: s.title, area: 'other', interval_days: 7 }).then(refresh);
            }}>Add reminder</Button>
          </div>
        </Card>
      ))}

      <Card>
        <div className="section-label">Maintenance & reminders</div>
        {items.length === 0 ? <EmptyState icon="leaf" title="Nothing tracked yet" /> : (
          <div className="stack" style={{ marginTop: 'var(--space-3)' }}>
            {items.map(i => (
              <div key={i.id} className="row-between" style={{ padding: '8px 0', borderBottom: '1px solid var(--sand)' }}>
                <div>
                  <div style={{ fontWeight: 700 }}>{i.title}</div>
                  <div className="muted" style={{ fontSize: 12 }}>
                    {i.area} {i.next_due_date && `· due ${i.next_due_date}`}
                    {i.next_due_date && i.next_due_date <= today && ' · due now'}
                  </div>
                </div>
                <Button size="sm" variant="ghost" onClick={() => completeMaintenanceItem(i.id).then(refresh)}>Done</Button>
              </div>
            ))}
          </div>
        )}

        <div className="row" style={{ marginTop: 'var(--space-4)', flexWrap: 'wrap' }}>
          <input placeholder="Title" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
          <select value={form.area} onChange={e => setForm({ ...form, area: e.target.value })}>
            <option value="home">Home</option>
            <option value="personal">Personal</option>
            <option value="health">Health</option>
            <option value="pet">Pet</option>
            <option value="vehicle">Vehicle</option>
            <option value="finance">Finance</option>
            <option value="other">Other</option>
          </select>
          <input type="date" value={form.next_due_date} onChange={e => setForm({ ...form, next_due_date: e.target.value })} />
          <input type="number" placeholder="Repeat every N days" value={form.interval_days} onChange={e => setForm({ ...form, interval_days: e.target.value })} style={{ width: 160 }} />
          <Button size="sm" onClick={handleAdd}>+ Add</Button>
        </div>
      </Card>
    </div>
  );
}

function FinanceTab() {
  const [summary, setSummary] = useState(null);
  const [entries, setEntries] = useState([]);
  const [legacyBills, setLegacyBills] = useState([]);
  const [budgets, setBudgets] = useState([]);
  const [savingsGoals, setSavingsGoals] = useState([]);
  const [expenseCategories, setExpenseCategories] = useState(['Other']);
  const [incomeCategories, setIncomeCategories] = useState(['Other']);
  const [form, setForm] = useState({ entry_type: 'expense', category: 'Other', amount: '', notes: '', is_recurring: false });
  const [addingGoal, setAddingGoal] = useState(false);
  const [newGoal, setNewGoal] = useState({ title: '', target_value: '' });
  const [depositAmounts, setDepositAmounts] = useState({});

  const [envelopeSummary, setEnvelopeSummary] = useState(null);
  const [editingStarting, setEditingStarting] = useState(false);
  const [startingInput, setStartingInput] = useState('');
  const [newEnvelope, setNewEnvelope] = useState({ name: '', assigned_amount: '' });
  const [editingEnvelopeId, setEditingEnvelopeId] = useState(null);
  const [editEnvelope, setEditEnvelope] = useState({ name: '', assigned_amount: '' });

  async function refresh() {
    setSummary(await getMonthSummary());
    setEntries(await listThisMonthEntries());
    setLegacyBills(await listLegacyBills());
    setBudgets(await listBudgets());
    setSavingsGoals(await listSavingsGoals());
    setExpenseCategories(await getCategoryList('finance_expense_categories'));
    setIncomeCategories(await getCategoryList('finance_income_categories'));
    setEnvelopeSummary(await getEnvelopeSummary());
  }
  useEffect(() => { refresh(); }, []);

  async function handleSaveStarting() {
    if (startingInput === '') return;
    await setStartingAmount(Number(startingInput));
    setEditingStarting(false);
    setStartingInput('');
    refresh();
  }

  async function handleAddEnvelope() {
    if (!newEnvelope.name.trim()) return;
    await addEnvelope(newEnvelope.name.trim(), Number(newEnvelope.assigned_amount) || 0);
    setNewEnvelope({ name: '', assigned_amount: '' });
    refresh();
  }

  function startEditEnvelope(env) {
    setEditingEnvelopeId(env.id);
    setEditEnvelope({ name: env.name, assigned_amount: String(env.assigned_amount) });
  }

  async function handleSaveEnvelope(id) {
    if (!editEnvelope.name.trim()) return;
    await updateEnvelope(id, { name: editEnvelope.name.trim(), assigned_amount: Number(editEnvelope.assigned_amount) || 0 });
    setEditingEnvelopeId(null);
    refresh();
  }

  async function handleDeleteEnvelope(id) {
    await deleteEnvelope(id);
    refresh();
  }

  const categories = form.entry_type === 'income' ? incomeCategories : expenseCategories;

  async function handleQuickAdd() {
    if (!form.amount) return;
    await addEntry({
      entry_type: form.entry_type,
      category: form.category,
      amount: Number(form.amount),
      notes: form.notes || null,
      is_recurring: form.entry_type === 'bill' ? form.is_recurring : false,
    });
    setForm({ entry_type: form.entry_type, category: form.category, amount: '', notes: '', is_recurring: false });
    refresh();
  }

  async function handleAddGoal() {
    if (!newGoal.title.trim() || !newGoal.target_value) return;
    await addSavingsGoal({ title: newGoal.title.trim(), target_value: Number(newGoal.target_value) });
    setNewGoal({ title: '', target_value: '' });
    setAddingGoal(false);
    refresh();
  }

  async function handleDeposit(goalId) {
    const amount = Number(depositAmounts[goalId]);
    if (!amount) return;
    await addToSavingsGoal(goalId, amount);
    setDepositAmounts({ ...depositAmounts, [goalId]: '' });
    refresh();
  }

  if (!summary || !envelopeSummary) return null;

  return (
    <div className="stack" style={{ gap: 'var(--space-4)' }}>
      <Card>
        <div className="row-between">
          <div className="section-label">Budget — every dollar a home</div>
          {!editingStarting && (
            <Button size="sm" variant="text" onClick={() => { setEditingStarting(true); setStartingInput(String(envelopeSummary.starting)); }}>
              Edit starting amount
            </Button>
          )}
        </div>

        {editingStarting ? (
          <div className="row" style={{ marginTop: 'var(--space-2)', gap: 'var(--space-2)' }}>
            <input type="number" placeholder="Starting amount" value={startingInput}
              onChange={e => setStartingInput(e.target.value)} style={{ width: 120 }} />
            <Button size="sm" onClick={handleSaveStarting}>Save</Button>
            <Button size="sm" variant="text" onClick={() => setEditingStarting(false)}>Cancel</Button>
          </div>
        ) : (
          <div className="macro-grid" style={{ marginTop: 'var(--space-3)' }}>
            <div className="macro-cell"><span className="muted">Starting amount</span><div style={{ fontSize: 18, fontWeight: 700 }}>${envelopeSummary.starting.toFixed(0)}</div></div>
            <div className="macro-cell"><span className="muted">Assigned</span><div style={{ fontSize: 18, fontWeight: 700 }}>${envelopeSummary.totalAssigned.toFixed(0)}</div></div>
            <div className="macro-cell">
              <span className="muted">Unassigned</span>
              <div style={{ fontSize: 18, fontWeight: 700, color: envelopeSummary.unassigned < 0 ? 'var(--danger)' : 'var(--success)' }}>
                ${envelopeSummary.unassigned.toFixed(0)}
              </div>
            </div>
          </div>
        )}

        <div className="stack" style={{ marginTop: 'var(--space-4)' }}>
          {envelopeSummary.envelopes.length === 0 ? <EmptyState icon="leaf" title="No envelopes yet — add your first below" /> : (
            envelopeSummary.envelopes.map(env => (
              editingEnvelopeId === env.id ? (
                <div key={env.id} className="row" style={{ gap: 'var(--space-2)', flexWrap: 'wrap' }}>
                  <input value={editEnvelope.name} onChange={e => setEditEnvelope({ ...editEnvelope, name: e.target.value })} style={{ flex: 1, minWidth: 100 }} />
                  <input type="number" value={editEnvelope.assigned_amount} onChange={e => setEditEnvelope({ ...editEnvelope, assigned_amount: e.target.value })} style={{ width: 90 }} />
                  <Button size="sm" variant="ghost" onClick={() => handleSaveEnvelope(env.id)}>Save</Button>
                  <Button size="sm" variant="text" onClick={() => setEditingEnvelopeId(null)}>Cancel</Button>
                </div>
              ) : (
                <div key={env.id}>
                  <div className="row-between" style={{ fontSize: 13 }}>
                    <span style={{ fontWeight: 700 }}>{env.name}</span>
                    <div className="row" style={{ gap: 'var(--space-2)' }}>
                      <span className={env.remaining < 0 ? 'muted' : 'muted'} style={{ color: env.remaining < 0 ? 'var(--danger)' : undefined }}>
                        ${env.spent.toFixed(0)} / ${Number(env.assigned_amount).toFixed(0)}
                      </span>
                      <Button size="sm" variant="text" onClick={() => startEditEnvelope(env)}>Edit</Button>
                      <Button size="sm" variant="text" onClick={() => handleDeleteEnvelope(env.id)}>Delete</Button>
                    </div>
                  </div>
                  <ProgressBar value={env.spent} max={env.assigned_amount || 1} tone={env.remaining < 0 ? 'danger' : 'sage'} />
                </div>
              )
            ))
          )}
        </div>

        <div className="row" style={{ marginTop: 'var(--space-3)', flexWrap: 'wrap' }}>
          <input placeholder="New envelope name" value={newEnvelope.name}
            onChange={e => setNewEnvelope({ ...newEnvelope, name: e.target.value })} style={{ flex: 1, minWidth: 140 }} />
          <input type="number" placeholder="$ assigned" value={newEnvelope.assigned_amount}
            onChange={e => setNewEnvelope({ ...newEnvelope, assigned_amount: e.target.value })} style={{ width: 100 }} />
          <Button size="sm" onClick={handleAddEnvelope}>+ Add envelope</Button>
        </div>
      </Card>

      <Card>
        <div className="section-label">This month</div>
        <div className="macro-grid" style={{ marginTop: 'var(--space-3)' }}>
          <div className="macro-cell"><span className="muted">Income</span><div style={{ fontSize: 18, fontWeight: 700 }}>${summary.income.toFixed(0)}</div></div>
          <div className="macro-cell"><span className="muted">Spent</span><div style={{ fontSize: 18, fontWeight: 700 }}>${summary.spend.toFixed(0)}</div></div>
          <div className="macro-cell"><span className="muted">Net</span><div style={{ fontSize: 18, fontWeight: 700, color: summary.net >= 0 ? 'var(--success)' : 'var(--danger)' }}>${summary.net.toFixed(0)}</div></div>
        </div>
      </Card>

      <Card>
        <div className="section-label">Quick add</div>
        <div className="row" style={{ marginTop: 'var(--space-3)', flexWrap: 'wrap' }}>
          <select value={form.entry_type} onChange={e => setForm({ ...form, entry_type: e.target.value, category: e.target.value === 'income' ? incomeCategories[0] : expenseCategories[0] })}>
            <option value="expense">Expense</option>
            <option value="bill">Bill</option>
            <option value="income">Income</option>
          </select>
          <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <input type="number" placeholder="Amount" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} style={{ width: 100 }} />
          <input placeholder="Note (optional)" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
          {form.entry_type === 'bill' && (
            <label className="row" style={{ gap: 4, fontSize: 12 }}>
              <input type="checkbox" checked={form.is_recurring} onChange={e => setForm({ ...form, is_recurring: e.target.checked })} />
              Recurring monthly
            </label>
          )}
          <Button size="sm" onClick={handleQuickAdd}>+ Add</Button>
        </div>
      </Card>

      <Card>
        <div className="section-label">Spending by category</div>
        <div className="stack" style={{ marginTop: 'var(--space-3)' }}>
          {Object.keys(summary.byCategory).length === 0 ? <EmptyState icon="leaf" title="Nothing logged yet this month" /> : (
            Object.entries(summary.byCategory).map(([cat, amount]) => {
              const budget = budgets.find(b => b.category === cat);
              return (
                <div key={cat}>
                  <div className="row-between" style={{ fontSize: 13 }}>
                    <span>{cat}</span>
                    <span className="muted">${amount.toFixed(0)}{budget ? ` / ${budget.monthly_target}` : ''}</span>
                  </div>
                  {budget && <ProgressBar value={amount} max={budget.monthly_target} tone={amount > budget.monthly_target ? 'danger' : 'sage'} />}
                </div>
              );
            })
          )}
        </div>
      </Card>

      <Card>
        <div className="section-label">Savings goals</div>
        {savingsGoals.length === 0 ? <EmptyState icon="star" title="No savings goals yet" /> : (
          <div className="stack" style={{ marginTop: 'var(--space-3)' }}>
            {savingsGoals.map(g => (
              <div key={g.id}>
                <div className="row-between" style={{ fontSize: 13 }}>
                  <span style={{ fontWeight: 700 }}>{g.title}</span>
                  <span className="muted">${(g.current_value || 0).toFixed(0)} / ${g.target_value}</span>
                </div>
                <ProgressBar value={g.current_value || 0} max={g.target_value} tone="gold" />
                <div className="row" style={{ marginTop: 'var(--space-2)' }}>
                  <input type="number" placeholder="Add $" value={depositAmounts[g.id] || ''} onChange={e => setDepositAmounts({ ...depositAmounts, [g.id]: e.target.value })} style={{ width: 90 }} />
                  <Button size="sm" variant="ghost" onClick={() => handleDeposit(g.id)}>Log deposit</Button>
                </div>
              </div>
            ))}
          </div>
        )}
        <div style={{ marginTop: 'var(--space-3)' }}>
          {addingGoal ? (
            <div className="row" style={{ flexWrap: 'wrap' }}>
              <input placeholder="Goal name" value={newGoal.title} onChange={e => setNewGoal({ ...newGoal, title: e.target.value })} />
              <input type="number" placeholder="Target $" value={newGoal.target_value} onChange={e => setNewGoal({ ...newGoal, target_value: e.target.value })} style={{ width: 100 }} />
              <Button size="sm" onClick={handleAddGoal}>Add goal</Button>
              <Button size="sm" variant="text" onClick={() => setAddingGoal(false)}>Cancel</Button>
            </div>
          ) : (
            <Button size="sm" variant="ghost" onClick={() => setAddingGoal(true)}>+ Add savings goal</Button>
          )}
        </div>
      </Card>

      {legacyBills.length > 0 && (
        <Card>
          <div className="section-label">Older bills</div>
          <div className="stack" style={{ marginTop: 'var(--space-2)' }}>
            {legacyBills.map(b => (
              <div key={b.id} className="row-between" style={{ padding: '4px 0' }}>
                <span>{b.name}</span><span className="muted">${b.amount}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card>
        <div className="section-label">Recent entries</div>
        <div className="stack" style={{ marginTop: 'var(--space-2)' }}>
          {entries.slice(0, 15).map(e => (
            <div key={e.id} className="row-between" style={{ fontSize: 13, padding: '4px 0' }}>
              <span>{e.category}{e.notes ? ` — ${e.notes}` : ''}</span>
              <div className="row" style={{ gap: 'var(--space-2)' }}>
                <span className={e.entry_type === 'income' ? '' : 'muted'}>{e.entry_type === 'income' ? '+' : '-'}${Number(e.amount).toFixed(0)}</span>
                <button className="row-remove-btn" onClick={() => deleteEntry(e.id).then(refresh)}>×</button>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
