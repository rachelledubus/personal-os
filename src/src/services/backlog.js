import { supabase } from '../lib/supabaseClient.js';

// ============================================================
// PRODUCT BACKLOG (Future Improvements Workspace)
// A running backlog for ideas about the Personal OS software itself —
// distinct from future_roadmap_ideas, which is BUSINESS strategy
// ideas deferred per Decision Rule 4. Different domain, same job:
// don't lose an idea because there was nowhere to put it.
// ============================================================

async function getUserId() {
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id;
}

export async function listBacklogIdeas(search = '') {
  const userId = await getUserId();
  const { data, error } = await supabase.from('product_backlog_ideas').select('*')
    .eq('user_id', userId).order('created_at', { ascending: false });
  if (error) throw error;
  if (!search) return data;
  return data.filter(i => (i.idea + (i.category || '')).toLowerCase().includes(search.toLowerCase()));
}

export async function addBacklogIdea(idea, category = null) {
  const userId = await getUserId();
  const { error } = await supabase.from('product_backlog_ideas').insert({ user_id: userId, idea, category });
  if (error) throw error;
}

export async function updateBacklogIdea(id, fields) {
  const { error } = await supabase.from('product_backlog_ideas').update(fields).eq('id', id);
  if (error) throw error;
}

export async function deleteBacklogIdea(id) {
  const { error } = await supabase.from('product_backlog_ideas').delete().eq('id', id);
  if (error) throw error;
}

/** Formats the whole backlog as one copy-pasteable prompt — the exact
 *  "copy into one comprehensive prompt for a future dev session"
 *  workflow, done for you instead of manually assembling it. */
export function formatBacklogAsPrompt(ideas) {
  if (ideas.length === 0) return '';
  const byCategory = {};
  ideas.forEach(i => { (byCategory[i.category || 'Uncategorized'] ||= []).push(i.idea); });

  let out = 'Here is the current backlog of improvement ideas for the Personal OS System:\n\n';
  Object.entries(byCategory).forEach(([cat, items]) => {
    out += `## ${cat}\n`;
    items.forEach(idea => { out += `- ${idea}\n`; });
    out += '\n';
  });
  out += 'Please review these and help me plan the next development sprint.';
  return out;
}
