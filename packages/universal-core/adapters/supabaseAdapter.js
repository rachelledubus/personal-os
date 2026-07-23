// OWNER: UNIVERSAL-OS (core)
// File: packages/universal-core/adapters/supabaseAdapter.js
// Purpose: Lightweight supabase adapter helpers used by Universal-OS and Realtor-OS.
// NOTE: This is a minimal implementation used for the MVP. Replace or extend
// with your existing supabase client integration as needed.

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

export const supabase = (SUPABASE_URL && SUPABASE_KEY) ? createClient(SUPABASE_URL, SUPABASE_KEY) : null;

export async function getUserId() {
  if (!supabase) return null;
  try {
    const { data } = await supabase.auth.getUser();
    return data?.user?.id || null;
  } catch {
    return null;
  }
}

export async function getPreference(category, key) {
  // placeholder: applications may store preferences in user_preferences table
  return null;
}

export async function upsertPreference(userId, category, key, value) {
  if (!supabase) return null;
  return supabase.from('user_preferences').upsert({ user_id: userId, category, key, value }, { onConflict: 'user_id,category,key' });
}

export async function insertActivityLog(row) {
  if (!supabase) return null;
  return supabase.from('activity_log').insert(row);
}

export async function selectActivityLog({ userId, source_table, event_type, event_date, gte_event_date }) {
  if (!supabase) return [];
  let q = supabase.from('activity_log').select('*').eq('user_id', userId);
  if (source_table) q = q.eq('source_table', source_table);
  if (event_type) q = q.eq('event_type', event_type);
  if (event_date) q = q.eq('event_date', event_date);
  if (gte_event_date) q = q.gte('event_date', gte_event_date);
  const { data, error } = await q;
  if (error) throw error;
  return data;
}

// Generic create entity helper
export async function createEntity(table, payload) {
  if (!supabase) throw new Error('Supabase not configured');
  const { data, error } = await supabase.from(table).insert(payload).select().single();
  if (error) throw error;
  return data;
}

export async function updateEntity(table, id, payload) {
  if (!supabase) throw new Error('Supabase not configured');
  const { data, error } = await supabase.from(table).update(payload).eq('id', id).select().single();
  if (error) throw error;
  return data;
}

export async function selectById(table, id) {
  if (!supabase) return null;
  const { data, error } = await supabase.from(table).select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return data;
}

// Lightweight raw count helper for metrics runner
export async function rawCount(table, timeField = null, groupBy = null) {
  if (!supabase) return { data: 0 };
  try {
    let q = supabase.from(table).select('*', { count: 'estimated' });
    const { count, error } = await q;
    if (error) return { error };
    return { data: count };
  } catch (err) {
    return { error: err };
  }
}

export async function rawSum(table, field, filter = null) {
  if (!supabase) return { data: 0 };
  try {
    let q = supabase.from(table).select(field, { count: 'exact' });
    if (filter) q = q.filter(filter);
    const { data, error } = await q;
    if (error) return { error };
    const sum = (data || []).reduce((s, r) => s + Number(r[field] || 0), 0);
    return { data: sum };
  } catch (err) {
    return { error: err };
  }
}

export default { supabase, getUserId, upsertPreference, insertActivityLog, selectActivityLog, createEntity, updateEntity, selectById, rawCount, rawSum };
