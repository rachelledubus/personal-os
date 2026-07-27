import { supabase } from '../lib/supabaseClient.js';

async function getUserId() {
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id;
}

/** Per System 06 — three output shapes, kept as jsonb content since
 *  each genuinely has different fields, not sparse columns on one
 *  wide table.
 *  intelligence_report: { whatChanged, whyItMatters, buyersShouldKnow, sellersShouldKnow, localUpdate }
 *  talking_points: { clientConcern, whatsActuallyHappening, simpleExplanation, recommendation }
 *  content_opportunity: { findingSummary, contentTopic, audience, cta } */
export const OUTPUT_TYPE_LABELS = {
  intelligence_report: 'Monthly Intelligence Report',
  talking_points: 'Client Talking Points',
  content_opportunity: 'Content Opportunity',
};

export const OUTPUT_TYPE_FIELDS = {
  intelligence_report: [
    { key: 'whatChanged', label: 'What changed' },
    { key: 'whyItMatters', label: 'Why it matters' },
    { key: 'buyersShouldKnow', label: 'What buyers should know' },
    { key: 'sellersShouldKnow', label: 'What sellers should know' },
    { key: 'localUpdate', label: 'Local update' },
  ],
  talking_points: [
    { key: 'clientConcern', label: 'Client concern' },
    { key: 'whatsActuallyHappening', label: "What's actually happening" },
    { key: 'simpleExplanation', label: 'Simple explanation' },
    { key: 'recommendation', label: 'Recommendation' },
  ],
  content_opportunity: [
    { key: 'findingSummary', label: 'Research finding' },
    { key: 'contentTopic', label: 'Content topic' },
    { key: 'audience', label: 'Audience' },
    { key: 'cta', label: 'CTA' },
  ],
};

export async function listResearchOutputs(outputType) {
  const userId = await getUserId();
  let query = supabase.from('research_outputs').select('*').eq('user_id', userId).order('created_at', { ascending: false });
  if (outputType) query = query.eq('output_type', outputType);
  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function addResearchOutput(outputType, title, content) {
  const userId = await getUserId();
  const { error } = await supabase.from('research_outputs').insert({ user_id: userId, output_type: outputType, title, content });
  if (error) throw error;
}

export async function deleteResearchOutput(id) {
  const { error } = await supabase.from('research_outputs').delete().eq('id', id);
  if (error) throw error;
}
