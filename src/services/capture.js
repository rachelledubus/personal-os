import { supabase } from '../lib/supabaseClient.js';
import { addInteraction } from './interactions.js';
import { addBacklogIdea } from './backlog.js';

// ============================================================
// UNIVERSAL CAPTURE INBOX
// Capture first, organize later. This is a HOLDING PEN — resolving an
// item writes into the real system of record (tasks, notes, contacts,
// content_items, maintenance_items) and marks the capture row
// resolved. The inbox is never itself a second copy of that data.
// ============================================================

async function getUserId() {
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id;
}

export async function quickCapture(rawText, capture_type = null) {
  const userId = await getUserId();
  const { data, error } = await supabase
    .from('capture_items')
    .insert({ user_id: userId, raw_text: rawText.trim(), capture_type })
    .select().single();
  if (error) throw error;
  return data;
}

export async function listUnsorted() {
  const userId = await getUserId();
  const { data, error } = await supabase
    .from('capture_items').select('*')
    .eq('user_id', userId).eq('status', 'unsorted')
    .order('created_at', { ascending: true }); // oldest first — nothing quietly ages out of view
  if (error) throw error;
  return data;
}

export async function archiveCapture(id) {
  const { error } = await supabase.from('capture_items').update({ status: 'archived' }).eq('id', id);
  if (error) throw error;
}

// ---------- AI suggestion (optional — degrades gracefully) ----------
// Calls a Netlify serverless function (see netlify/functions/classify-capture.js)
// that holds the actual Anthropic API key server-side. If that
// function isn't deployed/configured yet, this fails quietly and the
// item just stays fully manually-triageable — capture and organizing
// never depend on the AI step working.
export async function requestSuggestion(item) {
  try {
    const res = await fetch('/.netlify/functions/classify-capture', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: item.raw_text }),
    });
    if (!res.ok) return null;
    const suggestion = await res.json();

    const { error } = await supabase.from('capture_items').update({
      suggested_type: suggestion.type || null,
      suggested_category: suggestion.category || null,
      suggested_system: suggestion.system || null,
      suggestion_reasoning: suggestion.reasoning || null,
      suggested_at: new Date().toISOString(),
    }).eq('id', item.id);
    if (error) throw error;

    return suggestion;
  } catch {
    return null; // no function deployed yet, or offline — fine, manual triage still works
  }
}

// ---------- Resolution: capture_item -> real system of record ----------

async function markResolved(itemId, table, id) {
  await supabase.from('capture_items').update({
    status: 'organized', resolved_to_table: table, resolved_to_id: id, resolved_at: new Date().toISOString(),
  }).eq('id', itemId);
}

/** Task (and by extension: purchases — a task with capture_type
 *  'purchase' rather than a whole separate purchases table). */
export async function resolveToTask(item, fields = {}) {
  const userId = await getUserId();
  const { data, error } = await supabase.from('tasks').insert({
    user_id: userId,
    title: fields.title || item.raw_text,
    capture_type: item.capture_type || 'task',
    priority: fields.priority || 'Medium',
    due_date: fields.due_date || null,
    project_id: fields.project_id || null,
    goal_id: fields.goal_id || null,
    estimated_minutes: fields.estimated_minutes || null,
    energy_type: fields.energy_type || null,
    completed: false,
  }).select().single();
  if (error) throw error;
  await markResolved(item.id, 'tasks', data.id);
  return data;
}

/** Note / research — reuses the existing flat notes table, now
 *  optionally attached to a project or goal. */
export async function resolveToNote(item, fields = {}) {
  const userId = await getUserId();
  const { data, error } = await supabase.from('notes').insert({
    user_id: userId,
    content: fields.content || item.raw_text,
    project_id: fields.project_id || null,
    goal_id: fields.goal_id || null,
  }).select().single();
  if (error) throw error;
  await markResolved(item.id, 'notes', data.id);
  return data;
}

/** Content idea — the existing content_items table (Content Engine). */
/** Content idea — lands in the real Content Engine pipeline
 *  (content_pieces) as a fresh idea, same as a buyer question but
 *  without a specific question attached. */
export async function resolveToContentIdea(item, fields = {}) {
  const userId = await getUserId();
  const { data, error } = await supabase.from('content_pieces').insert({
    user_id: userId,
    title: fields.title || item.raw_text,
    audience: fields.audience || null,
    funnel_stage: fields.funnel_stage || 'Awareness',
    status: 'idea',
  }).select().single();
  if (error) throw error;
  await markResolved(item.id, 'content_pieces', data.id);
  return data;
}

/** Legacy path — content_items still powers the Today item list's
 *  content nudge, so this stays available even though new captures
 *  default to the real pipeline above. */
export async function resolveToContentItem(item, fields = {}) {
  const userId = await getUserId();
  const { data, error } = await supabase.from('content_items').insert({
    user_id: userId,
    name: fields.name || item.raw_text,
    archived: false,
  }).select().single();
  if (error) throw error;
  await markResolved(item.id, 'content_items', data.id);
  return data;
}

/** Buyer question — resolves straight into the real Content Engine
 *  pipeline (content_pieces), pre-filled as the buyer_question field
 *  on a new idea. This is the actual "Buyer Question Bank" the
 *  manual keeps referencing — it just never had anywhere to land. */
export async function resolveToBuyerQuestion(item, fields = {}) {
  const userId = await getUserId();
  const { data, error } = await supabase.from('content_pieces').insert({
    user_id: userId,
    title: fields.title || item.raw_text,
    buyer_question: item.raw_text,
    audience: fields.audience || null,
    funnel_stage: fields.funnel_stage || 'Awareness',
    status: 'idea',
  }).select().single();
  if (error) throw error;
  await markResolved(item.id, 'content_pieces', data.id);
  return data;
}

/** Opportunity / relationship — the existing CRM. Creates a new
 *  contact, or attaches a follow-up date to an existing one if
 *  contactId is passed (e.g. "Contact local coffee shop about
 *  partnership" -> new contact, category Partnership, next_action set). */
function defaultFollowUpDate(daysOut = 7) {
  const d = new Date();
  d.setDate(d.getDate() + daysOut);
  return d.toISOString().slice(0, 10);
}

export async function resolveToContact(item, fields = {}, contactId = null) {
  const userId = await getUserId();
  if (contactId) {
    const { error } = await supabase.from('contacts').update({
      next_action: fields.next_action || item.raw_text,
      next_follow_up_date: fields.next_follow_up_date || defaultFollowUpDate(),
    }).eq('id', contactId);
    if (error) throw error;
    await addInteraction(contactId, { type: 'note', notes: item.raw_text });
    await markResolved(item.id, 'contacts', contactId);
    return { id: contactId };
  }
  const { data, error } = await supabase.from('contacts').insert({
    user_id: userId,
    name: fields.name || item.raw_text,
    category: fields.category || 'Partnership',
    next_action: fields.next_action || item.raw_text,
    next_follow_up_date: fields.next_follow_up_date || null,
  }).select().single();
  if (error) throw error;
  await markResolved(item.id, 'contacts', data.id);
  return data;
}

/** Backlog idea — the actual missing sixth resolution path.
 *  backlog.js/product_backlog_ideas already existed and was already
 *  wired to Library -> Backlog; quick capture just never had a way
 *  to land there. */
export async function resolveToBacklogIdea(item, fields = {}) {
  const data = await addBacklogIdea(fields.idea || item.raw_text, fields.category || null);
  await markResolved(item.id, 'product_backlog_ideas', data.id);
  return data;
}

/** Reminder (renewals, appointments, maintenance) — the new
 *  maintenance_items table, not a duplicate task list. */
export async function resolveToMaintenance(item, fields = {}) {
  const userId = await getUserId();
  const { data, error } = await supabase.from('maintenance_items').insert({
    user_id: userId,
    title: fields.title || item.raw_text,
    area: fields.area || 'other',
    interval_days: fields.interval_days || null,
    next_due_date: fields.next_due_date || null,
    reminder_lead_days: fields.reminder_lead_days ?? 3,
  }).select().single();
  if (error) throw error;
  await markResolved(item.id, 'maintenance_items', data.id);
  return data;
}