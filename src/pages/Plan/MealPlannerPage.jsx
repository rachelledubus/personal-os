import React, { useEffect, useState } from 'react';
import { Salad } from 'lucide-react';
import Card from '../../components/ui/Card.jsx';
import Button from '../../components/ui/Button.jsx';
import ProgressBar from '../../components/ui/ProgressBar.jsx';
import { todayStr } from '../../utils/date.js';
import { sumMacros, remainingMacros, suggestFoods, pctOfGoal } from '../../utils/macros.js';
import { seedStarterFoodsIfEmpty } from '../../services/mealBuilder.js';
import {
  loadDayPlan, addFoodToDayPlan, addRecipeToDayPlan, removePlanItem, saveMealPlanAsTemplate,
} from '../../services/mealWeek.js';
import { addPlannedItemsToGroceryList } from '../../services/groceryList.js';
import MealBuilder, { QuickMealAdd } from './MealBuilder.jsx';
import MealQuickAdd from './MealQuickAdd.jsx';
import WeekPlanner from './WeekPlanner.jsx';
import RecipesTab from './RecipesTab.jsx';
import GroceryListTab from './GroceryListTab.jsx';
import KitchenInventoryTab from './KitchenInventoryTab.jsx';

const MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snacks'];

// Batch 9 — full split, same pattern as Batches 6-8. 1,220 lines (11
// components + 20 direct Supabase calls) down to composition + the
// day-view shell. All 20 calls now go through mealWeek.js/
// groceryList.js instead of being inline here.
export default function MealPlannerPage({ embedded = false }) {
  const [viewMode, setViewMode] = useState('day'); // 'day' | 'week' | 'recipes' | 'grocery' | 'inventory'
  const [foods, setFoods] = useState([]);
  const [recipes, setRecipes] = useState([]);
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
    const { foods: f, recipes: r, goals: g, planned: p, actual: a } = await loadDayPlan(planDate);
    setFoods(f);
    setRecipes(r);
    if (g) setGoals(g);
    setPlanned(p);
    setActual(a);
  }

  const allPlannedItems = MEAL_TYPES.flatMap(mt => planned[mt]);
  const plannedTotals = sumMacros(allPlannedItems);
  const remaining = remainingMacros(goals, plannedTotals);
  const suggestions = suggestFoods(foods, remaining, 4);

  const actualTotals = sumMacros(actual.map(a => ({ ...a.foods, servings: a.servings })));

  async function addToPlan(mealType, food) {
    await addFoodToDayPlan(planDate, mealType, food.id);
    loadAll();
  }

  async function addRecipeToPlanDay(mealType, recipe) {
    await addRecipeToDayPlan(planDate, mealType, recipe.id, recipe.base_servings || 1);
    loadAll();
  }

  async function removeFromPlan(planId) {
    await removePlanItem(planId);
    loadAll();
  }

  async function generateGroceryList() {
    await addPlannedItemsToGroceryList(allPlannedItems);
  }

  async function saveAsTemplate() {
    const name = window.prompt('Name this meal plan template:');
    if (!name) return;
    await saveMealPlanAsTemplate(name, allPlannedItems);
  }

  return (
    <div>
      {!embedded && <div className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Salad size={20} /> Meal Planner</div>}

      <MealBuilder foods={foods} onFoodsChanged={loadAll} />
      <QuickMealAdd onSaved={loadAll} />

      <div className="row" style={{ marginTop: 'var(--space-5)', marginBottom: 'var(--space-3)' }}>
        <button className={`sub-tab ${viewMode === 'day' ? 'active' : ''}`} onClick={() => setViewMode('day')}>Plan a day</button>
        <button className={`sub-tab ${viewMode === 'week' ? 'active' : ''}`} onClick={() => setViewMode('week')}>Plan the week</button>
        <button className={`sub-tab ${viewMode === 'recipes' ? 'active' : ''}`} onClick={() => setViewMode('recipes')}>Recipes</button>
        <button className={`sub-tab ${viewMode === 'grocery' ? 'active' : ''}`} onClick={() => setViewMode('grocery')}>Grocery List</button>
        <button className={`sub-tab ${viewMode === 'inventory' ? 'active' : ''}`} onClick={() => setViewMode('inventory')}>Kitchen Inventory</button>
      </div>

      {viewMode === 'grocery' ? (
        <GroceryListTab />
      ) : viewMode === 'inventory' ? (
        <KitchenInventoryTab />
      ) : viewMode === 'recipes' ? (
        <RecipesTab />
      ) : viewMode === 'week' ? (
        <WeekPlanner foods={foods} recipes={recipes} />
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
            {planned[mt].length === 0 && <div className="muted" style={{ fontSize: 'var(--text-small)' }}>Nothing planned yet.</div>}
            {planned[mt].map(item => (
              <div key={item.planId} className="row-between meal-plan-row">
                <span>{item.name} <span className="faint">× {item.servings}</span></span>
                <button className="row-remove-btn" aria-label="Remove" onClick={() => removeFromPlan(item.planId)}>×</button>
              </div>
            ))}
          </div>
          <MealQuickAdd
            mealType={mt}
            foods={foods}
            recipes={recipes}
            onAddFood={f => addToPlan(mt, f)}
            onAddRecipe={r => addRecipeToPlanDay(mt, r)}
          />
        </Card>
      ))}

      <Card style={{ marginTop: 'var(--space-4)' }}>
        <div className="section-label">To help fill remaining macros</div>
        {suggestions.length === 0 ? (
          <div className="muted" style={{ fontSize: 'var(--text-small)' }}>You're close to your targets — nice work.</div>
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
          <div className="row-between" style={{ fontSize: 'var(--text-compact)' }}>
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
