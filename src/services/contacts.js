import { supabase } from '../lib/supabaseClient.js';
import { getCustomAiInstructions } from './settings.js';
import { getCadenceStandards, standardKeyForContact } from './followupStandards.js';

// ============================================================
// CRM — rebuilt to match System_07_CRM_Database.xlsx field-for-field.
// This is the real source of truth now, not a thinner copy of it.
// Status and days-until-follow-up are computed here, not stored —
// they're derived from next_follow_up_date, so they're never stale
// the way a manually-typed spreadsheet column would be.
// ============================================================

async function getUserId() {
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id;
}

/** Mirrors the spreadsheet's Status column: On Track / Due Soon /
 *  Overdue / No Next Action / No Date Set — plus one real change:
 *  "Both, plus status changes" per the follow-up standards decision.
 *  A contact with an explicit next_follow_up_date is judged against
 *  that date exactly as before — unchanged. A contact with NO date
 *  used to read as "No Next Action"/"No Date Set" forever, even after
 *  months of silence. Now, if there's no explicit date, it's checked
 *  against its category's cadence standard (see followupStandards.js)
 *  first — measured from last contact, or creation if never
 *  contacted — and only falls through to the old labels if it's still
 *  within that window. That's what catches a Sphere contact nobody's
 *  touched in 200 days instead of it staying silently invisible. */
export function computeStatus(contact, cadenceDays = {}) {
  // Cadence check always applies, regardless of whether an explicit
  // date is set — this is the actual fix. A next_follow_up_date that
  // was auto-set once (e.g. at creation) and never acted on shouldn't
  // be able to mask a relationship that's gone genuinely stale by
  // last_contact_date. Overdue-by-neglect always wins.
  const standardKey = standardKeyForContact(contact);
  const cadence = standardKey ? cadenceDays[standardKey] : null;
  const anchor = contact.last_contact_date || contact.created_at;
  if (cadence != null && anchor && daysSince(anchor) > cadence) return 'Overdue';

  const explicitDate = contact.next_follow_up_date;
  if (!contact.next_action) return 'No Next Action';
  if (!explicitDate) return 'No Date Set';
  const days = daysUntil(explicitDate);
  if (days < 0) return 'Overdue';
  if (days <= 3) return 'Due Soon';
  return 'On Track';
}

export function daysUntil(dateStr) {
  if (!dateStr) return null;
  const diffMs = new Date(dateStr) - new Date(new Date().toISOString().slice(0, 10));
  return Math.round(diffMs / 86400000);
}

/** Days elapsed since a past date (created_at, last_contact_date) —
 *  the mirror of daysUntil, which is future-facing. */
export function daysSince(dateStr) {
  if (!dateStr) return null;
  const diffMs = new Date(new Date().toISOString().slice(0, 10)) - new Date(String(dateStr).slice(0, 10));
  return Math.round(diffMs / 86400000);
}

export async function listContacts(category = null) {
  const userId = await getUserId();
  const cadence = await getCadenceStandards();
  let query = supabase.from('contacts').select('*').eq('user_id', userId)
    .order('next_follow_up_date', { ascending: true, nullsFirst: false });
  if (category) query = query.eq('category', category);
  const { data, error } = await query;
  if (error) throw error;
  return (data || []).map(c => ({ ...c, status: computeStatus(c, cadence), daysUntilFollowup: daysUntil(c.next_follow_up_date) }));
}

/** Filtered by relationship tier — this is what replaces having
 *  separate Sphere/Community/Professional Network pages. Same table,
 *  same contact, just a different lens on it. */
export async function listByTier(tier) {
  const userId = await getUserId();
  const cadence = await getCadenceStandards();
  const { data, error } = await supabase.from('contacts').select('*')
    .eq('user_id', userId).eq('relationship_tier', tier)
    .order('next_follow_up_date', { ascending: true, nullsFirst: false });
  if (error) throw error;
  return (data || []).map(c => ({ ...c, status: computeStatus(c, cadence), daysUntilFollowup: daysUntil(c.next_follow_up_date) }));
}

export async function listOverdue() {
  const userId = await getUserId();
  const today = new Date().toISOString().slice(0, 10);
  const { data, error } = await supabase.from('contacts').select('*')
    .eq('user_id', userId).lt('next_follow_up_date', today).not('next_follow_up_date', 'is', null);
  if (error) throw error;
  return data || [];
}

/** The complete picture, not just contacts with an explicit overdue
 *  date — includes anyone flagged Overdue purely by cadence (no date
 *  ever set, but past their category's standard). This is what the
 *  Today nudge count and the Business Dashboard's overdue list both
 *  need to agree on, so "click through to see specifics" actually
 *  shows everyone the nudge counted. */
export async function listOverdueContacts() {
  const contacts = await listContacts();
  return contacts.filter(c => c.status === 'Overdue');
}

export async function countOverdue() {
  return (await listOverdueContacts()).length;
}

export async function getContact(id) {
  const cadence = await getCadenceStandards();
  const { data, error } = await supabase.from('contacts').select('*').eq('id', id).single();
  if (error) throw error;
  return { ...data, status: computeStatus(data, cadence), daysUntilFollowup: daysUntil(data.next_follow_up_date) };
}

/** "Active" half of the follow-up standards decision: if the caller
 *  didn't set a next_follow_up_date, suggest one from the contact's
 *  cadence standard so you don't have to calculate it yourself. Never
 *  overrides a date you did set. */
export async function addContact(fields) {
  const userId = await getUserId();
  let toInsert = { ...fields };
  if (!toInsert.next_follow_up_date) {
    const standardKey = standardKeyForContact(toInsert);
    if (standardKey) {
      const cadence = await getCadenceStandards();
      const days = cadence[standardKey];
      if (days != null) {
        const suggested = new Date();
        suggested.setDate(suggested.getDate() + days);
        toInsert.next_follow_up_date = suggested.toISOString().slice(0, 10);
      }
    }
  }
  const { data, error } = await supabase.from('contacts').insert({ ...toInsert, user_id: userId }).select().single();
  if (error) throw error;
  return data;
}

export async function updateContact(id, fields) {
  const { error } = await supabase.from('contacts').update(fields).eq('id', id);
  if (error) throw error;
}

export async function deleteContact(id) {
  const { error } = await supabase.from('contacts').delete().eq('id', id);
  if (error) throw error;
}

export async function searchContactsByName(query) {
  if (!query || query.length < 2) return [];
  const userId = await getUserId();
  const { data, error } = await supabase.from('contacts').select('id, name, category')
    .eq('user_id', userId).ilike('name', `%${query}%`).limit(6);
  if (error) throw error;
  return data;
}

// ---------- Relationship tier: inferred, not manually decided ----------
// Category already tells you most of what tier means — asking for
// both is asking twice for the same signal. This is a default, always
// visible and overridable, never silently forced.
const TIER_DEFAULT_BY_CATEGORY = {
  Sphere: 'Tier 2 - Developing',
  Partner: 'Tier 3 - Strategic',
  'Agent Referral': 'Tier 3 - Strategic',
};

export function inferDefaultTier(category) {
  return TIER_DEFAULT_BY_CATEGORY[category] || null;
}

/** Tags every untiered Sphere/Partner/Agent Referral contact with its
 *  inferred default in one call — the "why am I doing this one at a
 *  time" fix for what used to be a manual per-contact decision. */
export async function autoTagUntieredContacts() {
  const userId = await getUserId();
  const { data, error } = await supabase.from('contacts').select('id, category')
    .eq('user_id', userId).is('relationship_tier', null).in('category', Object.keys(TIER_DEFAULT_BY_CATEGORY));
  if (error) throw error;
  const updates = (data || [])
    .map(c => ({ id: c.id, tier: inferDefaultTier(c.category) }))
    .filter(u => u.tier);
  await Promise.all(updates.map(u => supabase.from('contacts').update({ relationship_tier: u.tier }).eq('id', u.id)));
  return updates.length;
}

/** AI-drafted follow-up from CRM context — A5. Graceful-degrade like
 *  every other AI feature: null if the function isn't configured. */
export async function requestFollowUpDraft(contact) {
  try {
    const customInstructions = await getCustomAiInstructions();
    const res = await fetch('/.netlify/functions/draft-followup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contact, customInstructions }),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

// ---------- Pipeline health — counts, stage breakdown, stalled leads ----------
export async function getPipelineHealth() {
  const userId = await getUserId();
  const cadence = await getCadenceStandards();
  const { data, error } = await supabase.from('contacts')
    .select('category, lead_stage, next_action, next_follow_up_date, last_contact_date, created_at')
    .eq('user_id', userId).in('category', ['Lead', 'Future Client', 'Active Client']);
  if (error) throw error;
  const contacts = (data || []).map(c => ({ ...c, status: computeStatus(c, cadence) }));
  const byCategory = {};
  contacts.forEach(c => { byCategory[c.category] = (byCategory[c.category] || 0) + 1; });
  const byStage = {};
  contacts.filter(c => c.lead_stage).forEach(c => { byStage[c.lead_stage] = (byStage[c.lead_stage] || 0) + 1; });
  return {
    total: contacts.length,
    byCategory,
    byStage,
    stalled: contacts.filter(c => c.status === 'Overdue').length,
  };
}

// ---------- Relationship health — tier breakdown, on-track vs overdue ----------
export async function getRelationshipHealth() {
  const userId = await getUserId();
  const cadence = await getCadenceStandards();
  const { data, error } = await supabase.from('contacts')
    .select('relationship_tier, category, next_action, next_follow_up_date, last_contact_date, created_at')
    .eq('user_id', userId).not('relationship_tier', 'is', null);
  if (error) throw error;
  const contacts = (data || []).map(c => ({ ...c, status: computeStatus(c, cadence) }));
  const byTier = {};
  ['Tier 1 - Core', 'Tier 2 - Developing', 'Tier 3 - Strategic'].forEach(tier => {
    const inTier = contacts.filter(c => c.relationship_tier === tier);
    const overdue = inTier.filter(c => c.status === 'Overdue').length;
    const recencies = inTier.map(c => daysSince(c.last_contact_date)).filter(d => d != null);
    const avgDaysSinceContact = recencies.length ? Math.round(recencies.reduce((a, b) => a + b, 0) / recencies.length) : null;
    byTier[tier] = { total: inTier.length, overdue, avgDaysSinceContact };
  });
  return byTier;
}

// ---------- Database health — the spreadsheet's own Dashboard sheet, computed live ----------
export async function getDatabaseHealth() {
  const userId = await getUserId();
  const { data, error } = await supabase.from('contacts').select('next_action, next_follow_up_date, created_at')
    .eq('user_id', userId);
  if (error) throw error;
  const contacts = data || [];
  const monthAgo = new Date(); monthAgo.setDate(monthAgo.getDate() - 30);
  const newThisMonth = contacts.filter(c => c.created_at && new Date(c.created_at) >= monthAgo).length;
  const withNextAction = contacts.filter(c => c.next_action).length;
  const overdue = contacts.filter(c => c.next_follow_up_date && daysUntil(c.next_follow_up_date) < 0).length;
  return {
    total: contacts.length,
    newThisMonth,
    withNextAction,
    completeness: contacts.length ? Math.round((withNextAction / contacts.length) * 100) : 100,
    overdue,
  };
}
// ============================================================
// EXPIRED/WITHDRAWN LISTING IMPORT — from SW_Broward_Expired_
// Withdrawn_Leads.xlsx, source: handwritten notes 8/25/2026. Every
// row lacks owner contact info (that's the next research step, not
// a gap in the import), so each lands as a Lead with a clear
// placeholder name and full property details in notes, ready to
// fill in as owner info gets researched. Idempotent — checks by
// address in notes, safe to run again without duplicating.
// ============================================================

const EXPIRED_WITHDRAWN_LEADS = [
  { address: '10386 SW 57th Ct', city: 'Cooper City', beds: 4, baths: 3.5, sqft: 4000, listPrice: 1785000, status: 'Withdrawn', statusDetail: null },
  { address: '7161 Farragut St', city: 'Hollywood', beds: 3, baths: 2, sqft: 1467, listPrice: 559900, status: 'Expired then Withdrawn', statusDetail: 'Expired July 2026 at $559.9K; relisted, withdrawn Aug 2026 at $529.9K' },
  { address: '5310 SW 109th Ave', city: 'Davie', beds: 7, baths: 3.5, sqft: 4414, listPrice: 1950000, status: 'Withdrawn', statusDetail: null },
  { address: '12301 Paseo Way', city: 'Cooper City', beds: 3, baths: 2, sqft: 1629, listPrice: 659900, status: 'Cancelled', statusDetail: null },
  { address: '5191 SW 109th Ave', city: 'Davie', beds: 7, baths: 4.5, sqft: 4436, listPrice: 1675000, status: 'Expired', statusDetail: null },
  { address: '1150 N Douglas Rd', city: 'Pembroke', beds: 4, baths: 2, sqft: 1411, listPrice: 755000, status: 'Cancelled', statusDetail: 'Cancelled after 2 weeks (8/14)' },
  { address: '7631 Cavalla Dr', city: 'Davie', beds: 5, baths: 4.5, sqft: 4122, listPrice: 1399000, status: 'Cancelled', statusDetail: null },
  { address: '2560 Bass Way', city: 'Cooper City', beds: 5, baths: 3, sqft: 2586, listPrice: 850000, status: 'Withdrawn', statusDetail: '150 DOM; original price $975K' },
  { address: '5511 SW 114th Ave', city: 'Cooper City', beds: 3, baths: 2, sqft: 1847, listPrice: 659000, status: 'Withdrawn', statusDetail: null },
  { address: '2010 Meadows Dr', city: 'Davie', beds: 5, baths: 5.5, sqft: 3647, listPrice: 2000000, status: 'Expired', statusDetail: '60 DOM' },
  { address: '2638 Oak Park Cir', city: null, beds: null, baths: null, sqft: null, listPrice: null, status: 'Active - watch', statusDetail: 'Changed brokerages once already; keep an eye on' },
  { address: '2905 Begonia Way', city: null, beds: null, baths: null, sqft: null, listPrice: null, status: 'Active - watch', statusDetail: 'On market 150 days; keep an eye on' },
  { address: '10755 SW 17th Pl', city: 'Davie', beds: 4, baths: 2.5, sqft: 2216, listPrice: 689000, status: 'Expired', statusDetail: '164 DOM; price cut from $699,000' },
  { address: '6461 Evans St', city: 'Hollywood', beds: 3, baths: 2, sqft: 1410, listPrice: 545000, status: 'Cancelled', statusDetail: '31 DOM' },
  { address: '8880 NW 7th St', city: 'Pembroke', beds: 5, baths: 3, sqft: 2528, listPrice: 750000, status: 'Withdrawn', statusDetail: '20 DOM' },
  { address: '6629 Sheridan St', city: 'Hollywood', beds: 2, baths: 1, sqft: 744, listPrice: 399900, status: 'Expired', statusDetail: '105 DOM' },
  { address: '1636 SW 108th Ter', city: 'Davie', beds: 4, baths: 2, sqft: 1948, listPrice: 850000, status: 'Cancelled', statusDetail: '263 DOM' },
  { address: '13350 Luray Rd', city: 'SW Ranches', beds: 6, baths: 5, sqft: 4296, listPrice: 2700000, status: 'Expired', statusDetail: '364 DOM' },
  { address: '3711 SW 58th Ave', city: 'Davie', beds: 2, baths: 1, sqft: 854, listPrice: 399000, status: 'Cancelled', statusDetail: '359 DOM; price cut from $439,000' },
  { address: '7511 Taylor St', city: 'Hollywood', beds: 3, baths: 1, sqft: 1360, listPrice: 515900, status: 'Expired', statusDetail: '272 DOM' },
  { address: '6941 Sheridan St', city: 'Hollywood', beds: 4, baths: 3, sqft: 1290, listPrice: 599000, status: 'Expired then Cancelled', statusDetail: 'Price cut from $615,000; expired after 181 DOM, then cancelled after 113 DOM' },
  { address: '10241 Key Plum St', city: 'Plantation', beds: 6, baths: 6, sqft: 4735, listPrice: 2698000, status: 'Expired', statusDetail: '41 DOM' },
  { address: '10627 NW 7th St', city: 'Pembroke Pines', beds: 3, baths: 2, sqft: 1520, listPrice: 597500, status: 'Cancelled', statusDetail: '79 DOM; price cut from $625,000' },
  { address: '6551 Scott St', city: 'Hollywood', beds: 3, baths: 2, sqft: 1043, listPrice: 540000, status: 'Expired', statusDetail: '6 months on market' },
  { address: '2301 N 69th Way E', city: 'Hollywood', beds: 3, baths: 2, sqft: 1917, listPrice: 559000, status: 'Expired', statusDetail: '6 months' },
  { address: '750 SW 98th Ave', city: 'Pembroke', beds: 4, baths: 3.5, sqft: 2301, listPrice: 799999, status: 'Cancelled', statusDetail: '4 DOM (8/15)' },
  { address: '6451 SW 136th Ln', city: 'SW Ranches', beds: 6, baths: 5.5, sqft: 4786, listPrice: 3549000, status: 'Cancelled', statusDetail: '149 DOM' },
  { address: '940 SW 96th Ave', city: 'Pembroke', beds: 4, baths: 2.5, sqft: 2011, listPrice: 699000, status: 'Cancelled', statusDetail: '262 DOM' },
  { address: '5860 SW 13th St', city: 'Plantation', beds: 3, baths: 2, sqft: 1292, listPrice: 729900, status: 'Withdrawn', statusDetail: '110 DOM; price cut from $749,000' },
  { address: '980 SW 70th Ave', city: 'Plantation', beds: 4, baths: 3, sqft: 2927, listPrice: 798000, status: 'Withdrawn', statusDetail: '261 DOM' },
  { address: '1131 SW 110th Ave', city: 'Pembroke', beds: 3, baths: 2, sqft: 1300, listPrice: 525000, status: 'Withdrawn', statusDetail: '46 DOM' },
  { address: '6400 Coolidge St', city: 'Hollywood', beds: 4, baths: 3, sqft: 1300, listPrice: 499999, status: 'Expired', statusDetail: '5 months' },
  { address: '620 N 65th Ave', city: 'Hollywood', beds: 5, baths: 3, sqft: 1308, listPrice: 780999, status: 'Cancelled', statusDetail: '3 DOM (unusually short, per note)' },
  { address: '965 SW 102nd Ave', city: 'Pembroke', beds: 4, baths: 3, sqft: 2608, listPrice: 825000, status: 'Cancelled', statusDetail: '60 DOM' },
  { address: '1311 SW 56th Ave', city: 'Plantation', beds: 3, baths: 2, sqft: 1435, listPrice: 775000, status: 'Expired', statusDetail: '151 DOM' },
  { address: '13930 SW 36th Ct', city: 'Davie', beds: 5, baths: 4, sqft: 3140, listPrice: 1256000, status: 'Cancelled', statusDetail: '111 days on market' },
  { address: '2651 SW 141st Ter', city: 'Davie', beds: 5, baths: 4, sqft: 4124, listPrice: 3200000, status: 'Expired', statusDetail: '180 DOM' },
  { address: '10151 SW 3rd St', city: 'Plantation', beds: 5, baths: 4, sqft: 4142, listPrice: 4500000, status: 'Cancelled', statusDetail: '298 DOM' },
  { address: '13085 Addilyn Ct', city: 'Davie', beds: 4, baths: 3.5, sqft: 3908, listPrice: 1600000, status: 'Cancelled then Expired', statusDetail: 'Cancelled 7/31; expired 1/2026' },
  { address: '4740 SW 43rd Ave', city: 'Dania Beach', beds: 3, baths: 2, sqft: 1161, listPrice: 629000, status: 'Expired then Cancelled', statusDetail: 'Expired at $629K after 203 DOM; relisted, cancelled at $599,999 after 202 DOM' },
  { address: '11460 SW 1st Ct', city: 'Plantation', beds: 3, baths: 2, sqft: 1834, listPrice: 1290000, status: 'Expired then Withdrawn', statusDetail: 'Expired 7/2026 at 138 DOM; relisted at $1.199M, withdrawn after 43 DOM' },
  { address: '6400 W Garfield St', city: 'Hollywood', beds: 3, baths: 2, sqft: 1368, listPrice: 499990, status: 'Expired', statusDetail: '6 months' },
  { address: '9812 NW 2nd Ct', city: 'Plantation', beds: 3, baths: 2, sqft: 1583, listPrice: 530000, status: 'Cancelled', statusDetail: '56 DOM; price cut from $540,000' },
  { address: '5821 Taft St', city: 'Hollywood', beds: 2, baths: 1, sqft: 848, listPrice: 425000, status: 'Cancelled', statusDetail: '169 DOM' },
  { address: '2111 N 57th Ter', city: 'Hollywood', beds: 3, baths: 2, sqft: 1185, listPrice: 915500, status: 'Cancelled', statusDetail: '28 DOM; price moved from $499,500 down to $489,500 then up to current' },
  { address: '7324 NW 1st Pl', city: 'Plantation', beds: 3, baths: 2, sqft: 1752, listPrice: 540000, status: 'Cancelled', statusDetail: '477 DOM; price cut from $580,000' },
  { address: '5260 SW 9th St', city: 'Plantation', beds: 4, baths: 3.5, sqft: 2896, listPrice: 749000, status: 'Cancelled', statusDetail: '98 DOM' },
  { address: '2200 SW 42nd Way', city: 'Fort Lauderdale', beds: 5, baths: 4, sqft: 1744, listPrice: 499999, status: 'Expired', statusDetail: '181 DOM' },
  { address: '301 NW 78th Ter', city: 'Plantation', beds: 5, baths: 3, sqft: 2392, listPrice: 859999, status: 'Expired', statusDetail: '66 DOM' },
  { address: '2320 NW 84th Ter', city: 'Pembroke', beds: null, baths: null, sqft: null, listPrice: null, status: 'To research', statusDetail: 'No further details recorded yet' },];

export async function importExpiredWithdrawnLeads() {
  const userId = await getUserId();
  const { data: existing } = await supabase.from('contacts').select('notes').eq('user_id', userId);
  const existingNotes = (existing || []).map(c => c.notes || '');

  let imported = 0, skipped = 0;
  for (const lead of EXPIRED_WITHDRAWN_LEADS) {
    const alreadyImported = existingNotes.some(n => n.includes(lead.address));
    if (alreadyImported) { skipped += 1; continue; }

    const notesLines = [
      `Property: ${lead.address}, ${lead.city}`,
      `${lead.beds} bed / ${lead.baths} bath, ${lead.sqft ? lead.sqft.toLocaleString() : '?'} sqft`,
      `List price: $${lead.listPrice ? lead.listPrice.toLocaleString() : '?'}`,
      `Status: ${lead.status}${lead.statusDetail ? ' \u2014 ' + lead.statusDetail : ''}`,
      `Owner contact info not yet researched \u2014 check Broward County Property Appraiser (bcpa.net) or MLS tax records.`,
    ];

    await addContact({
      name: `Owner of ${lead.address}`,
      category: 'Lead',
      lead_stage: 'New Lead',
      source: 'Expired/Withdrawn Listing',
      notes: notesLines.join('\n'),
    });
    imported += 1;
  }

  return { imported, skipped, total: EXPIRED_WITHDRAWN_LEADS.length };
}
