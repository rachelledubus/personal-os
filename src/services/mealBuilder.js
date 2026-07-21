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
