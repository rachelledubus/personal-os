import React, { useEffect, useState } from 'react';
import { Check, Star } from 'lucide-react';
import Card from '../../components/ui/Card.jsx';
import Button from '../../components/ui/Button.jsx';
import {
  listRecipes, addRecipe, deleteRecipe, updateRecipeServings, listIngredients, addIngredient, deleteIngredient,
  scaleIngredients, totalMacrosAtServings, addRecipeToGroceryList, tagRecipeMealTypes,
} from '../../services/recipes.js';

const MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snacks'];

export default
function RecipesTab() {
  const [recipes, setRecipes] = useState([]);
  const [newRecipeName, setNewRecipeName] = useState('');
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => { load(); }, []);

  async function load() {
    setRecipes(await listRecipes());
  }

  async function handleAddRecipe() {
    if (!newRecipeName.trim()) return;
    await addRecipe(newRecipeName.trim(), 1);
    setNewRecipeName('');
    load();
  }

  async function handleDeleteRecipe(id) {
    await deleteRecipe(id);
    if (expandedId === id) setExpandedId(null);
    load();
  }

  return (
    <Card>
      <div className="section-label">Recipes</div>
      <p className="muted" style={{ fontSize: 'var(--text-caption)', marginTop: 4 }}>
        Set ingredients once at a base serving size — adjusting servings scales every quantity and the total
        macros automatically. Add the scaled ingredients straight to your grocery list.
      </p>
      {recipes.length === 0 ? (
        <div className="muted" style={{ fontSize: 'var(--text-caption)', margin: '12px 0' }}>No recipes yet — add your first below.</div>
      ) : (
        <div className="stack" style={{ marginTop: 'var(--space-3)', gap: 'var(--space-2)' }}>
          {recipes.map(r => (
            <RecipeRow
              key={r.id}
              recipe={r}
              expanded={expandedId === r.id}
              onToggleExpand={() => setExpandedId(expandedId === r.id ? null : r.id)}
              onDelete={() => handleDeleteRecipe(r.id)}
              onServingsChanged={load}
            />
          ))}
        </div>
      )}
      <div className="row" style={{ marginTop: 'var(--space-3)' }}>
        <input placeholder="New recipe name..." value={newRecipeName} onChange={e => setNewRecipeName(e.target.value)} />
        <Button size="sm" onClick={handleAddRecipe}>+ Add recipe</Button>
      </div>
    </Card>
  );
}

function RecipeRow({ recipe, expanded, onToggleExpand, onDelete, onServingsChanged }) {
  const [ingredients, setIngredients] = useState([]);
  const [servings, setServings] = useState(recipe.base_servings);
  const [newIng, setNewIng] = useState({ name: '', quantity_per_serving: '', unit: '', calories_per_serving: '', protein_per_serving: '', carbs_per_serving: '', fat_per_serving: '' });
  const [addedToGrocery, setAddedToGrocery] = useState(false);

  useEffect(() => {
    if (!expanded) return;
    listIngredients(recipe.id).then(setIngredients);
  }, [expanded, recipe.id]);

  async function refreshIngredients() {
    setIngredients(await listIngredients(recipe.id));
  }

  async function handleAddIngredient() {
    if (!newIng.name.trim()) return;
    await addIngredient(recipe.id, {
      name: newIng.name.trim(),
      quantity_per_serving: Number(newIng.quantity_per_serving) || 0,
      unit: newIng.unit,
      calories_per_serving: Number(newIng.calories_per_serving) || 0,
      protein_per_serving: Number(newIng.protein_per_serving) || 0,
      carbs_per_serving: Number(newIng.carbs_per_serving) || 0,
      fat_per_serving: Number(newIng.fat_per_serving) || 0,
    });
    setNewIng({ name: '', quantity_per_serving: '', unit: '', calories_per_serving: '', protein_per_serving: '', carbs_per_serving: '', fat_per_serving: '' });
    refreshIngredients();
  }

  async function handleDeleteIngredient(id) {
    await deleteIngredient(id);
    refreshIngredients();
  }

  async function handleSaveBaseServings() {
    await updateRecipeServings(recipe.id, servings);
    onServingsChanged?.();
  }

  async function handleMealTag(mealType) {
    const current = recipe.meal_types || [];
    const next = current.includes(mealType) ? current.filter(m => m !== mealType) : [...current, mealType];
    await tagRecipeMealTypes(recipe.id, next, recipe.is_regular);
    onServingsChanged?.();
  }

  async function handleToggleRegular() {
    await tagRecipeMealTypes(recipe.id, recipe.meal_types || [], !recipe.is_regular);
    onServingsChanged?.();
  }

  async function handleAddToGrocery() {
    await addRecipeToGroceryList(recipe.id, servings);
    setAddedToGrocery(true);
    setTimeout(() => setAddedToGrocery(false), 1500);
  }

  const scaled = scaleIngredients(ingredients, servings);
  const totals = totalMacrosAtServings(ingredients, servings);

  return (
    <div style={{ background: 'var(--cream)', borderRadius: 'var(--radius-sm)', padding: 'var(--space-2)' }}>
      <div className="row-between" onClick={onToggleExpand} style={{ cursor: 'pointer' }}>
        <span style={{ fontWeight: 700, fontSize: 'var(--text-compact)' }}>{recipe.name}</span>
        <div className="row" style={{ gap: 4 }}>
          <span className="muted" style={{ fontSize: 'var(--text-micro)' }}>base {recipe.base_servings} servings</span>
          <Button size="sm" variant="text" onClick={e => { e.stopPropagation(); onDelete(); }}>Delete</Button>
        </div>
      </div>

      <div className="row" style={{ gap: 4, marginTop: 4, flexWrap: 'wrap' }}>
        {MEAL_TYPES.map(mt => (
          <button
            key={mt}
            className={`sub-tab ${(recipe.meal_types || []).includes(mt) ? 'active' : ''}`}
            style={{ fontSize: 10, textTransform: 'capitalize' }}
            onClick={e => { e.stopPropagation(); handleMealTag(mt); }}
          >{mt}</button>
        ))}
        <button
          className={`sub-tab ${recipe.is_regular ? 'active' : ''}`}
          style={{ fontSize: 10, marginLeft: 6 }}
          onClick={e => { e.stopPropagation(); handleToggleRegular(); }}
        ><Star size={12} fill={recipe.is_regular ? 'currentColor' : 'none'} style={{ verticalAlign: 'middle', marginRight: 3 }} />{recipe.is_regular ? 'Regular' : 'Mark as regular'}</button>
      </div>

      {expanded && (
        <div style={{ marginTop: 'var(--space-3)' }} onClick={e => e.stopPropagation()}>
          <div className="row" style={{ alignItems: 'center', gap: 'var(--space-2)' }}>
            <span style={{ fontSize: 'var(--text-caption)' }}>Servings:</span>
            <input
              type="number" min="1" value={servings}
              onChange={e => setServings(Number(e.target.value) || 1)}
              style={{ width: 60 }}
            />
            <Button size="sm" variant="text" onClick={handleSaveBaseServings}>Save as default</Button>
          </div>

          {ingredients.length > 0 && (
            <>
              <div className="stack" style={{ marginTop: 'var(--space-3)', gap: 4 }}>
                {scaled.map(ing => (
                  <div key={ing.id} className="row-between" style={{ fontSize: 'var(--text-small)' }}>
                    <span>{ing.name} — {ing.scaledQuantity} {ing.unit}</span>
                    <div className="row" style={{ gap: 8, alignItems: 'center' }}>
                      <span className="muted" style={{ fontSize: 'var(--text-micro)' }}>{ing.scaledCalories} kcal</span>
                      <Button size="sm" variant="text" onClick={() => handleDeleteIngredient(ing.id)}>×</Button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="muted" style={{ fontSize: 'var(--text-caption)', marginTop: 'var(--space-2)' }}>
                Total at {servings} servings: {totals.calories} kcal · {totals.protein}p · {totals.carbs}c · {totals.fat}f
              </div>
              <Button size="sm" style={{ marginTop: 'var(--space-2)' }} onClick={handleAddToGrocery}>
                {addedToGrocery ? <>Added <Check size={14} style={{ verticalAlign: 'middle' }} /></> : 'Add ingredients to grocery list'}
              </Button>
            </>
          )}

          <div style={{ marginTop: 'var(--space-3)', paddingTop: 'var(--space-2)', borderTop: '1px solid rgba(22,50,79,0.08)' }}>
            <div className="muted" style={{ fontSize: 'var(--text-micro)', marginBottom: 4 }}>Add ingredient (values per 1 serving)</div>
            <div className="row" style={{ flexWrap: 'wrap', gap: 6 }}>
              <input placeholder="Name" value={newIng.name} onChange={e => setNewIng({ ...newIng, name: e.target.value })} style={{ width: 130 }} />
              <input placeholder="Qty" value={newIng.quantity_per_serving} onChange={e => setNewIng({ ...newIng, quantity_per_serving: e.target.value })} style={{ width: 60 }} />
              <input placeholder="Unit" value={newIng.unit} onChange={e => setNewIng({ ...newIng, unit: e.target.value })} style={{ width: 70 }} />
              <input placeholder="Cal" value={newIng.calories_per_serving} onChange={e => setNewIng({ ...newIng, calories_per_serving: e.target.value })} style={{ width: 55 }} />
              <input placeholder="Protein" value={newIng.protein_per_serving} onChange={e => setNewIng({ ...newIng, protein_per_serving: e.target.value })} style={{ width: 60 }} />
              <input placeholder="Carbs" value={newIng.carbs_per_serving} onChange={e => setNewIng({ ...newIng, carbs_per_serving: e.target.value })} style={{ width: 60 }} />
              <input placeholder="Fat" value={newIng.fat_per_serving} onChange={e => setNewIng({ ...newIng, fat_per_serving: e.target.value })} style={{ width: 55 }} />
              <Button size="sm" variant="ghost" onClick={handleAddIngredient}>+ Add</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
