import { supabase } from '../lib/supabaseClient.js';

async function getUserId() {
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id;
}

export const PROBLEM_TYPES = [
  { key: 'activity', label: 'Activity', looksLike: 'Not enough conversations, inconsistent content, missed follow-ups', solution: 'Improve execution' },
  { key: 'conversion', label: 'Conversion', looksLike: "Leads don't book, consultations don't convert, follow-up is ineffective", solution: 'Improve messaging, process, or client experience' },
  { key: 'system', label: 'System', looksLike: 'Tasks forgotten, processes inconsistent, steps skipped', solution: 'Create SOPs, templates, checklists, automation' },
  { key: 'priority', label: 'Priority', looksLike: 'Constant new projects, chasing ideas, adding platforms', solution: 'Return to "what creates the most value at this stage?"' },
];

export async function listImprovementLogEntries() {
  const userId = await getUserId();
  const { data, error } = await supabase.from('business_improvement_log').select('*').eq('user_id', userId).order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function addImprovementLogEntry(fields) {
  const userId = await getUserId();
  const { error } = await supabase.from('business_improvement_log').insert({ ...fields, user_id: userId });
  if (error) throw error;
}

export async function updateImprovementLogEntry(id, fields) {
  const { error } = await supabase.from('business_improvement_log').update(fields).eq('id', id);
  if (error) throw error;
}

export async function deleteImprovementLogEntry(id) {
  const { error } = await supabase.from('business_improvement_log').delete().eq('id', id);
  if (error) throw error;
}
