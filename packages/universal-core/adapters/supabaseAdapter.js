import { supabase } from '../../../src/lib/supabaseClient.js';

// Supabase adapter: a thin adapter the Universal OS core will use to talk to
// the existing Supabase-backed Personal OS data store. The goal is to
// centralize DB/auth calls behind small helper functions so services can
// switch to a different adapter later with minimal code changes.

export async function getUserId() {
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id;
}

export async function getPreference(category, key) {
  const userId = await getUserId();
  if (!userId) return null;
  const { data } = await supabase.from('user_preferences').select('value')
    .eq('user_id', userId).eq('category', category).eq('key', key).maybeSingle();
  return data?.value;
}

export async function upsertPreference(userId, category, key, value) {
  const { error } = await supabase.from('user_preferences').upsert({
    user_id: userId, category, key, value,
  }, { onConflict: 'user_id,category,key' });
  if (error) throw error;
  return true;
}

export async function insertActivityLog(row) {
  const { error } = await supabase.from('activity_log').insert(row);
  if (error) throw error;
  return true;
}

export async function selectActivityLog({ userId, source_table, event_type, event_date, gte_event_date } = {}) {
  if (!userId) return [];
  let query = supabase.from('activity_log').select('event_date, metadata');
  query = query.eq('user_id', userId);
  if (source_table) query = query.eq('source_table', source_table);
  if (event_type) query = query.eq('event_type', event_type);
  if (event_date) query = query.eq('event_date', event_date);
  if (gte_event_date) query = query.gte('event_date', gte_event_date);
  const { data } = await query;
  return data || [];
}

// Expose raw supabase for cases where the adapter surface isn't enough yet.
export { supabase };
