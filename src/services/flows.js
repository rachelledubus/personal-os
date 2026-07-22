import { supabase } from '../lib/supabaseClient.js';
import { addContact, updateContact } from './contacts.js';
import { addInteraction } from './interactions.js';

async function getUserId() {
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id;
}

// ============================================================
// Guided Flow definitions. Each step is a small form; "Next"
// autosaves that step's answers into guided_flow_runs.answers (jsonb)
// and advances current_step. On the final step, onComplete() applies
// the accumulated answers to the real table (usually contacts) so
// the SOP's outcome — not just its process — is captured.
// ============================================================

export const FLOWS = {
  new_lead_intake: {
    label: 'New Lead Intake',
    description: 'Capture a new contact the same way, every time.',
    steps: [
      { key: 'basics', title: 'Who is this?', fields: ['name', 'phone', 'email', 'source'] },
      { key: 'category', title: 'Categorize + timeline', fields: ['category', 'timeline'] },
      { key: 'profile', title: 'Buyer profile', fields: ['buyer_seller', 'persona', 'location_interest'] },
      { key: 'next_step', title: 'Assign a next action', fields: ['next_action', 'next_follow_up_date'] },
    ],
    async onComplete(answers) {
      return addContact({
        name: answers.name, phone: answers.phone, email: answers.email,
        source: answers.source, category: answers.category || 'Lead',
        timeline: answers.timeline, buyer_seller: answers.buyer_seller,
        persona: answers.persona, location_interest: answers.location_interest,
        next_action: answers.next_action, next_follow_up_date: answers.next_follow_up_date,
      });
    },
  },

  consultation: {
    label: 'Consultation',
    description: 'Run every buyer/relocation consultation the same way.',
    steps: [
      { key: 'situation', title: 'Situation & timeline', fields: ['situation_notes', 'timeline'] },
      { key: 'lifestyle', title: 'Lifestyle priorities', fields: ['lifestyle_notes'] },
      { key: 'financial', title: 'Financial reality', fields: ['comfortable_payment', 'budget_notes'] },
      { key: 'decision', title: 'Must-haves & deal-breakers', fields: ['must_haves', 'deal_breakers'] },
      { key: 'close', title: 'Summary & next step', fields: ['next_action', 'next_follow_up_date'] },
    ],
    async onComplete(answers, contactId) {
      if (!contactId) return;
      const combinedNotes = [answers.situation_notes, answers.lifestyle_notes, answers.budget_notes]
        .filter(Boolean).join('\n\n');
      if (combinedNotes) {
        await addInteraction(contactId, { type: 'meeting', notes: combinedNotes });
      }
      return updateContact(contactId, {
        next_action: answers.next_action,
        next_follow_up_date: answers.next_follow_up_date,
      });
    },
  },

  phone_boundaries: {
    label: 'Missed Call Follow-Up',
    description: 'Text back an unrecognized call, per your boundaries SOP.',
    steps: [
      { key: 'who', title: 'Who called?', fields: ['name', 'phone'] },
      { key: 'reply', title: 'Send the text-back script', fields: ['note'] },
    ],
    async onComplete(answers) {
      const contact = await addContact({
        name: answers.name || 'Unknown caller', phone: answers.phone,
        category: 'Lead', source: 'Missed call',
      });
      if (answers.note && contact?.id) {
        await addInteraction(contact.id, { type: 'text', notes: answers.note });
      }
      return contact;
    },
  },

  content_creation: {
    label: 'Content Creation',
    description: 'Same five steps every time you sit down to create.',
    steps: [
      { key: 'question', title: 'Pull a real question', fields: ['question'] },
      { key: 'brief', title: 'Build the brief', fields: ['audience', 'goal', 'trade_off', 'cta'] },
      { key: 'draft', title: 'Draft', fields: ['draft_notes'] },
      { key: 'checklist', title: 'Quality check', fields: ['fact_checked'] },
    ],
    async onComplete() {
      return null; // publishing itself happens in the Content module
    },
  },
};

export async function startFlow(flowKey, contactId = null) {
  const userId = await getUserId();
  const { data, error } = await supabase.from('guided_flow_runs').insert({
    user_id: userId, flow_key: flowKey, contact_id: contactId, current_step: 0, answers: {},
  }).select().single();
  if (error) throw error;
  return data;
}

export async function getActiveFlowRun(flowKey) {
  const userId = await getUserId();
  const { data } = await supabase.from('guided_flow_runs').select('*')
    .eq('user_id', userId).eq('flow_key', flowKey).eq('completed', false)
    .order('started_at', { ascending: false }).limit(1).maybeSingle();
  return data;
}

export async function saveFlowStep(runId, stepAnswers, nextStep) {
  const { data: run } = await supabase.from('guided_flow_runs').select('answers').eq('id', runId).single();
  const merged = { ...(run?.answers || {}), ...stepAnswers };
  const { error } = await supabase.from('guided_flow_runs')
    .update({ answers: merged, current_step: nextStep }).eq('id', runId);
  if (error) throw error;
  return merged;
}

export async function completeFlow(runId, flowKey, contactId) {
  const { data: run } = await supabase.from('guided_flow_runs').select('*').eq('id', runId).single();
  const flow = FLOWS[flowKey];
  const result = await flow.onComplete(run.answers, contactId);
  await supabase.from('guided_flow_runs')
    .update({ completed: true, completed_at: new Date().toISOString() }).eq('id', runId);
  return result;
}
