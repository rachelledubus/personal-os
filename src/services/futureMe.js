import { supabase } from '../lib/supabaseClient.js';

async function getUserId() {
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id;
}

export async function listFutureMeLetters() {
  const userId = await getUserId();
  const { data, error } = await supabase.from('future_me_letters').select('*').eq('user_id', userId).order('reveal_date', { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function addFutureMeLetter(fields) {
  const userId = await getUserId();
  const { error } = await supabase.from('future_me_letters').insert({ ...fields, user_id: userId });
  if (error) throw error;
}

export async function openFutureMeLetter(id) {
  const { error } = await supabase.from('future_me_letters').update({ opened: true, opened_at: new Date().toISOString() }).eq('id', id);
  if (error) throw error;
}

export async function deleteFutureMeLetter(id) {
  const { error } = await supabase.from('future_me_letters').delete().eq('id', id);
  if (error) throw error;
}
