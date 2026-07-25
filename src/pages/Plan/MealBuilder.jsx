import React, { useEffect, useState } from 'react';
import { Check, Star, Sparkles } from 'lucide-react';
import Card from '../../components/ui/Card.jsx';
import Button from '../../components/ui/Button.jsx';
import {
  SLOTS, listFoodsBySlot, tagFoodSlot, tagFoodMealTypes, sumSelectionMacros, comboName, addComboToGroceryList,
  saveComboAsRecipe, estimateFoodCalories, saveQuickMealAsFood,
} from '../../services/mealBuilder.js';

const MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snacks'];

export default
function MealBuilder({ foods, onFoodsChanged }) {
  const [bySlot, setBySlot] = useState(null);
  const [selection, setSelection] = useState({});
  const [quantities, setQuantities] = useState({}); // { [slotKey]: { amount, unit } }
  const [extraIngredients, setExtraIngredients] = useState([]); // [{ name, amount, unit }]
  const [newExtra, setNewExtra] = useState({ name: '', amount: '', unit: '' });
  const [saveName, setSaveName] = useState('');
  const [managingSlots, setManagingSlots] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState(null);

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

  function handleQuantityChange(slotKey, field, value) {
    setQuantities(prev => ({ ...prev, [slotKey]: { ...prev[slotKey], [field]: value } }));
  }

  function addExtraIngredient() {
    if (!newExtra.name.trim()) return;
    setExtraIngredients(prev => [...prev, newExtra]);
    setNewExtra({ name: '', amount: '', unit: '' });
  }

  function removeExtraIngredient(index) {
    setExtraIngredients(prev => prev.filter((_, i) => i !== index));
  }

  async function handleAddToGrocery() {
    await addComboToGroceryList(selection);
  }

  async function handleSave() {
    if (!saveName.trim()) return;
    try {
      await saveComboAsRecipe(saveName.trim(), selection, quantities, extraIngredients);
    } catch (err) {
      setSaveError(err.message || String(err));
      return;
    }
    setSaveError(null);
    setSaveName('');
    setExtraIngredients([]);
    setSaved(true);
    onFoodsChanged?.(); // refreshes the parent's recipe list too, so the new recipe shows up immediately in quick-add
    setTimeout(() => setSaved(false), 1200);
  }

  async function handleTag(foodId, slot) {
    await tagFoodSlot(foodId, slot);
    refreshSlots();
    onFoodsChanged?.();
  }

  async function handleMealTag(food, mealType) {
    const current = food.meal_types || [];
    const next = current.includes(mealType) ? current.filter(m => m !== mealType) : [...current, mealType];
    await tagFoodMealTypes(food.id, next, food.is_regular);
    onFoodsChanged?.();
  }

  async function handleToggleRegular(food) {
    await tagFoodMealTypes(food.id, food.meal_types || [], !food.is_regular);
    onFoodsChanged?.();
  }

  if (!bySlot) return null;

  const macros = sumSelectionMacros(selection);
  const name = comboName(selection);
  const anyTagged = SLOTS.some(s => bySlot[s.key].length > 0);

  return (
    <Card>
      <div className="section-label">Build your own meal</div>
      <p className="muted" style={{ fontSize: 'var(--text-caption)', marginTop: 4 }}>
        Pick one from each slot, or hit shuffle for a random combo. Tag foods in your Food Database below with a slot to see real macros here instead of just ideas.
      </p>

      {!anyTagged && (
        <div className="muted" style={{ fontSize: 'var(--text-caption)', margin: '8px 0' }}>
          No foods tagged with a slot yet — expand "Manage food slots" below to tag a few, or just type freely in each box.
        </div>
      )}

      <div className="row" style={{ marginTop: 'var(--space-3)', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
        {SLOTS.map(s => (
          <div key={s.key} style={{ minWidth: 180 }}>
            <div className="muted" style={{ fontSize: 'var(--text-micro)', textTransform: 'uppercase', marginBottom: 4 }}>{s.label}</div>
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
            {selection[s.key] && (
              <div className="row" style={{ marginTop: 4, gap: 4 }}>
                <input
                  type="number" placeholder="Qty" value={quantities[s.key]?.amount ?? ''}
                  onChange={e => handleQuantityChange(s.key, 'amount', e.target.value)}
                  style={{ width: 56, fontSize: 'var(--text-caption)' }}
                />
                <input
                  placeholder="Unit (tbsp, cup...)" value={quantities[s.key]?.unit ?? ''}
                  onChange={e => handleQuantityChange(s.key, 'unit', e.target.value)}
                  style={{ flex: 1, fontSize: 'var(--text-caption)' }}
                />
              </div>
            )}
          </div>
        ))}
      </div>

      <div style={{ marginTop: 'var(--space-3)' }}>
        <div className="muted" style={{ fontSize: 'var(--text-micro)', textTransform: 'uppercase', marginBottom: 4 }}>Extra ingredients (optional)</div>
        {extraIngredients.length > 0 && (
          <div className="stack" style={{ gap: 4, marginBottom: 'var(--space-2)' }}>
            {extraIngredients.map((ing, i) => (
              <div key={i} className="row-between" style={{ fontSize: 'var(--text-small)' }}>
                <span>{ing.name} <span className="faint">{ing.amount} {ing.unit}</span></span>
                <button className="row-remove-btn" onClick={() => removeExtraIngredient(i)}>×</button>
              </div>
            ))}
          </div>
        )}
        <div className="row" style={{ flexWrap: 'wrap', gap: 4 }}>
          <input placeholder="Ingredient name" value={newExtra.name} onChange={e => setNewExtra(n => ({ ...n, name: e.target.value }))} style={{ flex: 2, minWidth: 120 }} />
          <input type="number" placeholder="Qty" value={newExtra.amount} onChange={e => setNewExtra(n => ({ ...n, amount: e.target.value }))} style={{ width: 56 }} />
          <input placeholder="Unit" value={newExtra.unit} onChange={e => setNewExtra(n => ({ ...n, unit: e.target.value }))} style={{ width: 90 }} />
          <Button size="sm" variant="ghost" onClick={addExtraIngredient}>+ Add ingredient</Button>
        </div>
        <div className="muted" style={{ fontSize: 'var(--text-micro)', marginTop: 4 }}>
          Macros for extra ingredients default to 0 — edit them precisely from the Recipes tab after saving, if needed.
        </div>
      </div>

      {name && <div style={{ marginTop: 'var(--space-3)', fontWeight: 700 }}>{name}</div>}

      {macros ? (
        <div className="muted" style={{ fontSize: 'var(--text-caption)', marginTop: 4 }}>
          {Math.round(macros.calories)} kcal · {Math.round(macros.protein)}p · {Math.round(macros.carbs)}c · {Math.round(macros.fat)}f
        </div>
      ) : (
        <div className="muted" style={{ fontSize: 'var(--text-caption)', marginTop: 4 }}>
          Tag foods in your Food Database with a slot to see real macros here.
        </div>
      )}

      <div className="row" style={{ marginTop: 'var(--space-3)', justifyContent: 'flex-end', gap: 'var(--space-2)' }}>
        <Button size="sm" variant="ghost" onClick={shuffle}>Shuffle</Button>
        <Button size="sm" variant="primary" onClick={handleAddToGrocery} disabled={!name}>Add ingredients to grocery list</Button>
      </div>

      <div className="row" style={{ marginTop: 'var(--space-3)', flexWrap: 'wrap' }}>
        <input placeholder="Name this recipe (e.g. Weeknight bowl)" value={saveName} onChange={e => setSaveName(e.target.value)} style={{ flex: 1 }} />
        <Button size="sm" onClick={handleSave} disabled={!name}>{saved ? <>Saved <Check size={14} style={{ verticalAlign: 'middle' }} /></> : 'Save as Recipe'}</Button>
      </div>
      {saveError && <div className="muted" style={{ fontSize: 'var(--text-micro)', marginTop: 4, color: 'var(--danger)' }}>Couldn't save: {saveError}</div>}

      <div style={{ marginTop: 'var(--space-4)' }}>
        <Button size="sm" variant="text" onClick={() => setManagingSlots(!managingSlots)}>
          {managingSlots ? 'Hide' : 'Manage'} food slots
        </Button>
        {managingSlots && (
          foods.length === 0 ? (
            <div className="muted" style={{ fontSize: 'var(--text-caption)', marginTop: 'var(--space-2)' }}>
              No foods in your database yet — add one from a meal slot above, or below.
            </div>
          ) : (
            <div className="stack" style={{ marginTop: 'var(--space-2)', gap: 6 }}>
              {foods.map(f => (
                <div key={f.id} style={{ fontSize: 'var(--text-small)', padding: '4px 0', borderBottom: '1px solid var(--sand)' }}>
                  <div className="row-between">
                    <span>{f.name}</span>
                    <select value={f.meal_slot || ''} onChange={e => handleTag(f.id, e.target.value)}>
                      <option value="">No slot</option>
                      {SLOTS.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
                    </select>
                  </div>
                  <div className="row" style={{ gap: 4, marginTop: 4 }}>
                    {MEAL_TYPES.map(mt => (
                      <button
                        key={mt}
                        className={`sub-tab ${(f.meal_types || []).includes(mt) ? 'active' : ''}`}
                        style={{ fontSize: 10, textTransform: 'capitalize' }}
                        onClick={() => handleMealTag(f, mt)}
                      >{mt}</button>
                    ))}
                    <button
                      className={`sub-tab ${f.is_regular ? 'active' : ''}`}
                      style={{ fontSize: 10, marginLeft: 6 }}
                      onClick={() => handleToggleRegular(f)}
                    ><Star size={12} fill={f.is_regular ? 'currentColor' : 'none'} style={{ verticalAlign: 'middle', marginRight: 3 }} />{f.is_regular ? 'Regular' : 'Mark as regular'}</button>
                  </div>
                </div>
              ))}
            </div>
          )
        )}
      </div>
    </Card>
  );
}

export function QuickMealAdd({ onSaved }) {
  const [description, setDescription] = useState('');
  const [estimating, setEstimating] = useState(false);
  const [estimate, setEstimate] = useState(null);
  const [saved, setSaved] = useState(false);

  async function handleEstimate() {
    if (!description.trim()) return;
    setEstimating(true);
    setEstimate(null);
    const result = await estimateFoodCalories(description.trim());
    setEstimating(false);
    if (!result) {
      setEstimate({ error: true });
      return;
    }
    setEstimate(result);
  }

  async function handleSave() {
    if (!estimate || estimate.error) return;
    await saveQuickMealAsFood(description.trim(), estimate);
    setSaved(true);
    setDescription('');
    setEstimate(null);
    onSaved?.();
    setTimeout(() => setSaved(false), 1200);
  }

  return (
    <Card style={{ marginTop: 'var(--space-4)' }}>
      <div className="section-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Sparkles size={14} />Quick meal (AI-estimated)</div>
      <p className="muted" style={{ fontSize: 'var(--text-caption)', marginTop: 4 }}>
        For premade/packaged things — frozen pizza, boxed tortellini, a takeout order. AI estimates the calories so
        you don't have to look it up, then it's saved as a real food you can use anywhere.
      </p>
      <div className="row" style={{ marginTop: 'var(--space-3)', flexWrap: 'wrap' }}>
        <input
          placeholder="e.g. Trader Joe's frozen cheese pizza, half box"
          value={description}
          onChange={e => setDescription(e.target.value)}
          style={{ flex: 1, minWidth: 220 }}
        />
        <Button size="sm" onClick={handleEstimate} disabled={estimating || !description.trim()}>
          {estimating ? 'Estimating...' : 'Estimate'}
        </Button>
      </div>
      {estimate && estimate.error && (
        <div className="muted" style={{ fontSize: 'var(--text-caption)', marginTop: 'var(--space-2)' }}>
          AI estimate unavailable right now — try again shortly.
        </div>
      )}
      {estimate && !estimate.error && (
        <div style={{ marginTop: 'var(--space-3)', padding: 'var(--space-3)', background: 'var(--cream)', borderRadius: 'var(--radius-sm)' }}>
          <div style={{ fontSize: 'var(--text-small)' }}>
            {estimate.calories} kcal · {estimate.protein}p · {estimate.carbs}c · {estimate.fat}f
          </div>
          {estimate.serving_note && <div className="muted" style={{ fontSize: 'var(--text-micro)', marginTop: 2 }}>{estimate.serving_note}</div>}
          <Button size="sm" style={{ marginTop: 'var(--space-2)' }} onClick={handleSave}>
            {saved ? <>Saved <Check size={14} style={{ verticalAlign: 'middle' }} /></> : 'Save to my foods'}
          </Button>
        </div>
      )}
    </Card>
  );
}
