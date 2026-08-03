import { supabase } from '../lib/supabaseClient.js';
import { mondayOfWeek } from '../utils/date.js';

async function getUserId() {
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id;
}

export const ACTIVITY_TYPES = [
  { key: 'conversation', label: 'Conversation' },
  { key: 'partner_touch', label: 'Partner Touch' },
  { key: 'content_published', label: 'Content Published' },
  { key: 'follow_up', label: 'Follow-up' },
];

/** The one-tap log — default case writes nothing but type + timestamp.
 *  Every other field is genuinely optional, matching the spec: "no
 *  touch requires opening a full edit form to be recorded." */
export async function logActivity(type, { channel, relatedContactId, relatedLeadId, notes } = {}) {
  const userId = await getUserId();
  const { error } = await supabase.from('business_activity_log').insert({
    user_id: userId, type, channel: channel || 'unspecified',
    related_contact_id: relatedContactId || null, related_lead_id: relatedLeadId || null, notes: notes || null,
  });
  if (error) throw error;
}

/** Monday-Sunday rollup, grouped by type — feeds both the Scorecard
 *  strip and the Weekly Review's auto-populated Activity Review.
 *  Zeros come back as real zeros, never omitted — "even zeros are
 *  data," per spec, not something to hide or reshape. */
export async function getWeeklyScorecard() {
  const userId = await getUserId();
  const monday = mondayOfWeek();
  const mondayDate = new Date(monday + 'T00:00:00');
  const sunday = new Date(mondayDate);
  sunday.setDate(sunday.getDate() + 7);

  const { data, error } = await supabase.from('business_activity_log')
    .select('type').eq('user_id', userId)
    .gte('timestamp', mondayDate.toISOString()).lt('timestamp', sunday.toISOString());
  if (error) throw error;

  const counts = { conversation: 0, partner_touch: 0, content_published: 0, follow_up: 0 };
  (data || []).forEach(row => { if (counts[row.type] !== undefined) counts[row.type] += 1; });
  return counts;
}
