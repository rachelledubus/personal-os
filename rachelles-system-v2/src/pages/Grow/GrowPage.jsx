import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Card from '../../components/ui/Card.jsx';
import Button from '../../components/ui/Button.jsx';
import Checkbox from '../../components/ui/Checkbox.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import { supabase } from '../../lib/supabaseClient.js';
import { todayStr } from '../../utils/date.js';
import {
  listMaintenanceItems, addMaintenanceItem, completeMaintenanceItem, getPatternSuggestions,
} from '../../services/maintenance.js';
import { logWorkoutSession, listRecentWorkouts, generateInsights } from '../../services/workoutAnalytics.js';

const TABS = ['habits', 'workouts', 'nutrition', 'chores', 'maintenance'];

export default function GrowPage() {
  const { tab = 'habits' } = useParams();
  const navigate = useNavigate();

  return (
    <div>
      <div className="page-title">🌱 Grow</div>

      <div className="row" style={{ marginBottom: 'var(--space-4)', flexWrap: 'wrap' }}>
        {TABS.map(t => (
          <button
            key={t}
            className={`sub-tab ${tab === t ? 'active' : ''}`}
            onClick={() => navigate(`/grow/${t}`)}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {tab === 'habits' && <HabitsTab />}
      {tab === 'workouts' && <WorkoutsTab />}
      {tab === 'nutrition' && <NutritionTab />}
      {tab === 'chores' && <ChoresTab />}
      {tab === 'maintenance' && <MaintenanceTab />}
    </div>
  );
}

function HabitsTab() {
  const [habits, setHabits] = useState([]);
  const [doneIds, setDoneIds] = useState(new Set());

  useEffect(() => { load(); }, []);

  async function load() {
    const { data: { user } } = await supabase.auth.getUser();
    const { data: h } = await supabase.from('habits').select('*').eq('user_id', user.id).eq('archived', false);
    const { data: logs } = await supabase.from('habit_logs').select('*').eq('user_id', user.id).eq('log_date', todayStr());
    setHabits(h || []);
    setDoneIds(new Set((logs || []).filter(l => l.completed).map(l => l.habit_id)));
  }

  async function toggle(habitId, checked) {
    const { data: { user } } = await supabase.auth.getUser();
    if (checked) {
      await supabase.from('habit_logs').upsert(
        { user_id: user.id, habit_id: habitId, log_date: todayStr(), completed: true },
        { onConflict: 'habit_id,log_date' }
      );
    } else {
      await supabase.from('habit_logs').delete().eq('habit_id', habitId).eq('log_date', todayStr());
    }
    load();
  }

  return (
    <Card>
      <div className="section-label">Daily habits</div>
      {habits.length === 0 ? <EmptyState icon="sparkles" title="No habits yet" /> : (
        <div className="stack">
          {habits.map(h => (
            <Checkbox key={h.id} checked={doneIds.has(h.id)} onChange={v => toggle(h.id, v)} label={h.name} />
          ))}
        </div>
      )}
    </Card>
  );
}

function WorkoutsTab() {
  const [lastSessions, setLastSessions] = useState({});
  const [recent, setRecent] = useState([]);
  const [insights, setInsights] = useState([]);
  const [logging, setLogging] = useState(false);
  const [session, setSession] = useState({ workout_type: '', duration_minutes: '', day_key: '' });
  const [exercises, setExercises] = useState([{ exercise_name: '', sets: '', reps: '', weight: '', notes: '', effort_rating: '' }]);

  const days = [
    { key: 'A', label: 'Lower / Quad', weekday: 'Tue' },
    { key: 'B', label: 'Posterior Chain', weekday: 'Thu' },
    { key: 'C', label: 'Upper Body', weekday: 'Sat' },
  ];

  async function refresh() {
    const { data: { user } } = await supabase.auth.getUser();
    const { data } = await supabase.from('workouts').select('*').eq('user_id', user.id)
      .order('workout_date', { ascending: false }).limit(3);
    const byDay = {};
    (data || []).forEach(w => { if (!byDay[w.day_key]) byDay[w.day_key] = w; });
    setLastSessions(byDay);
    setRecent(await listRecentWorkouts(5));
    setInsights(await generateInsights());
  }
  useEffect(() => { refresh(); }, []);

  function updateExercise(i, field, value) {
    setExercises(prev => prev.map((e, idx) => (idx === i ? { ...e, [field]: value } : e)));
  }
  function addExerciseRow() {
    setExercises(prev => [...prev, { exercise_name: '', sets: '', reps: '', weight: '', notes: '', effort_rating: '' }]);
  }

  async function handleSave() {
    const cleanExercises = exercises
      .filter(e => e.exercise_name.trim())
      .map(e => ({
        exercise_name: e.exercise_name.trim(),
        sets: e.sets ? Number(e.sets) : null,
        reps: e.reps ? Number(e.reps) : null,
        weight: e.weight ? Number(e.weight) : null,
        notes: e.notes || null,
        effort_rating: e.effort_rating ? Number(e.effort_rating) : null,
      }));
    await logWorkoutSession({
      workout_date: todayStr(),
      day_key: session.day_key || null,
      workout_type: session.workout_type || null,
      duration_minutes: session.duration_minutes ? Number(session.duration_minutes) : null,
      exercises: cleanExercises,
    });
    setSession({ workout_type: '', duration_minutes: '', day_key: '' });
    setExercises([{ exercise_name: '', sets: '', reps: '', weight: '', notes: '', effort_rating: '' }]);
    setLogging(false);
    refresh();
  }

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

      <div className="stack">
        {days.map(d => (
          <Card key={d.key}>
            <div className="row-between">
              <div style={{ fontWeight: 700 }}>{d.label}</div>
              <div className="muted" style={{ fontSize: 12 }}>{d.weekday}</div>
            </div>
            <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>
              {lastSessions[d.key] ? `Last logged ${lastSessions[d.key].workout_date}` : 'No sessions logged yet'}
            </div>
          </Card>
        ))}
      </div>

      <Card>
        <div className="row-between">
          <div className="section-label">Log today's session</div>
          <Button size="sm" variant="ghost" onClick={() => setLogging(!logging)}>{logging ? 'Cancel' : '+ Log workout'}</Button>
        </div>

        {logging && (
          <div style={{ marginTop: 'var(--space-3)' }}>
            <div className="row" style={{ flexWrap: 'wrap' }}>
              <select value={session.day_key} onChange={e => setSession({ ...session, day_key: e.target.value })}>
                <option value="">Day type…</option>
                <option value="A">A — Lower/Quad</option>
                <option value="B">B — Posterior Chain</option>
                <option value="C">C — Upper Body</option>
              </select>
              <input placeholder="Workout type (e.g. Strength)" value={session.workout_type} onChange={e => setSession({ ...session, workout_type: e.target.value })} />
              <input type="number" placeholder="Duration (min)" value={session.duration_minutes} onChange={e => setSession({ ...session, duration_minutes: e.target.value })} style={{ width: 140 }} />
            </div>

            <div className="section-label" style={{ marginTop: 'var(--space-4)' }}>Exercises</div>
            {exercises.map((ex, i) => (
              <div key={i} className="row" style={{ flexWrap: 'wrap', marginTop: 'var(--space-2)' }}>
                <input placeholder="Exercise name" value={ex.exercise_name} onChange={e => updateExercise(i, 'exercise_name', e.target.value)} />
                <input type="number" placeholder="Sets" value={ex.sets} onChange={e => updateExercise(i, 'sets', e.target.value)} style={{ width: 70 }} />
                <input type="number" placeholder="Reps" value={ex.reps} onChange={e => updateExercise(i, 'reps', e.target.value)} style={{ width: 70 }} />
                <input type="number" placeholder="Weight" value={ex.weight} onChange={e => updateExercise(i, 'weight', e.target.value)} style={{ width: 80 }} />
                <input type="number" placeholder="Effort 1-10" value={ex.effort_rating} onChange={e => updateExercise(i, 'effort_rating', e.target.value)} style={{ width: 90 }} />
                <input placeholder="Notes" value={ex.notes} onChange={e => updateExercise(i, 'notes', e.target.value)} />
              </div>
            ))}
            <Button size="sm" variant="text" onClick={addExerciseRow}>+ Add exercise</Button>

            <div style={{ marginTop: 'var(--space-4)' }}>
              <Button size="sm" onClick={handleSave}>Save session</Button>
            </div>
          </div>
        )}
      </Card>

      {recent.length > 0 && (
        <Card>
          <div className="section-label">Recent sessions</div>
          <div className="stack" style={{ marginTop: 'var(--space-2)' }}>
            {recent.map(w => (
              <div key={w.id} style={{ padding: '6px 0', borderBottom: '1px solid var(--sand)' }}>
                <div className="row-between">
                  <span style={{ fontWeight: 700 }}>{w.workout_type || w.day_key || 'Session'}</span>
                  <span className="muted" style={{ fontSize: 12 }}>{w.workout_date}{w.duration_minutes ? ` · ${w.duration_minutes} min` : ''}</span>
                </div>
                {(w.workout_exercises || []).map(e => (
                  <div key={e.id} className="muted" style={{ fontSize: 12 }}>
                    {e.exercise_name}: {e.sets}×{e.reps} @ {e.weight}lb{e.effort_rating ? ` · effort ${e.effort_rating}/10` : ''}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

function NutritionTab() {
  const [totals, setTotals] = useState({ calories: 0, protein: 0, carbs: 0, fat: 0 });
  const [goals, setGoals] = useState({ calorie_goal: 1835, protein_goal: 150, carb_goal: 185, fat_goal: 55 });

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: logs } = await supabase.from('meal_logs')
        .select('servings, foods(calories, protein, carbs, fat)')
        .eq('user_id', user.id).eq('log_date', todayStr());
      const t = (logs || []).reduce((acc, l) => ({
        calories: acc.calories + (l.foods?.calories || 0) * l.servings,
        protein: acc.protein + (l.foods?.protein || 0) * l.servings,
        carbs: acc.carbs + (l.foods?.carbs || 0) * l.servings,
        fat: acc.fat + (l.foods?.fat || 0) * l.servings,
      }), { calories: 0, protein: 0, carbs: 0, fat: 0 });
      setTotals(t);
      const { data: settings } = await supabase.from('settings').select('*').eq('user_id', user.id).maybeSingle();
      if (settings) setGoals(settings);
    })();
  }, []);

  return (
    <Card>
      <div className="section-label">Today's totals</div>
      <div className="stack">
        <div>Calories: {Math.round(totals.calories)} / {goals.calorie_goal}</div>
        <div>Protein: {Math.round(totals.protein)}g / {goals.protein_goal}g</div>
        <div>Carbs: {Math.round(totals.carbs)}g / {goals.carb_goal}g</div>
        <div>Fat: {Math.round(totals.fat)}g / {goals.fat_goal}g</div>
      </div>
      <p className="muted" style={{ fontSize: 12, marginTop: 12 }}>
        Full planning lives in Plan → Meal Planner.
      </p>
    </Card>
  );
}

function ChoresTab() {
  const [items, setItems] = useState({ 'chores-daily': [], 'chores-weekly': [], 'chores-monthly': [] });

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data } = await supabase.from('checklist_items').select('*')
        .eq('user_id', user.id).eq('archived', false)
        .in('list_key', ['chores-daily', 'chores-weekly', 'chores-monthly']);
      const grouped = { 'chores-daily': [], 'chores-weekly': [], 'chores-monthly': [] };
      (data || []).forEach(i => grouped[i.list_key]?.push(i));
      setItems(grouped);
    })();
  }, []);

  return (
    <div className="stack">
      {['chores-daily', 'chores-weekly', 'chores-monthly'].map(key => (
        <Card key={key}>
          <div className="section-label">{key.replace('chores-', '')}</div>
          {items[key].length === 0
            ? <EmptyState icon="leaf" title="Nothing here yet" />
            : items[key].map(i => <div key={i.id} style={{ padding: '6px 0' }}>{i.name}</div>)}
        </Card>
      ))}
    </div>
  );
}

// Variable-interval reminders — renewals, medication, home/vehicle
// upkeep, vet visits. Distinct from the fixed daily/weekly/monthly
// chore lists above: these have their own due dates and roll forward
// on completion, not on a calendar list.
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
