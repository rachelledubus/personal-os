import { supabase } from '../lib/supabaseClient.js';

async function getUserId() {
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id;
}

export async function listTimeBlocks(date) {
  const userId = await getUserId();
  const { data, error } = await supabase.from('time_blocks').select('*, tasks(title, completed)')
    .eq('user_id', userId).eq('block_date', date).order('start_time', { ascending: true, nullsFirst: false });
  if (error) throw error;
  return data;
}

export async function addTimeBlock(fields) {
  const userId = await getUserId();
  const { error } = await supabase.from('time_blocks').insert({ ...fields, user_id: userId });
  if (error) throw error;
}

export async function updateTimeBlock(id, fields) {
  const { error } = await supabase.from('time_blocks').update(fields).eq('id', id);
  if (error) throw error;
}

export async function deleteTimeBlock(id) {
  const { error } = await supabase.from('time_blocks').delete().eq('id', id);
  if (error) throw error;
}

export async function scheduleTask(task, date, startTime, endTime) {
  const userId = await getUserId();
  const { error } = await supabase.from('time_blocks').insert({
    user_id: userId, task_id: task.id, title: task.title,
    block_date: date, start_time: startTime, end_time: endTime,
    track: task.category === 'Real Estate' ? 'business' : 'personal',
  });
  if (error) throw error;
}
