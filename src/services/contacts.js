import { supabase } from '../lib/supabaseClient.js';

async function getUserId() {
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id;
}

export async function listContacts(category = null) {
  const userId = await getUserId();
  let query = supabase.from('contacts').select('*').eq('user_id', userId)
    .order('next_follow_up_date', { ascending: true, nullsFirst: false });
  if (category) query = query.eq('category', category);
  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function getContact(id) {
  const { data, error } = await supabase.from('contacts').select('*').eq('id', id).single();
  if (error) throw error;
  return data;
}

export async function addContact(fields) {
  const userId = await getUserId();
  const { data, error } = await supabase.from('contacts').insert({ ...fields, user_id: userId }).select().single();
  if (error) throw error;
  return data;
}

export async function updateContact(id, fields) {
  const { error } = await supabase.from('contacts').update(fields).eq('id', id);
  if (error) throw error;
}

export async function deleteContact(id) {
  const { error } = await supabase.from('contacts').delete().eq('id', id);
  if (error) throw error;
}

export async function listPipelineDeals() {
  const userId = await getUserId();
  const { data, error } = await supabase.from('pipeline_deals').select('*').eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}
