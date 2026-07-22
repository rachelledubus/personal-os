import { supabase } from '../lib/supabaseClient.js';

// ============================================================
// SITE-WIDE DEVELOPMENT MEMORY
// Honest framing (see migration comment): entries about IN-APP changes
// (a setting saved, a category renamed) get logged automatically by
// the functions below, called from the settings UI itself. Entries
// about CODE changes get added by convention — Claude logs one at the
// end of a session with real changes, the same discipline the old
// WHERE_WE_LEFT_OFF.md file used, just living in the app now.
// ============================================================

async function getUserId() {
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id;
}

export async function listDevLog(limit = 50) {
  const userId = await getUserId();
  const { data, error } = await supabase.from('dev_log').select('*')
    .eq('user_id', userId).order('logged_at', { ascending: false }).limit(limit);
  if (error) throw error;
  return data;
}

export async function addDevLogEntry(entryType, summary, detail = null) {
  const userId = await getUserId();
  await supabase.from('dev_log').insert({ user_id: userId, entry_type: entryType, summary, detail });
}

export async function listDecisions(limit = 50) {
  const userId = await getUserId();
  const { data, error } = await supabase.from('decisions_log').select('*')
    .eq('user_id', userId).order('logged_at', { ascending: false }).limit(limit);
  if (error) throw error;
  return data;
}

export async function addDecision(whatChanged, why = null) {
  const userId = await getUserId();
  await supabase.from('decisions_log').insert({ user_id: userId, what_changed: whatChanged, why });
}

/** Live system status — real counts pulled from real tables, not a
 *  cached summary that goes stale. */
export async function getSystemStatus() {
  const userId = await getUserId();
  const counts = await Promise.all([
    supabase.from('contacts').select('id', { count: 'exact', head: true }).eq('user_id', userId),
    supabase.from('content_pieces').select('id', { count: 'exact', head: true }).eq('user_id', userId),
    supabase.from('tasks').select('id', { count: 'exact', head: true }).eq('user_id', userId).eq('completed', false),
    supabase.from('product_backlog_ideas').select('id', { count: 'exact', head: true }).eq('user_id', userId),
    supabase.from('transactions').select('id', { count: 'exact', head: true }).eq('user_id', userId),
  ]);
  return {
    contacts: counts[0].count || 0,
    contentPieces: counts[1].count || 0,
    openTasks: counts[2].count || 0,
    backlogIdeas: counts[3].count || 0,
    closingsLogged: counts[4].count || 0,
  };
}

/** Generates a fresh AI_HANDOFF document from live data — recent
 *  changelog, open decisions, backlog, and system status — instead of
 *  a static file that only reflects the day it was written. */
export async function generateHandoff() {
  const [devLog, decisions, backlogResult, status] = await Promise.all([
    listDevLog(15),
    listDecisions(10),
    supabase.from('product_backlog_ideas').select('idea, category'),
    getSystemStatus(),
  ]);
  const backlog = backlogResult.data || [];

  let out = `# AI Handoff — generated ${new Date().toLocaleString()}\n\n`;
  out += `## System status\n`;
  out += `- ${status.contacts} contacts in Pipeline\n- ${status.contentPieces} content pieces\n- ${status.openTasks} open tasks\n- ${status.backlogIdeas} backlog ideas\n- ${status.closingsLogged} closings logged\n\n`;

  out += `## Recent changes (dev log)\n`;
  if (devLog.length === 0) out += `_No entries logged yet._\n`;
  devLog.forEach(d => { out += `- [${d.entry_type}] ${d.summary}${d.detail ? ` — ${d.detail}` : ''}\n`; });

  out += `\n## Recorded decisions\n`;
  if (decisions.length === 0) out += `_No decisions recorded yet._\n`;
  decisions.forEach(d => { out += `- ${d.what_changed}${d.why ? ` — ${d.why}` : ''}\n`; });

  out += `\n## Open backlog\n`;
  if (backlog.length === 0) out += `_Backlog is empty._\n`;
  backlog.forEach(b => { out += `- [${b.category || 'Uncategorized'}] ${b.idea}\n`; });

  out += `\nPaste this into a new conversation with Claude to continue development with current context.`;
  return out;
}
