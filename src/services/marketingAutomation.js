import { supabase } from '../lib/supabaseClient.js';

async function getUserId() {
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id;
}

// ---------- Email Templates ----------

export async function listEmailTemplates() {
  const userId = await getUserId();
  const { data, error } = await supabase.from('email_templates').select('*').eq('user_id', userId).order('name');
  if (error) throw error;
  return data || [];
}

export async function addEmailTemplate(fields) {
  const userId = await getUserId();
  const { data, error } = await supabase.from('email_templates').insert({ ...fields, user_id: userId }).select().single();
  if (error) throw error;
  return data;
}

export async function updateEmailTemplate(id, fields) {
  const { error } = await supabase.from('email_templates').update(fields).eq('id', id);
  if (error) throw error;
}

export async function deleteEmailTemplate(id) {
  const { error } = await supabase.from('email_templates').delete().eq('id', id);
  if (error) throw error;
}

// ---------- Automations ----------

export async function listAutomations() {
  const userId = await getUserId();
  const { data, error } = await supabase.from('automations').select('*, automation_steps(*, email_templates(name, subject))')
    .eq('user_id', userId).order('created_at');
  if (error) throw error;
  return (data || []).map(a => ({ ...a, automation_steps: (a.automation_steps || []).sort((x, y) => x.step_order - y.step_order) }));
}

export async function addAutomation(name, description = null) {
  const userId = await getUserId();
  const { data, error } = await supabase.from('automations').insert({ user_id: userId, name, description }).select().single();
  if (error) throw error;
  return data;
}

export async function updateAutomation(id, fields) {
  const { error } = await supabase.from('automations').update(fields).eq('id', id);
  if (error) throw error;
}

export async function deleteAutomation(id) {
  const { error } = await supabase.from('automations').delete().eq('id', id);
  if (error) throw error;
}

// ---------- Automation Steps ----------
// step_order is always recomputed from array position on save, so
// callers never have to manage the numbering by hand — matches the
// "simple list editor: add Email, Wait" framing, where reordering is
// just reordering a list.

export async function saveAutomationSteps(automationId, steps) {
  await supabase.from('automation_steps').delete().eq('automation_id', automationId);
  if (steps.length === 0) return;
  const rows = steps.map((s, i) => ({
    automation_id: automationId, step_order: i, delay_days: s.delay_days, template_id: s.template_id,
  }));
  const { error } = await supabase.from('automation_steps').insert(rows);
  if (error) throw error;
}

// ---------- Enrollments (read/manage from the app side) ----------

export async function listEnrollments(automationId = null) {
  const userId = await getUserId();
  let query = supabase.from('automation_enrollments')
    .select('*, contacts(name, email), automations(name)').eq('user_id', userId).order('enrolled_at', { ascending: false });
  if (automationId) query = query.eq('automation_id', automationId);
  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function cancelEnrollment(id) {
  const { error } = await supabase.from('automation_enrollments').update({ status: 'cancelled' }).eq('id', id);
  if (error) throw error;
}

/** Manual enroll from inside the app — the same path the public form
 *  endpoint uses, just callable for an existing contact you're
 *  already looking at. */
export async function enrollContact(contactId, automationId) {
  const userId = await getUserId();
  const { data: firstStep } = await supabase.from('automation_steps').select('delay_days')
    .eq('automation_id', automationId).eq('step_order', 0).maybeSingle();
  const nextSend = new Date();
  nextSend.setDate(nextSend.getDate() + (firstStep?.delay_days || 0));
  const { error } = await supabase.from('automation_enrollments').insert({
    user_id: userId, contact_id: contactId, automation_id: automationId,
    current_step: 0, next_send: nextSend.toISOString(), status: 'active',
  });
  if (error) throw error;
}
