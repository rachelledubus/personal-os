import React, { useEffect, useState } from 'react';
import { BookOpen } from 'lucide-react';
import Card from '../../components/ui/Card.jsx';
import Button from '../../components/ui/Button.jsx';
import {
  nextMonday, listWeekPlan, generateWeekGroceryList, listMealTemplates, applyTemplateToSlot,
  addFoodToDayPlan, addRecipeToDayPlan, removePlanItem,
} from '../../services/mealWeek.js';

export default
function WeekPlanner({ foods, recipes }) {
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
    await addFoodToDayPlan(date, mealType, food.id);
    refresh();
  }

  async function addRecipeToSlot(date, mealType, recipe) {
    await addRecipeToDayPlan(date, mealType, recipe.id, recipe.base_servings || 1);
    refresh();
  }

  async function applyTemplate(templateId, date, mealType) {
    if (!templateId) return;
    const template = templates.find(t => t.id === templateId);
    await applyTemplateToSlot(template, date, mealType);
    refresh();
  }

  async function removeItem(planId) {
    await removePlanItem(planId);
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
        {groceryStatus && <div className="muted" style={{ fontSize: 'var(--text-caption)', marginTop: 'var(--space-2)' }}>{groceryStatus}</div>}
      </Card>

      <div className="stack" style={{ marginTop: 'var(--space-4)', gap: 'var(--space-3)' }}>
        {dates.map(date => (
          <DayCard
            key={date}
            date={date}
            dayPlan={byDate[date]}
            foods={foods}
            recipes={recipes}
            templates={templates}
            onAdd={addToSlot}
            onAddRecipe={addRecipeToSlot}
            onApplyTemplate={applyTemplate}
            onRemove={removeItem}
          />
        ))}
      </div>
    </div>
  );
}


function DayCard({ date, dayPlan, foods, recipes, templates, onAdd, onAddRecipe, onApplyTemplate, onRemove }) {
  const [expanded, setExpanded] = useState(false);
  const weekday = WEEKDAY_LABELS[new Date(date).getDay()];
  const totalItems = MEAL_TYPES.reduce((s, mt) => s + dayPlan[mt].length, 0);

  return (
    <Card>
      <div className="row-between" style={{ cursor: 'pointer' }} onClick={() => setExpanded(!expanded)}>
        <div style={{ fontWeight: 700 }}>{weekday} <span className="muted" style={{ fontWeight: 400, fontSize: 'var(--text-caption)' }}>{date}</span></div>
        <div className="muted" style={{ fontSize: 'var(--text-caption)' }}>{totalItems === 0 ? 'Nothing planned' : `${totalItems} item${totalItems === 1 ? '' : 's'} planned`}</div>
      </div>

      {expanded && (
        <div className="stack" style={{ marginTop: 'var(--space-3)', gap: 'var(--space-3)' }} onClick={e => e.stopPropagation()}>
          {MEAL_TYPES.map(mt => (
            <div key={mt}>
              <div className="muted" style={{ fontSize: 'var(--text-micro)', textTransform: 'uppercase' }}>{mt}</div>
              <div className="stack" style={{ marginTop: 2 }}>
                {dayPlan[mt].map(item => (
                  <div key={item.planId} className="row-between meal-plan-row">
                    <span>{item.name} <span className="faint">× {item.servings}</span></span>
                    <button className="row-remove-btn" aria-label="Remove" onClick={() => onRemove(item.planId)}>×</button>
                  </div>
                ))}
              </div>
              <div className="row" style={{ marginTop: 4, flexWrap: 'wrap', gap: 4 }}>
                {foods.filter(f => f.is_regular && (!f.meal_types || f.meal_types.includes(mt))).map(f => (
                  <button key={f.id} className="food-quick-add" onClick={() => onAdd(date, mt, f)}>+ {f.name}</button>
                ))}
                {(recipes || []).filter(r => r.is_regular && (!r.meal_types || r.meal_types.includes(mt))).map(r => (
                  <button key={r.id} className="food-quick-add" onClick={() => onAddRecipe(date, mt, r)}><BookOpen size={12} style={{ verticalAlign: 'middle', marginRight: 2 }} />+ {r.name}</button>
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
