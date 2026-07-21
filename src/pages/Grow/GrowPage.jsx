import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Flame } from 'lucide-react';
import Card from '../../components/ui/Card.jsx';
import Checkbox from '../../components/ui/Checkbox.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import { supabase } from '../../lib/supabaseClient.js';
import { todayStr } from '../../utils/date.js';

const TABS = ['habits', 'workouts', 'nutrition', 'chores'];

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
    </div>
  );
}

/** Computes a simple consecutive-day streak per habit from the
 *  existing habit_logs table — no new table, no new column. Walks
 *  backward from today; stops at the first gap. */
function computeStreaks(habitIds, logs) {
  const byHabit = {};
  habitIds.forEach(id => { byHabit[id] = new Set(); });
  logs.forEach(l => { if (l.completed && byHabit[l.habit_id]) byHabit[l.habit_id].add(l.log_date); });

  const streaks = {};
  habitIds.forEach(id => {
    let streak = 0;
    const cursor = new Date();
    // If today isn't logged yet, start counting from yesterday so an
    // in-progress day doesn't read as "streak broken".
    if (!byHabit[id].has(todayStr())) cursor.setDate(cursor.getDate() - 1);
    while (byHabit[id].has(cursor.toISOString().slice(0, 10))) {
      streak += 1;
      cursor.setDate(cursor.getDate() - 1);
    }
    streaks[id] = streak;
  });
  return streaks;
}

function HabitsTab() {
  const [habits, setHabits] = useState([]);
  const [doneIds, setDoneIds] = useState(new Set());
  const [streaks, setStreaks] = useState({});

  useEffect(() => { load(); }, []);

  async function load() {
    const { data: { user } } = await supabase.auth.getUser();
    const { data: h } = await supabase.from('habits').select('*').eq('user_id', user.id).eq('archived', false);
    const { data: todayLogs } = await supabase.from('habit_logs').select('*').eq('user_id', user.id).eq('log_date', todayStr());
    setHabits(h || []);
    setDoneIds(new Set((todayLogs || []).filter(l => l.completed).map(l => l.habit_id)));

    if (h && h.length > 0) {
      const sixtyDaysAgo = new Date();
      sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
      const { data: history } = await supabase.from('habit_logs').select('habit_id, log_date, completed')
        .eq('user_id', user.id).gte('log_date', sixtyDaysAgo.toISOString().slice(0, 10));
      setStreaks(computeStreaks(h.map(x => x.id), history || []));
    }
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
            <div key={h.id} className="row-between">
              <Checkbox checked={doneIds.has(h.id)} onChange={v => toggle(h.id, v)} label={h.name} />
              {streaks[h.id] > 0 && (
                <span className="habit-streak-chip">
                  <Flame size={12} strokeWidth={2.5} /> {streaks[h.id]}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

function WorkoutsTab() {
  const [lastSessions, setLastSessions] = useState({});

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data } = await supabase.from('workouts').select('*').eq('user_id', user.id)
        .order('workout_date', { ascending: false }).limit(3);
      const byDay = {};
      (data || []).forEach(w => { if (!byDay[w.day_key]) byDay[w.day_key] = w; });
      setLastSessions(byDay);
    })();
  }, []);

  const days = [
    { key: 'A', label: 'Lower / Quad', weekday: 'Tue' },
    { key: 'B', label: 'Posterior Chain', weekday: 'Thu' },
    { key: 'C', label: 'Upper Body', weekday: 'Sat' },
  ];

  return (
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
