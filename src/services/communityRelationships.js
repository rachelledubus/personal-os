import { supabase } from '../lib/supabaseClient.js';

async function getUserId() {
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id;
}

export const COMFORT_LADDER_LEVELS = [
  { level: 1, label: 'Observe', description: 'Join groups, follow organizations, read conversations — no interaction required' },
  { level: 2, label: 'Low-Pressure Engagement', description: 'Like posts, comment supportively, share local info' },
  { level: 3, label: 'Helpful Participation', description: 'Answer questions, share resources, recommend local businesses' },
  { level: 4, label: 'Relationship Building', description: 'Introduce yourself, attend events, have conversations, follow up' },
  { level: 5, label: 'Leadership', description: 'Host educational events, collaborate with organizations, create resources' },
];

export const COMMUNITY_CATEGORIES = [
  'Local civic & community organizations', 'Family & youth communities', 'Local businesses', 'Community Facebook groups', 'Other',
];

export async function listCommunityRelationships() {
  const userId = await getUserId();
  const { data, error } = await supabase.from('community_relationships').select('*').eq('user_id', userId).order('name');
  if (error) throw error;
  return data || [];
}

export async function addCommunityRelationship(fields) {
  const userId = await getUserId();
  const { error } = await supabase.from('community_relationships').insert({ ...fields, user_id: userId });
  if (error) throw error;
}

export async function updateCommunityRelationship(id, fields) {
  const { error } = await supabase.from('community_relationships').update(fields).eq('id', id);
  if (error) throw error;
}

export async function deleteCommunityRelationship(id) {
  const { error } = await supabase.from('community_relationships').delete().eq('id', id);
  if (error) throw error;
}

export async function logEngagement(id) {
  const { error } = await supabase.from('community_relationships').update({ last_engaged_date: new Date().toISOString().slice(0, 10) }).eq('id', id);
  if (error) throw error;
}
