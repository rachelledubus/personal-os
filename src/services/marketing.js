import { supabase } from '../lib/supabaseClient.js';
import { logActivity } from './goals.js';

// ============================================================
// MARKETING CALENDAR (PRD doc 02, Module 4 — Relationship Marketing
// / Farming / Networking / Events / Campaigns half; Content Marketing
// stays in content_pieces / contentEngine.js, not duplicated here).
// ============================================================

async function getUserId() {
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id;
}

export async function listMarketingActivities() {
  const userId = await getUserId();
  const { data, error } = await supabase.from('marketing_activities').select('*')
    .eq('user_id', userId).order('activity_date', { ascending: true, nullsFirst: false });
  if (error) throw error;
  return data || [];
}

export async function addMarketingActivity(fields) {
  const userId = await getUserId();
  const { data, error } = await supabase.from('marketing_activities')
    .insert({ ...fields, user_id: userId }).select().single();
  if (error) throw error;
  return data;
}

export async function updateMarketingActivity(id, fields) {
  const { error } = await supabase.from('marketing_activities').update(fields).eq('id', id);
  if (error) throw error;
}

export async function deleteMarketingActivity(id) {
  const { error } = await supabase.from('marketing_activities').delete().eq('id', id);
  if (error) throw error;
}

/** Marks an activity completed and feeds the shared activity log —
 *  same pattern as maintenance.js/transactions.js — so this counts
 *  toward Guardian XP and any future metrics reporting without those
 *  systems needing to know marketing activities exist. */
export async function completeMarketingActivity(id) {
  await updateMarketingActivity(id, { status: 'completed' });
  await logActivity('marketing_activities', id, 'completed');
}
