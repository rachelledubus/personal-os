import { supabase } from '../lib/supabaseClient.js';

// ============================================================
// RECIPES — servings-scaled ingredients + macros, and a scaled
// grocery-list export. Everything here is computed live from
// per-serving values stored once; scaling servings is pure math, no
// separate "scaled" copy of the recipe is ever stored.
// ============================================================

async function getUserId() {
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id;
}

export async function listRecipes() {
  const userId = await getUserId();
  const { data, error } = await supabase.from('recipes').select('*').eq('user_id', userId).order('name');
  if (error) throw error;
  return data;
}

export async function addRecipe(name, baseServings = 1) {
  const userId = await getUserId();
  const { data, error } = await supabase.from('recipes')
    .insert({ user_id: userId, name, base_servings: baseServings }).select().single();
  if (error) throw error;
  return data;
}

export async function updateRecipeServings(id, baseServings) {
  const { error } = await supabase.from('recipes').update({ base_servings: baseServings }).eq('id', id);
  if (error) throw error;
}

export async function deleteRecipe(id) {
  const { error } = await supabase.from('recipes').delete().eq('id', id);
  if (error) throw error;
}

export async function listIngredients(recipeId) {
  const { data, error } = await supabase.from('recipe_ingredients')
    .select('*').eq('recipe_id', recipeId).order('sort_order');
  if (error) throw error;
  return data;
}

export async function addIngredient(recipeId, fields) {
  const userId = await getUserId();
  const existing = await listIngredients(recipeId);
  const { error } = await supabase.from('recipe_ingredients').insert({
    user_id: userId, recipe_id: recipeId, sort_order: existing.length,
    name: fields.name,
    quantity_per_serving: fields.quantity_per_serving || 0,
    unit: fields.unit || '',
    calories_per_serving: fields.calories_per_serving || 0,
    protein_per_serving: fields.protein_per_serving || 0,
    carbs_per_serving: fields.carbs_per_serving || 0,
    fat_per_serving: fields.fat_per_serving || 0,
  });
  if (error) throw error;
}

export async function deleteIngredient(id) {
  const { error } = await supabase.from('recipe_ingredients').delete().eq('id', id);
  if (error) throw error;
}

/** Every quantity/macro at a given serving count — pure math over the
 *  stored per-serving values, nothing persisted for "5 servings" vs
 *  "2 servings," it's just recalculated on demand. */
export function scaleIngredients(ingredients, servings) {
  return ingredients.map(ing => ({
    ...ing,
    scaledQuantity: Math.round(ing.quantity_per_serving * servings * 100) / 100,
    scaledCalories: Math.round(ing.calories_per_serving * servings),
    scaledProtein: Math.round(ing.protein_per_serving * servings * 10) / 10,
    scaledCarbs: Math.round(ing.carbs_per_serving * servings * 10) / 10,
    scaledFat: Math.round(ing.fat_per_serving * servings * 10) / 10,
  }));
}

export function totalMacrosAtServings(ingredients, servings) {
  const scaled = scaleIngredients(ingredients, servings);
  return scaled.reduce((acc, i) => ({
    calories: acc.calories + i.scaledCalories,
    protein: Math.round((acc.protein + i.scaledProtein) * 10) / 10,
    carbs: Math.round((acc.carbs + i.scaledCarbs) * 10) / 10,
    fat: Math.round((acc.fat + i.scaledFat) * 10) / 10,
  }), { calories: 0, protein: 0, carbs: 0, fat: 0 });
}

/** Pushes the scaled ingredient list to the grocery list. grocery_items
 *  only has name + category (no quantity column), so the scaled amount
 *  is folded into the name text — "Flour — 3 cups" — rather than
 *  guessing at a schema change that isn't confirmed to exist. */
export async function addRecipeToGroceryList(recipeId, servings) {
  const userId = await getUserId();
  const ingredients = await listIngredients(recipeId);
  const scaled = scaleIngredients(ingredients, servings);

  for (const ing of scaled) {
    const label = ing.unit
      ? `${ing.name} — ${ing.scaledQuantity} ${ing.unit}`
      : `${ing.name} — ${ing.scaledQuantity}`;
    const { data: exists } = await supabase.from('grocery_items').select('id')
      .eq('user_id', userId).ilike('name', label).maybeSingle();
    if (!exists) {
      await supabase.from('grocery_items').insert({ user_id: userId, name: label, category: 'Other' });
    }
  }
}
