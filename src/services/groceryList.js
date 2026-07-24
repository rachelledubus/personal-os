import { supabase } from '../lib/supabaseClient.js';

// ============================================================
// GROCERY LIST — read/display layer.
// Writes already happen from mealBuilder.js, mealWeek.js, recipes.js,
// and MealPlannerPage.jsx directly into grocery_items — this file is
// only the missing other half: showing the list and checking items
// off, which nothing in the app did before.
// ============================================================

async function getUserId() {
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id;
}

export async function listGroceryItems() {
  const userId = await getUserId();
  const { data, error } = await supabase.from('grocery_items').select('*')
    .eq('user_id', userId).order('purchased').order('category').order('created_at', { ascending: true, nullsFirst: true });
  if (error) throw error;
  return data || [];
}

export async function toggleGroceryItemPurchased(id, purchased) {
  const { error } = await supabase.from('grocery_items').update({ purchased }).eq('id', id);
  if (error) throw error;
}

export async function deleteGroceryItem(id) {
  const { error } = await supabase.from('grocery_items').delete().eq('id', id);
  if (error) throw error;
}

/** Clears everything already checked off — the "start next week's
 *  list clean" action, since items are marked purchased rather than
 *  deleted immediately (keeps the existing dedupe-by-name checks in
 *  mealWeek.js/recipes.js meaningful while shopping is in progress). */
export async function clearPurchasedGroceryItems() {
  const userId = await getUserId();
  const { error } = await supabase.from('grocery_items').delete().eq('user_id', userId).eq('purchased', true);
  if (error) throw error;
}
