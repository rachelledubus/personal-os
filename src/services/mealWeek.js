import { supabase } from '../lib/supabaseClient.js';
import { mondayOfWeek } from '../utils/date.js';

// ============================================================
// WEEKLY MEAL PLANNING
// No new table — meal_plan_items already has plan_date per row, so a
// "week" is just 7 of those dates queried at once. This is purely a
// week-scoped read/write layer plus a grocery aggregation across all
// 7 days instead of one, on top of what MealPlannerPage already uses.
// ============================================================

async function getUserId() {
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id;
}

export function weekDates(weekStart) {
  const start = new Date(weekStart);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    return d.toISOString().slice(0, 10);
  });
}

export function nextMonday() {
  const today = new Date();
  // If today IS Monday, plan from today; otherwise jump to the coming Monday.
  const monday = mondayOfWeek(today.getDay() === 1 ? today : new Date(today.setDate(today.getDate() + 7)));
  return monday;
}

/** Everything planned across all 7 days of the week, grouped by date
 *  then meal type — one query instead of seven. */
export async function listWeekPlan(weekStart) {
  const userId = await getUserId();
  const dates = weekDates(weekStart);
  const { data, error } = await supabase
    .from('meal_plan_items').select('*, foods(*), recipes(*)')
    .eq('user_id', userId).in('plan_date', dates);
  if (error) throw error;

  const byDate = {};
  dates.forEach(d => (byDate[d] = { breakfast: [], lunch: [], dinner: [], snacks: [] }));
  (data || []).forEach(item => {
    if (!byDate[item.plan_date]?.[item.meal_type]) return;
    if (item.recipe_id && item.recipes) {
      byDate[item.plan_date][item.meal_type].push({ name: `${item.recipes.name} (recipe)`, servings: item.servings, planId: item.id });
    } else {
      byDate[item.plan_date][item.meal_type].push({ ...item.foods, servings: item.servings, planId: item.id });
    }
  });
  return byDate;
}

/** Every distinct ingredient planned anywhere in the week, added to
 *  the grocery list once each — the whole point of planning a week at
 *  once instead of one button-press per day. */
export async function generateWeekGroceryList(weekStart) {
  const userId = await getUserId();
  const dates = weekDates(weekStart);
  const { data, error } = await supabase
    .from('meal_plan_items').select('foods(name)')
    .eq('user_id', userId).in('plan_date', dates);
  if (error) throw error;

  const names = [...new Set((data || []).map(i => i.foods?.name).filter(Boolean))];
  let added = 0;
  for (const name of names) {
    const { data: exists } = await supabase.from('grocery_items').select('id')
      .eq('user_id', userId).ilike('name', name).maybeSingle();
    if (!exists) {
      await supabase.from('grocery_items').insert({ user_id: userId, name, category: 'Other' });
      added += 1;
    }
  }
  return { totalIngredients: names.length, added };
}

export async function listMealTemplates() {
  const userId = await getUserId();
  const { data, error } = await supabase.from('meal_plan_templates').select('*').eq('user_id', userId).order('name');
  if (error) throw error;
  return data;
}

/** Drops a saved template's items into one day/meal slot — the
 *  low-effort way to fill a week: build a few go-to meals once, then
 *  just apply them across days instead of re-picking foods each time. */
export async function applyTemplateToSlot(template, date, mealType) {
  const userId = await getUserId();
  const rows = (template.items || [])
    .filter(i => i.foodId || i.recipeId) // free-text-only items (no matching food/recipe row) can't be scheduled
    .map(i => ({
      user_id: userId, plan_date: date, meal_type: mealType,
      food_id: i.foodId || null, recipe_id: i.recipeId || null, servings: i.servings || 1,
    }));
  if (rows.length === 0) return;
  const { error } = await supabase.from('meal_plan_items').insert(rows);
  if (error) throw error;
}
