import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Card from '../../components/ui/Card.jsx';
import Button from '../../components/ui/Button.jsx';
import ProgressBar from '../../components/ui/ProgressBar.jsx';
import { supabase } from '../../lib/supabaseClient.js';
import { todayStr } from '../../utils/date.js';
import { sumMacros, remainingMacros, suggestFoods, pctOfGoal } from '../../utils/macros.js';
import {
  SLOTS, listFoodsBySlot, tagFoodSlot, sumSelectionMacros, comboName, addComboToGroceryList, saveComboAsTemplate,
  seedStarterFoodsIfEmpty,
} from '../../services/mealBuilder.js';
import {
  weekDates, nextMonday, listWeekPlan, generateWeekGroceryList, listMealTemplates, applyTemplateToSlot,
} from '../../services/mealWeek.js';
import './MealPlannerPage.css';

const MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snacks'];
const PLAN_TABS = [
  { label: 'Time Blocks', to: '/plan' },
  { label: 'Goals & Projects', to: '/plan/goals' },
  { label: 'Meal Planner', to: '/plan/meals' },
];

function formatFullDate(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

export default function MealPlannerPage() {
  const [viewMode, setViewMode] = useState('day'); // 'day' | 'week'
  const [foods, setFoods] = useState([]);
  const [goals, setGoals] = useState({ calorie_goal: 1835, protein_goal: 150, carb_goal: 185, fat_goal: 55 });
  const [planned, setPlanned] = useState({ breakfast: [], lunch: [], dinner: [], snacks: [] });
  const [actual, setActual] = useState([]);
  const [planDate, setPlanDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0, 10);
  });

  useEffect(() => { seedStarterFoodsIfEmpty().then(loadAll); }, [planDate]);

  async function loadAll() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const [{ data: foodData }, { data: settings }, { data: planData }, { data: logData }] = await Promise.all([
      supabase.from('foods').select('*').eq('user_id', user.id).order('name'),
      supabase.from('settings').select('*').eq('user_id', user.id).maybeSingle(),
      supabase.from('meal_plan_items').select('*, foods(*)').eq('user_id', user.id).eq('plan_date', planDate),
      supabase.from('meal_logs').select('*, foods(*)').eq('user_id', user.id).eq('log_date', planDate),
    ]);

    setFoods(foodData || []);
    if (settings) setGoals(settings);

    const grouped = { breakfast: [], lunch: [], dinner: [], snacks: [] };
    (planData || []).forEach(p => {
      if (grouped[p.meal_type]) grouped[p.meal_type].push({ ...p.foods, servings: p.servings, planId: p.id });
    });
    setPlanned(grouped);
    setActual(logData || []);
  }

  const allPlannedItems = MEAL_TYPES.flatMap(mt => planned[mt]);
  const plannedTotals = sumMacros(allPlannedItems);
  const remaining = remainingMacros(goals, plannedTotals);
  const suggestions = suggestFoods(foods, remaining, 4);

  const actualTotals = sumMacros(actual.map(a => ({ ...a.foods, servings: a.servings })));

  async function addToPlan(mealType, food) {
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from('meal_plan_items').insert({
      user_id: user.id, plan_date: planDate, meal_type: mealType, food_id: food.id, servings: 1,
    });
    loadAll();
  }

  async function removeFromPlan(planId) {
    await supabase.from('meal_plan_items').delete().eq('id', planId);
    loadAll();
  }

  async function generateGroceryList() {
    const { data: { user } } = await supabase.auth.getUser();
    for (const item of allPlannedItems) {
      const exists = await supabase.from('grocery_items').select('id')
        .eq('user_id', user.id).ilike('name', item.name).maybeSingle();
      if (!exists.data) {
        await supabase.from('grocery_items').insert({ user_id: user.id, name: item.name, category: 'Other' });
      }
    }
  }

  async function saveAsTemplate() {
    const name = window.prompt('Name this meal plan template:');
    if (!name) return;
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from('meal_plan_templates').insert({
      user_id: user.id, name, items: allPlannedItems.map(i => ({ mealType: i.mealType, foodId: i.id, servings: i.servings })),
    });
  }

  return (
    <div>
      <div className="page-title">🥗 Meal Planner</div>

      <div className="row" style={{ marginBottom: 'var(--space-4)', flexWrap: 'wrap' }}>
        {PLAN_TABS.map(t => (
          <Link key={t.to} to={t.to}>
            <button className={`sub-tab ${t.to === '/plan/meals' ? 'active' : ''}`}>{t.label}</button>
          </Link>
        ))}
      </div>

      <MealBuilder foods={foods} onFoodsChanged={loadAll} />

      <div className="row" style={{ marginTop: 'var(--space-5)', marginBottom: 'var(--space-3)' }}>
        <button className={`sub-tab ${viewMode === 'day' ? 'active' : ''}`} onClick={() => setViewMode('day')}>Plan a day</button>
        <button className={`sub-tab ${viewMode === 'week' ? 'active' : ''}`} onClick={() => setViewMode('week')}>Plan the week</button>
      </div>

      {viewMode === 'week' ? (
        <WeekPlanner foods={foods} />
      ) : (
      <>
      <Card>
        <div className="row-between">
          <div className="section-label">Planning for</div>
          <input type="date" value={planDate} onChange={e => setPlanDate(e.target.value)} />
        </div>

        <div className="macro-grid" style={{ marginTop: 'var(--space-4)' }}>
          {[
            ['Calories', plannedTotals.calories, goals.calorie_goal, 'sage'],
            ['Protein', plannedTotals.protein, goals.protein_goal, 'accent'],
            ['Carbs', plannedTotals.carbs, goals.carb_goal, 'gold'],
            ['Fat', plannedTotals.fat, goals.fat_goal, 'sage'],
          ].map(([label, val, goal, tone]) => (
            <div key={label} className="macro-cell">
              <div className="row-between">
                <span className="muted">{label}</span>
                <span>{Math.round(val)} / {Math.round(goal)}</span>
              </div>
              <ProgressBar value={val} max={goal} tone={tone} />
            </div>
          ))}
        </div>
      </Card>

      {MEAL_TYPES.map(mt => (
        <Card key={mt} style={{ marginTop: 'var(--space-4)' }}>
          <div className="section-label" style={{ textTransform: 'capitalize' }}>{mt}</div>
          <div className="stack">
            {planned[mt].length === 0 && <div className="muted" style={{ fontSize: 13 }}>Nothing planned yet.</div>}
            {planned[mt].map(item => (
              <div key={item.planId} className="row-between meal-plan-row">
                <span>{item.name} <span className="faint">× {item.servings}</span></span>
                <button className="row-remove-btn" onClick={() => removeFromPlan(item.planId)}>×</button>
              </div>
            ))}
          </div>
          <div className="row" style={{ marginTop: 'var(--space-3)', flexWrap: 'wrap' }}>
            {foods.slice(0, 6).map(f => (
              <button key={f.id} className="food-quick-add" onClick={() => addToPlan(mt, f)}>+ {f.name}</button>
            ))}
          </div>
        </Card>
      ))}

      <Card style={{ marginTop: 'var(--space-4)' }}>
        <div className="section-label">To help fill remaining macros</div>
        {suggestions.length === 0 ? (
          <div className="muted" style={{ fontSize: 13 }}>You're close to your targets — nice work.</div>
        ) : (
          <div className="row" style={{ flexWrap: 'wrap' }}>
            {suggestions.map(f => (
              <button key={f.id} className="food-quick-add suggestion" onClick={() => addToPlan('snacks', f)}>
                + {f.name} <span className="faint">({f.calories} kcal, {f.protein}p)</span>
              </button>
            ))}
          </div>
        )}
      </Card>

      <div className="row" style={{ marginTop: 'var(--space-4)', justifyContent: 'flex-end' }}>
        <Button variant="ghost" onClick={saveAsTemplate}>Save as template</Button>
        <Button variant="primary" onClick={generateGroceryList}>Generate grocery list</Button>
      </div>

      {planDate === todayStr() && (
        <Card style={{ marginTop: 'var(--space-5)' }}>
          <div className="section-label">Actual vs. planned (today)</div>
          <div className="row-between" style={{ fontSize: 14 }}>
            <span>Planned: {Math.round(plannedTotals.calories)} kcal / {Math.round(plannedTotals.protein)}p</span>
            <span>Actual so far: {Math.round(actualTotals.calories)} kcal / {Math.round(actualTotals.protein)}p</span>
          </div>
          <ProgressBar value={pctOfGoal(actualTotals.calories, plannedTotals.calories || 1)} max={100} tone="accent" />
        </Card>
      )}
      </>
      )}
    </div>
  );
}

// ---------- Week view: same meal_plan_items, just 7 days at once ----------

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function WeekPlanner({ foods }) {
  const [weekStart, setWeekStart] = useState(nextMonday());
  const [byDate, setByDate] = useState(null);
  const [templates, setTemplates] = useState([]);
  const [groceryStatus, setGroceryStatus] = useState(null);
  const [generating, setGenerating] = useState(false);

  useEffect(() => { refresh(); }, [weekStart]);

  async function refresh() {
    setByDate(await listWeekPlan(weekStart));
    setTemplates(await listMealTemplates());
  }

  async function addToSlot(date, mealType, food) {
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from('meal_plan_items').insert({
      user_id: user.id, plan_date: date, meal_type: mealType, food_id: food.id, servings: 1,
    });
    refresh();
  }

  async function applyTemplate(templateId, date, mealType) {
    if (!templateId) return;
    const template = templates.find(t => t.id === templateId);
    await applyTemplateToSlot(template, date, mealType);
    refresh();
  }

  async function removeItem(planId) {
    await supabase.from('meal_plan_items').delete().eq('id', planId);
    refresh();
  }

  async function handleGenerateWeekGrocery() {
    setGenerating(true);
    const result = await generateWeekGroceryList(weekStart);
    setGenerating(false);
    setGroceryStatus(`Added ${result.added} of ${result.totalIngredients} ingredients (rest were already on your list).`);
    setTimeout(() => setGroceryStatus(null), 4000);
  }

  function shiftWeek(days) {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + days);
    setWeekStart(d.toISOString().slice(0, 10));
  }

  if (!byDate) return null;
  const dates = weekDates(weekStart);

  return (
    <div>
      <Card>
        <div className="row-between" style={{ flexWrap: 'wrap', gap: 'var(--space-2)' }}>
          <div className="row" style={{ gap: 'var(--space-2)' }}>
            <Button size="sm" variant="ghost" onClick={() => shiftWeek(-7)}>← Prior week</Button>
            <div style={{ fontWeight: 700, alignSelf: 'center' }}>Week of {formatFullDate(weekStart)}</div>
            <Button size="sm" variant="ghost" onClick={() => shiftWeek(7)}>Next week →</Button>
          </div>
          <Button size="sm" variant="primary" onClick={handleGenerateWeekGrocery} disabled={generating}>
            {generating ? 'Adding…' : 'Generate grocery list for this week'}
          </Button>
        </div>
        {groceryStatus && <div className="muted" style={{ fontSize: 12, marginTop: 'var(--space-2)' }}>{groceryStatus}</div>}
      </Card>

      <div className="stack" style={{ marginTop: 'var(--space-4)', gap: 'var(--space-3)' }}>
        {dates.map(date => (
          <DayCard
            key={date}
            date={date}
            dayPlan={byDate[date]}
            foods={foods}
            templates={templates}
            onAdd={addToSlot}
            onApplyTemplate={applyTemplate}
            onRemove={removeItem}
          />
        ))}
      </div>
    </div>
  );
}

function DayCard({ date, dayPlan, foods, templates, onAdd, onApplyTemplate, onRemove }) {
  const [expanded, setExpanded] = useState(false);
  const weekday = WEEKDAY_LABELS[new Date(date).getDay()];
  const totalItems = MEAL_TYPES.reduce((s, mt) => s + dayPlan[mt].length, 0);

  return (
    <Card>
      <div className="row-between" style={{ cursor: 'pointer' }} onClick={() => setExpanded(!expanded)}>
        <div style={{ fontWeight: 700 }}>{weekday} <span className="muted" style={{ fontWeight: 400, fontSize: 12 }}>{date}</span></div>
        <div className="muted" style={{ fontSize: 12 }}>{totalItems === 0 ? 'Nothing planned' : `${totalItems} item${totalItems === 1 ? '' : 's'} planned`}</div>
      </div>

      {expanded && (
        <div className="stack" style={{ marginTop: 'var(--space-3)', gap: 'var(--space-3)' }} onClick={e => e.stopPropagation()}>
          {MEAL_TYPES.map(mt => (
            <div key={mt}>
              <div className="muted" style={{ fontSize: 11, textTransform: 'uppercase' }}>{mt}</div>
              <div className="stack" style={{ marginTop: 2 }}>
                {dayPlan[mt].map(item => (
                  <div key={item.planId} className="row-between meal-plan-row">
                    <span>{item.name} <span className="faint">× {item.servings}</span></span>
                    <button className="row-remove-btn" onClick={() => onRemove(item.planId)}>×</button>
                  </div>
                ))}
              </div>
              <div className="row" style={{ marginTop: 4, flexWrap: 'wrap', gap: 4 }}>
                {foods.slice(0, 4).map(f => (
                  <button key={f.id} className="food-quick-add" onClick={() => onAdd(date, mt, f)}>+ {f.name}</button>
                ))}
                {templates.length > 0 && (
                  <select defaultValue="" onChange={e => { onApplyTemplate(e.target.value, date, mt); e.target.value = ''; }}>
                    <option value="" disabled>Apply saved meal...</option>
                    {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

function MealBuilder({ foods, onFoodsChanged }) {
  const [bySlot, setBySlot] = useState(null);
  const [selection, setSelection] = useState({});
  const [saveName, setSaveName] = useState('');
  const [managingSlots, setManagingSlots] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => { refreshSlots(); }, [foods]);

  async function refreshSlots() {
    const { bySlot: b } = await listFoodsBySlot();
    setBySlot(b);
  }

  function handlePick(slotKey, value, foodList) {
    const asFood = foodList.find(f => f.id === value);
    setSelection(prev => ({ ...prev, [slotKey]: asFood || value }));
  }

  function shuffle() {
    if (!bySlot) return;
    const next = {};
    SLOTS.forEach(s => {
      const pool = bySlot[s.key];
      if (pool && pool.length > 0) next[s.key] = pool[Math.floor(Math.random() * pool.length)];
    });
    setSelection(next);
  }

  async function handleAddToGrocery() {
    await addComboToGroceryList(selection);
  }

  async function handleSave() {
    if (!saveName.trim()) return;
    await saveComboAsTemplate(saveName.trim(), selection);
    setSaveName('');
    setSaved(true);
    setTimeout(() => setSaved(false), 1200);
  }

  async function handleTag(foodId, slot) {
    await tagFoodSlot(foodId, slot);
    refreshSlots();
    onFoodsChanged?.();
  }

  if (!bySlot) return null;

  const macros = sumSelectionMacros(selection);
  const name = comboName(selection);
  const anyTagged = SLOTS.some(s => bySlot[s.key].length > 0);

  return (
    <Card>
      <div className="section-label">Build your own meal</div>
      <p className="muted" style={{ fontSize: 12, marginTop: 4 }}>
        Pick one from each slot, or hit shuffle for a random combo. Tag foods in your Food Database below with a slot to see real macros here instead of just ideas.
      </p>

      {!anyTagged && (
        <div className="muted" style={{ fontSize: 12, margin: '8px 0' }}>
          No foods tagged with a slot yet — expand "Manage food slots" below to tag a few, or just type freely in each box.
        </div>
      )}

      <div className="row" style={{ marginTop: 'var(--space-3)', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
        {SLOTS.map(s => (
          <div key={s.key} style={{ minWidth: 180 }}>
            <div className="muted" style={{ fontSize: 11, textTransform: 'uppercase', marginBottom: 4 }}>{s.label}</div>
            {bySlot[s.key].length > 0 ? (
              <select value={selection[s.key]?.id || ''} onChange={e => handlePick(s.key, e.target.value, bySlot[s.key])} style={{ width: '100%' }}>
                <option value="">Choose {s.label.toLowerCase()}...</option>
                {bySlot[s.key].map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
            ) : (
              <input
                placeholder={`Type a ${s.label.toLowerCase()}...`}
                value={typeof selection[s.key] === 'string' ? selection[s.key] : ''}
                onChange={e => setSelection(prev => ({ ...prev, [s.key]: e.target.value }))}
                style={{ width: '100%' }}
              />
            )}
          </div>
        ))}
      </div>

      {name && <div style={{ marginTop: 'var(--space-3)', fontWeight: 700 }}>{name}</div>}

      {macros ? (
        <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>
          {Math.round(macros.calories)} kcal · {Math.round(macros.protein)}p · {Math.round(macros.carbs)}c · {Math.round(macros.fat)}f
        </div>
      ) : (
        <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>
          Tag foods in your Food Database with a slot to see real macros here.
        </div>
      )}

      <div className="row" style={{ marginTop: 'var(--space-3)', justifyContent: 'flex-end', gap: 'var(--space-2)' }}>
        <Button size="sm" variant="ghost" onClick={shuffle}>Shuffle</Button>
        <Button size="sm" variant="primary" onClick={handleAddToGrocery} disabled={!name}>Add ingredients to grocery list</Button>
      </div>

      <div className="row" style={{ marginTop: 'var(--space-3)', flexWrap: 'wrap' }}>
        <input placeholder="Name this meal to save it (e.g. Weeknight bowl)" value={saveName} onChange={e => setSaveName(e.target.value)} style={{ flex: 1 }} />
        <Button size="sm" onClick={handleSave} disabled={!name}>{saved ? 'Saved ✓' : 'Save this meal'}</Button>
      </div>

      <div style={{ marginTop: 'var(--space-4)' }}>
        <Button size="sm" variant="text" onClick={() => setManagingSlots(!managingSlots)}>
          {managingSlots ? 'Hide' : 'Manage'} food slots
        </Button>
        {managingSlots && (
          foods.length === 0 ? (
            <div className="muted" style={{ fontSize: 12, marginTop: 'var(--space-2)' }}>
              No foods in your database yet — add one from a meal slot above, or below.
            </div>
          ) : (
            <div className="stack" style={{ marginTop: 'var(--space-2)' }}>
              {foods.map(f => (
                <div key={f.id} className="row-between" style={{ fontSize: 13, padding: '4px 0' }}>
                  <span>{f.name}</span>
                  <select value={f.meal_slot || ''} onChange={e => handleTag(f.id, e.target.value)}>
                    <option value="">No slot</option>
                    {SLOTS.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
                  </select>
                </div>
              ))}
            </div>
          )
        )}
      </div>
    </Card>
  );
}
