import React, { useState } from 'react';
import { BookOpen } from 'lucide-react';

export default
function MealQuickAdd({ mealType, foods, recipes, onAddFood, onAddRecipe }) {
  const [query, setQuery] = useState('');

  const regularFoods = foods.filter(f => f.is_regular && (!f.meal_types || f.meal_types.length === 0 || f.meal_types.includes(mealType)));
  const regularRecipes = recipes.filter(r => r.is_regular && (!r.meal_types || r.meal_types.length === 0 || r.meal_types.includes(mealType)));

  const q = query.trim().toLowerCase();
  const searchResults = q
    ? [
        ...foods.filter(f => f.name.toLowerCase().includes(q)).map(f => ({ type: 'food', item: f })),
        ...recipes.filter(r => r.name.toLowerCase().includes(q)).map(r => ({ type: 'recipe', item: r })),
      ].slice(0, 8)
    : [];

  return (
    <div style={{ marginTop: 'var(--space-3)' }}>
      {(regularFoods.length > 0 || regularRecipes.length > 0) ? (
        <div className="row" style={{ flexWrap: 'wrap', gap: 6 }}>
          {regularFoods.map(f => (
            <button key={f.id} className="food-quick-add" onClick={() => onAddFood(f)}>+ {f.name}</button>
          ))}
          {regularRecipes.map(r => (
            <button key={r.id} className="food-quick-add" onClick={() => onAddRecipe(r)}><BookOpen size={12} style={{ verticalAlign: 'middle', marginRight: 2 }} />+ {r.name}</button>
          ))}
        </div>
      ) : (
        <div className="muted" style={{ fontSize: 'var(--text-micro)' }}>
          No regulars tagged for {mealType} yet — tag some as "Regular" (Manage food slots / Recipes tab), or search below.
        </div>
      )}

      <input
        placeholder={`Search foods & recipes to add to ${mealType}...`}
        value={query}
        onChange={e => setQuery(e.target.value)}
        style={{ width: '100%', marginTop: 'var(--space-2)', fontSize: 'var(--text-small)' }}
      />
      {searchResults.length > 0 && (
        <div className="row" style={{ flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
          {searchResults.map(r => (
            <button
              key={`${r.type}-${r.item.id}`}
              className="food-quick-add"
              onClick={() => { r.type === 'food' ? onAddFood(r.item) : onAddRecipe(r.item); setQuery(''); }}
            >
              {r.type === 'recipe' && <BookOpen size={12} style={{ verticalAlign: 'middle', marginRight: 2 }} />}+ {r.item.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

