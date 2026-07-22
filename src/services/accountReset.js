import { supabase } from '../lib/supabaseClient.js';

// ============================================================
// ACCOUNT RESET — calls the reset_all_user_data() Postgres function
// (see migration for the full reasoning). This is the one place in
// the entire app that can delete everything — kept as a single,
// deliberate, hard-to-reach function, not something any other service
// calls incidentally.
// ============================================================

export async function resetAllUserData() {
  const { error } = await supabase.rpc('reset_all_user_data');
  if (error) throw error;
}
