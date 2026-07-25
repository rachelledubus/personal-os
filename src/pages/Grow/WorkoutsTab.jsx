import React, { useEffect, useRef, useState } from 'react';
import { Lightbulb, Check, RefreshCw } from 'lucide-react';
import Card from '../../components/ui/Card.jsx';
import Button from '../../components/ui/Button.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import { todayStr } from '../../utils/date.js';
import {
  seedDefaultWorkoutTemplatesIfEmpty, listTemplateForDay, addTemplateExercise, getLastExerciseEntry,
  logWorkoutSession, generateInsights, requestExerciseSwap,
  saveWorkoutDraft, loadWorkoutDraft, clearWorkoutDraft,
} from '../../services/workoutAnalytics.js';

const LIFTING_DAYS = [
  { key: 'A', label: 'Upper Body', weekday: 'Tue' },
  { key: 'B', label: 'Lower / Quad', weekday: 'Thu' },
  { key: 'C', label: 'Posterior Chain', weekday: 'Sat' },
];
const TODAY_DAY_KEY = { 2: 'A', 4: 'B', 6: 'C' }[new Date().getDay()] || 'B';

export default function WorkoutsTab() {
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
            {insights.map((line, i) => <div key={i} style={{ fontSize: 'var(--text-small)', display: 'flex', alignItems: 'flex-start', gap: 6 }}><Lightbulb size={14} style={{ flexShrink: 0, marginTop: 2 }} />{line}</div>)}
          </div>
        </Card>
      )}

      {restoredDraft && (
        <div className="muted" style={{ fontSize: 'var(--text-caption)', background: 'var(--cream)', padding: '8px 12px', borderRadius: 'var(--radius-sm)' }}>
          <Check size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} />Restored your unsaved numbers from earlier — nothing was lost.
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
                {swaps[ex.exercise_name] && <span className="muted" style={{ fontSize: 'var(--text-micro)' }}> (swapped from {ex.exercise_name}, today only)</span>}
              </div>
              <div className="muted" style={{ fontSize: 'var(--text-caption)' }}>{ex.target_reps} reps · {ex.target_sets} sets</div>
            </div>
            <div className="muted" style={{ fontSize: 'var(--text-caption)', marginTop: 2 }}>
              {last ? `Last: ${(last.sets_detail || []).map(s => `${s.weight}×${s.reps}`).join(', ') || `${last.weight}×${last.reps}`} on ${last.workouts?.workout_date}` : 'No sessions logged yet'}
            </div>

            <div className="row" style={{ marginTop: 'var(--space-3)', flexWrap: 'wrap', gap: 'var(--space-4)' }}>
              {(entries[displayName] || []).map((s, i) => (
                <div key={i}>
                  <div className="muted" style={{ fontSize: 'var(--text-micro)' }}>SET {i + 1} · LB</div>
                  <input type="number" value={s.weight} onChange={e => updateSet(displayName, i, 'weight', e.target.value)} style={{ width: 64 }} />
                  <div className="muted" style={{ fontSize: 'var(--text-micro)', marginTop: 4 }}>REPS</div>
                  <input type="number" value={s.reps} onChange={e => updateSet(displayName, i, 'reps', e.target.value)} style={{ width: 64 }} />
                </div>
              ))}
            </div>

            {!swaps[ex.exercise_name] && !proposalHere && (
              <Button size="sm" variant="text" onClick={() => handleRequestSwap(ex)} disabled={swapping === ex.exercise_name} style={{ marginTop: 'var(--space-2)' }}>
                {swapping === ex.exercise_name ? 'Finding a swap…' : <><RefreshCw size={13} style={{ verticalAlign: 'middle', marginRight: 4 }} />Not feeling this one? Swap it</>}
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
        <Button onClick={handleSaveSession}>{saved ? <>Nice work! Saved <Check size={14} style={{ verticalAlign: 'middle' }} /> 🎉</> : `Save ${dayMeta?.label} session`}</Button>
      )}
    </div>
  );
}
