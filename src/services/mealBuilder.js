import { supabase } from '../lib/supabaseClient.js';

// ============================================================
// MEAL BUILDER
// "Build Your Own Meal": pick one food from each of 5 slots (or hit
// Shuffle), reuses `foods` (now taggable by meal_slot), `meal_plan_templates`
// (save), and `grocery_items` (add ingredients) — nothing new duplicated,
// just a slot tag and a picker UI on top of what already existed.
// ============================================================

export const SLOTS = [
  { key: 'protein', label: 'Protein' },
  { key: 'carb', label: 'Carb' },
  { key: 'soft_veggie', label: 'Soft Veggie' },
  { key: 'fat', label: 'Fat' },
  { key: 'flavor', label: 'Flavor' },
];

// Realistic, common foods with real macro estimates — enough to
// actually build a meal on day one, not an empty database waiting for
// manual entry. Values are per typical serving, meant as a reasonable
// starting point, editable anytime.
const STARTER_FOODS = [
  { name: 'Grilled chicken breast', meal_slot: 'protein', calories: 165, protein: 31, carbs: 0, fat: 3.6 },
  { name: 'Ground turkey (93/7)', meal_slot: 'protein', calories: 170, protein: 22, carbs: 0, fat: 9 },
  { name: 'Salmon fillet', meal_slot: 'protein', calories: 208, protein: 23, carbs: 0, fat: 13 },
  { name: 'Scrambled eggs (2)', meal_slot: 'protein', calories: 180, protein: 12, carbs: 1, fat: 14 },
  { name: 'Greek yogurt', meal_slot: 'protein', calories: 100, protein: 17, carbs: 6, fat: 0.7 },
  { name: 'Black beans', meal_slot: 'protein', calories: 227, protein: 15, carbs: 41, fat: 0.9 },
  { name: 'Brown rice', meal_slot: 'carb', calories: 216, protein: 5, carbs: 45, fat: 1.8 },
  { name: 'Sweet potato', meal_slot: 'carb', calories: 112, protein: 2, carbs: 26, fat: 0.1 },
  { name: 'Quinoa', meal_slot: 'carb', calories: 222, protein: 8, carbs: 39, fat: 3.6 },
  { name: 'Whole wheat toast (2 slices)', meal_slot: 'carb', calories: 138, protein: 6, carbs: 24, fat: 2 },
  { name: 'Whole wheat pasta', meal_slot: 'carb', calories: 174, protein: 7, carbs: 37, fat: 0.8 },
  { name: 'Steamed broccoli', meal_slot: 'soft_veggie', calories: 55, protein: 4, carbs: 11, fat: 0.6 },
  { name: 'Sauteed spinach', meal_slot: 'soft_veggie', calories: 41, protein: 5, carbs: 7, fat: 0.5 },
  { name: 'Roasted zucchini', meal_slot: 'soft_veggie', calories: 33, protein: 2, carbs: 6, fat: 0.4 },
  { name: 'Mashed cauliflower', meal_slot: 'soft_veggie', calories: 45, protein: 3, carbs: 8, fat: 0.5 },
  { name: 'Avocado (half)', meal_slot: 'fat', calories: 120, protein: 1.5, carbs: 6, fat: 11 },
  { name: 'Olive oil (1 tbsp)', meal_slot: 'fat', calories: 119, protein: 0, carbs: 0, fat: 14 },
  { name: 'Almonds (small handful)', meal_slot: 'fat', calories: 164, protein: 6, carbs: 6, fat: 14 },
  { name: 'Shredded cheese', meal_slot: 'fat', calories: 113, protein: 7, carbs: 1, fat: 9 },
  { name: 'Salsa', meal_slot: 'flavor', calories: 20, protein: 1, carbs: 4, fat: 0.1 },
  { name: 'Soy sauce', meal_slot: 'flavor', calories: 10, protein: 1, carbs: 1, fat: 0 },
  { name: 'Hot sauce', meal_slot: 'flavor', calories: 5, protein: 0, carbs: 1, fat: 0 },
  { name: 'Pesto', meal_slot: 'flavor', calories: 80, protein: 1.5, carbs: 1, fat: 8 },
  { name: 'Lemon herb seasoning', meal_slot: 'flavor', calories: 5, protein: 0, carbs: 1, fat: 0 },
];

export async function seedStarterFoodsIfEmpty() {
  const userId = await getUserId();
  if (!userId) return;
  const { count } = await supabase.from('foods').select('id', { count: 'exact', head: true }).eq('user_id', userId);
  if (count && count > 0) return; // never overwrite an existing food database
  await supabase.from('foods').insert(STARTER_FOODS.map(f => ({ ...f, user_id: userId })));
}

async function getUserId() {
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id;
}

export async function listFoodsBySlot() {
  const userId = await getUserId();
  const { data, error } = await supabase.from('foods').select('*').eq('user_id', userId).order('name');
  if (error) throw error;
  const bySlot = {};
  SLOTS.forEach(s => (bySlot[s.key] = []));
  (data || []).forEach(f => { if (f.meal_slot) bySlot[f.meal_slot].push(f); });
  return { bySlot, allFoods: data || [] };
}

export async function tagFoodSlot(foodId, slot) {
  const { error } = await supabase.from('foods').update({ meal_slot: slot || null }).eq('id', foodId);
  if (error) throw error;
}

/** Real macro totals if every slot has a tagged food selected, null
 *  otherwise (some slots may still be free-text since nothing's
 *  tagged for them yet — that's fine, just no macro total to show). */
export function sumSelectionMacros(selection) {
  const foods = Object.values(selection).filter(v => v && typeof v === 'object');
  if (foods.length === 0) return null;
  return foods.reduce((acc, f) => ({
    calories: acc.calories + (f.calories || 0),
    protein: acc.protein + (f.protein || 0),
    carbs: acc.carbs + (f.carbs || 0),
    fat: acc.fat + (f.fat || 0),
  }), { calories: 0, protein: 0, carbs: 0, fat: 0 });
}

export function comboName(selection) {
  return SLOTS.map(s => {
    const v = selection[s.key];
    if (!v) return null;
    return typeof v === 'object' ? v.name : v;
  }).filter(Boolean).join(' + ');
}

export async function addComboToGroceryList(selection) {
  const userId = await getUserId();
  const names = SLOTS.map(s => {
    const v = selection[s.key];
    if (!v) return null;
    return typeof v === 'object' ? v.name : v;
  }).filter(Boolean);

  for (const name of names) {
    const { data: exists } = await supabase.from('grocery_items').select('id')
      .eq('user_id', userId).ilike('name', name).maybeSingle();
    if (!exists) {
      await supabase.from('grocery_items').insert({ user_id: userId, name, category: 'Other' });
    }
  }
}

export async function saveComboAsTemplate(name, selection) {
  const userId = await getUserId();
  const items = SLOTS.map(s => {
    const v = selection[s.key];
    if (!v) return null;
    return typeof v === 'object' ? { slot: s.key, foodId: v.id, name: v.name } : { slot: s.key, name: v };
  }).filter(Boolean);
  const { error } = await supabase.from('meal_plan_templates').insert({ user_id: userId, name, items });
  if (error) throw error;
}
