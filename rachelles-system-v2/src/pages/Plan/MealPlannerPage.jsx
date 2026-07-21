import React, { useEffect, useState } from 'react';
import Card from '../../components/ui/Card.jsx';
import Button from '../../components/ui/Button.jsx';
import ProgressBar from '../../components/ui/ProgressBar.jsx';
import { supabase } from '../../lib/supabaseClient.js';
import { todayStr } from '../../utils/date.js';
import { sumMacros, remainingMacros, suggestFoods, pctOfGoal } from '../../utils/macros.js';
import './MealPlannerPage.css';

const MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snacks'];

export default function MealPlannerPage() {
  const [foods, setFoods] = useState([]);
  const [goals, setGoals] = useState({ calorie_goal: 1835, protein_goal: 150, carb_goal: 185, fat_goal: 55 });
  const [planned, setPlanned] = useState({ breakfast: [], lunch: [], dinner: [], snacks: [] });
  const [actual, setActual] = useState([]);
  const [planDate, setPlanDate] = useState(() => {
    // Default to tomorrow — the spec's "plan before you start eating" flow
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0, 10);
  });

  useEffect(() => { loadAll(); }, [planDate]);

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
    </div>
  );
}
