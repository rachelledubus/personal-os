import { getPreference, setPreference } from './settings.js';

// ============================================================
// FOLLOW-UP STANDARDS — expected contact cadence per contact type.
// "Both, plus status changes": these standards actively suggest a
// next_follow_up_date on new contacts, and feed computeStatus() so a
// contact with no date but no recent contact still reads as Overdue
// instead of silently falling through the cracks.
// ============================================================

export const FOLLOWUP_STANDARD_TYPES = [
  { key: 'new_inquiry', label: 'New inquiry', appliesTo: 'Lead — no stage yet, or "New Lead"' },
  { key: 'active_buyer_lead', label: 'Active buyer lead', appliesTo: 'Lead — past "New Lead" stage' },
  { key: 'future_buyer', label: 'Future buyer', appliesTo: 'Future Client' },
  { key: 'active_client', label: 'Active client', appliesTo: 'Active Client' },
  { key: 'sphere', label: 'Sphere', appliesTo: 'Sphere' },
  { key: 'partner', label: 'Partner', appliesTo: 'Partner, Agent Referral' },
  { key: 'past_client', label: 'Past client', appliesTo: 'Past Client' },
];

const DEFAULT_CADENCE_DAYS = {
  new_inquiry: 1,
  active_buyer_lead: 3,
  future_buyer: 14,
  active_client: 7,
  sphere: 90,
  partner: 90,
  past_client: 180,
};

export async function getCadenceStandards() {
  const stored = await getPreference('followup_standards', 'cadence_days');
  return { ...DEFAULT_CADENCE_DAYS, ...(stored || {}) };
}

export async function setCadenceStandards(standards) {
  await setPreference('followup_standards', 'cadence_days', standards);
}

/** Which standard applies to a given contact — Lead is split into two
 *  standards by lead_stage since "new inquiry" and "active buyer lead"
 *  are meaningfully different cadences on the same category. */
export function standardKeyForContact(contact) {
  switch (contact.category) {
    case 'Lead':
      return (!contact.lead_stage || contact.lead_stage === 'New Lead') ? 'new_inquiry' : 'active_buyer_lead';
    case 'Future Client': return 'future_buyer';
    case 'Active Client': return 'active_client';
    case 'Sphere': return 'sphere';
    case 'Partner':
    case 'Agent Referral': return 'partner';
    case 'Past Client': return 'past_client';
    default: return null;
  }
}