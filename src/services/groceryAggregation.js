import { supabase } from '../lib/supabaseClient.js';
import { weekDates } from './mealWeek.js';
import { listIngredients, scaleIngredients } from './recipes.js';

async function getUserId() {
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id;
}

// ---------- Shopping-unit conversion mapping (the editable table) ----------

export async function listShoppingUnitMappings() {
  const userId = await getUserId();
  const { data, error } = await supabase.from('ingredient_shopping_units').select('*')
    .eq('user_id', userId).order('ingredient_name');
  if (error) throw error;
  return data || [];
}

export async function addShoppingUnitMapping(fields) {
  const userId = await getUserId();
  const { error } = await supabase.from('ingredient_shopping_units')
    .upsert({ ...fields, user_id: userId }, { onConflict: 'user_id,ingredient_name' });
  if (error) throw error;
}

export async function deleteShoppingUnitMapping(id) {
  const { error } = await supabase.from('ingredient_shopping_units').delete().eq('id', id);
  if (error) throw error;
}

// ---------- Kitchen inventory ----------

export async function listKitchenInventory() {
  const userId = await getUserId();
  const { data, error } = await supabase.from('kitchen_inventory').select('*')
    .eq('user_id', userId).order('ingredient_name');
  if (error) throw error;
  return data || [];
}

export async function setInventoryItem(ingredientName, quantity, unit) {
  const userId = await getUserId();
  const { error } = await supabase.from('kitchen_inventory').upsert({
    user_id: userId, ingredient_name: ingredientName.trim(), quantity: Number(quantity) || 0, unit: unit || null,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id,ingredient_name' });
  if (error) throw error;
}

export async function deleteInventoryItem(id) {
  const { error } = await supabase.from('kitchen_inventory').delete().eq('id', id);
  if (error) throw error;
}

// ---------- Aggregation ----------

const norm = s => (s || '').trim().toLowerCase();

/** Every ingredient planned across the week, summed by (name, unit) —
 *  recipe items expand into their real scaled ingredients, food items
 *  count as 1 unit of themselves per serving planned. */
async function collectWeekIngredients(weekStart) {
  const userId = await getUserId();
  const dates = weekDates(weekStart);
  const { data, error } = await supabase.from('meal_plan_items').select('*, foods(name), recipes(id)')
    .eq('user_id', userId).in('plan_date', dates);
  if (error) throw error;

  const totals = {}; // key: "name||unit" -> { name, unit, quantity }
  const recipeIngredientsCache = {};

  function add(name, unit, quantity) {
    if (!name || !quantity) return;
    const key = `${norm(name)}||${norm(unit)}`;
    if (!totals[key]) totals[key] = { name: name.trim(), unit: unit || '', quantity: 0 };
    totals[key].quantity += quantity;
  }

  for (const item of data || []) {
    if (item.recipe_id && item.recipes) {
      if (!recipeIngredientsCache[item.recipe_id]) {
        recipeIngredientsCache[item.recipe_id] = await listIngredients(item.recipe_id);
      }
      const scaled = scaleIngredients(recipeIngredientsCache[item.recipe_id], item.servings || 1);
      scaled.forEach(ing => add(ing.name, ing.unit, ing.scaledQuantity));
    } else if (item.foods) {
      add(item.foods.name, '', item.servings || 1);
    }
  }

  return Object.values(totals);
}

/** The real "Generate list (with quantities)" action: aggregates the
 *  week's real ingredient quantities, subtracts what's already on hand
 *  in kitchen_inventory, converts to a shopping unit wherever a mapping
 *  exists (rounding up — you can't buy 0.3 of a bag), and writes the
 *  result into grocery_items. Falls back to the raw recipe unit when no
 *  mapping is defined, so nothing is silently dropped. */
export async function generateAggregatedGroceryList(weekStart) {
  const userId = await getUserId();
  const [ingredients, inventory, mappings] = await Promise.all([
    collectWeekIngredients(weekStart),
    listKitchenInventory(),
    listShoppingUnitMappings(),
  ]);

  const inventoryByName = {};
  inventory.forEach(i => { inventoryByName[norm(i.ingredient_name)] = i; });
  const mappingByName = {};
  mappings.forEach(m => { mappingByName[norm(m.ingredient_name)] = m; });

  let added = 0;
  let skippedHaveEnough = 0;

  for (const ing of ingredients) {
    // Subtract on-hand quantity if the units line up (or inventory has no unit recorded).
    const onHand = inventoryByName[norm(ing.name)];
    let remaining = ing.quantity;
    if (onHand && (!onHand.unit || norm(onHand.unit) === norm(ing.unit))) {
      remaining = ing.quantity - (onHand.quantity || 0);
    }
    if (remaining <= 0) { skippedHaveEnough += 1; continue; }

    let totalQuantity = remaining;
    let unit = ing.unit;
    const mapping = mappingByName[norm(ing.name)];
    if (mapping && mapping.qty_per_shopping_unit > 0) {
      totalQuantity = Math.ceil(remaining / mapping.qty_per_shopping_unit);
      unit = mapping.shopping_unit_label;
    }

    const { data: existing } = await supabase.from('grocery_items').select('id')
      .eq('user_id', userId).ilike('name', ing.name).eq('purchased', false).maybeSingle();

    if (existing) {
      await supabase.from('grocery_items').update({ total_quantity: totalQuantity, unit }).eq('id', existing.id);
    } else {
      await supabase.from('grocery_items').insert({
        user_id: userId, name: ing.name, category: 'Other', total_quantity: totalQuantity, unit,
      });
    }
    added += 1;
  }

  return { added, skippedHaveEnough, totalIngredients: ingredients.length };
}
