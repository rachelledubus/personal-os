import { supabase } from '../lib/supabaseClient.js';

// ============================================================
// LIMITING BELIEF TRACKER
// Standalone table, no relationship to anything else in the app.
// ============================================================

async function getUserId() {
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id;
}

export async function listBeliefs() {
  const userId = await getUserId();
  const { data, error } = await supabase.from('limiting_beliefs').select('*')
    .eq('user_id', userId).order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function addBelief(fields) {
  const userId = await getUserId();
  const { error } = await supabase.from('limiting_beliefs').insert({ ...fields, user_id: userId });
  if (error) throw error;
}

export async function updateBelief(id, fields) {
  const { error } = await supabase.from('limiting_beliefs')
    .update({ ...fields, updated_at: new Date().toISOString() }).eq('id', id);
  if (error) throw error;
}

export async function deleteBelief(id) {
  const { error } = await supabase.from('limiting_beliefs').delete().eq('id', id);
  if (error) throw error;
}
