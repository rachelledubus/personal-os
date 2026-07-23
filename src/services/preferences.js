import { supabase } from '../lib/supabaseClient.js';

async function getUserId() {
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id;
}

/** Reads one preference value, or returns `fallback` if unset. Any
 *  future AI feature (or any current component) reads personal
 *  context through this single function rather than each feature
 *  hardcoding its own defaults. */
export async function getPreference(category, key, fallback = null) {
  const userId = await getUserId();
  if (!userId) return fallback;
  const { data } = await supabase.from('user_preferences').select('value')
    .eq('user_id', userId).eq('category', category).eq('key', key).maybeSingle();
  return data ? data.value : fallback;
}

export async function setPreference(category, key, value) {
  const userId = await getUserId();
  const { error } = await supabase.from('user_preferences').upsert({
    user_id: userId, category, key, value, updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id,category,key' });
  if (error) throw error;
}

export async function listPreferences(category = null) {
  const userId = await getUserId();
  let q = supabase.from('user_preferences').select('*').eq('user_id', userId);
  if (category) q = q.eq('category', category);
  const { data, error } = await q;
  if (error) throw error;
  return data;
}
