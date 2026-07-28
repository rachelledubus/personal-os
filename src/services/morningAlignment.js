import { supabase } from '../lib/supabaseClient.js';
import { todayStr } from '../utils/date.js';

async function getUserId() {
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id;
}

export const ALIGNMENT_PROMPTS = [
  { key: 'creating', label: 'What am I creating?', placeholder: "Today, this week, this season of your life \u2014 what's actually being built?" },
  { key: 'becoming', label: 'Who am I becoming?', placeholder: 'Not who you were, not who you have to be forever \u2014 who is this version of you.' },
  { key: 'matters_today', label: 'What matters today?', placeholder: 'One or two things, not a to-do list.' },
  { key: 'next_action', label: 'What action moves me forward?', placeholder: 'The one concrete thing, however small.' },
  { key: 'grateful_for', label: 'What am I grateful for?', placeholder: 'Real, specific, today.' },
];

export async function getTodayAlignment() {
  const userId = await getUserId();
  const { data, error } = await supabase.from('morning_alignment_entries')
    .select('*').eq('user_id', userId).eq('entry_date', todayStr()).maybeSingle();
  if (error) throw error;
  return data;
}

export async function saveTodayAlignment(fields, markComplete = false) {
  const userId = await getUserId();
  const payload = { ...fields, user_id: userId, entry_date: todayStr() };
  if (markComplete) payload.completed_at = new Date().toISOString();
  const { error } = await supabase.from('morning_alignment_entries')
    .upsert(payload, { onConflict: 'user_id,entry_date' });
  if (error) throw error;
}

export async function listRecentAlignment(limit = 14) {
  const userId = await getUserId();
  const { data, error } = await supabase.from('morning_alignment_entries')
    .select('*').eq('user_id', userId).not('completed_at', 'is', null)
    .order('entry_date', { ascending: false }).limit(limit);
  if (error) throw error;
  return data || [];
}
