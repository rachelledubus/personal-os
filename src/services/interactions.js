import { supabase } from '../lib/supabaseClient.js';
import { logActivity } from './goals.js';

// ============================================================
// INTERACTIONS — the real system of record for relationship activity.
// contacts.relationship_notes and .last_contact_date stay in sync
// automatically from here, so the 3 existing consumers of those fields
// (flows.js AI context, capture.js quick-notes, draft-followup.js AI
// prompt) keep working unchanged. New code should read/write through
// here, not the flat fields directly.
// ============================================================

const TYPE_LABELS = { call: 'Call', text: 'Text', email: 'Email', meeting: 'Meeting', note: 'Note' };

export function typeLabel(type) {
  return TYPE_LABELS[type] || 'Note';
}

async function getUserId() {
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id;
}

export async function listInteractions(contactId) {
  const { data, error } = await supabase.from('interactions').select('*')
    .eq('contact_id', contactId).order('occurred_at', { ascending: false }).order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

/** The one real entry point for logging relationship activity. Writes
 *  the structured row, then keeps contacts.relationship_notes and
 *  .last_contact_date in sync so nothing that already reads those
 *  fields needs to change. */
export async function addInteraction(contactId, { type = 'note', notes = '', occurred_at } = {}) {
  const userId = await getUserId();
  const date = occurred_at || new Date().toISOString().slice(0, 10);

  const { data: row, error } = await supabase.from('interactions')
    .insert({ user_id: userId, contact_id: contactId, type, notes, occurred_at: date })
    .select().single();
  if (error) throw error;

  // Keep the legacy fields in sync — append, never overwrite, so older
  // history logged before this migration (or by flows that haven't
  // been updated yet) is never destroyed.
  const { data: contact } = await supabase.from('contacts')
    .select('relationship_notes, last_contact_date').eq('id', contactId).single();
  const summaryLine = `[${date}] ${typeLabel(type)}: ${notes}`;
  const nextNotes = contact?.relationship_notes ? `${contact.relationship_notes}\n${summaryLine}` : summaryLine;
  const nextLastContact = (!contact?.last_contact_date || date >= contact.last_contact_date) ? date : contact.last_contact_date;

  await supabase.from('contacts').update({
    relationship_notes: nextNotes,
    last_contact_date: nextLastContact,
  }).eq('id', contactId);

  // Best-effort event log — never let this block a real interaction save.
  try { await logActivity('interactions', row.id, 'interaction_logged', { contact_id: contactId, type }); } catch { /* non-critical */ }

  return row;
}

export async function deleteInteraction(id) {
  const { error } = await supabase.from('interactions').delete().eq('id', id);
  if (error) throw error;
}
