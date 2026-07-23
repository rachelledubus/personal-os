import { supabase } from '../lib/supabaseClient.js';
import { addDevLogEntry } from './devMemory.js';

// ============================================================
// CONTROL CENTER — SETTINGS LAYER
// Built entirely on user_preferences (category + key + jsonb value) —
// zero new schema needed for this part. Two concerns:
//  - Category lists: editable dropdown options for fields that are
//    genuinely free-text in the database (no CHECK constraint).
//  - Feature flags: booleans, read by the components they gate.
// ============================================================

async function getUserId() {
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id;
}

// Exported generic get/set — this is also now the single preference
// read/write path for the whole app (see WHERE_WE_LEFT_OFF: preferences.js
// was "superseded by settings.js" twice before and kept coming back
// because two call sites never actually migrated. Fixed for real now —
// preferences.js is removed, timer.js and Companion.jsx import from here.
export async function getPreference(category, key, fallback = null) {
  const userId = await getUserId();
  if (!userId) return fallback;
  const { data } = await supabase.from('user_preferences').select('value')
    .eq('user_id', userId).eq('category', category).eq('key', key).maybeSingle();
  return data ? data.value : fallback;
}

export async function setPreference(category, key, value) {
  const userId = await getUserId();
  const { error } = await supabase.from('user_preferences').upsert({
    user_id: userId, category, key, value,
  }, { onConflict: 'user_id,category,key' });
  if (error) throw error;
}

// ---------- Category lists ----------
// Every list here backs a field with NO database CHECK constraint —
// genuinely safe to add/rename/remove without breaking app logic.
// Deliberately NOT here: capture_type, relationship_tier, maintenance
// area, content status, finance entry_type — those are constrained
// vocabularies the code branches on (e.g. capture_type routes to
// different resolve functions). Renaming those needs a real
// migration, not a settings screen.
export const CATEGORY_LISTS = {
  pipeline_categories: {
    label: 'Pipeline contact categories',
    default: ['Lead', 'Future Client', 'Active Client', 'Past Client', 'Sphere', 'Partner', 'Agent Referral'],
  },
  lead_stages: {
    label: 'Pipeline — lead funnel stages',
    default: ['New Lead', 'Contact Attempted', 'Conversation Started', 'Nurture', 'Consultation Scheduled', 'Active Client', 'Closed'],
  },
  lead_sources: {
    label: 'Pipeline — lead sources',
    default: ['Website', 'Referral', 'Social Media', 'Open House', 'Farming', 'Networking'],
  },
  marketing_activity_categories: {
    label: 'Marketing — activity categories',
    default: ['Relationship Marketing', 'Farming', 'Networking', 'Events', 'Campaigns'],
  },
  finance_expense_categories: {
    label: 'Finance — expense/bill categories',
    default: ['Housing', 'Utilities', 'Groceries', 'Transportation', 'Subscriptions', 'Insurance', 'Debt', 'Personal', 'Business', 'Other'],
  },
  finance_income_categories: {
    label: 'Finance — income categories',
    default: ['Salary', 'Commission', 'Side Income', 'Other'],
  },
  roadmap_phases: {
    label: 'Roadmap phases',
    default: ['Foundation', 'Growth', 'Expansion'],
  },
  backlog_categories: {
    label: 'Backlog suggested categories',
    default: ['Feature', 'Bug fix', 'Aesthetic', 'Automation', 'Content'],
  },
  content_audiences: {
    label: 'Content — audiences',
    default: ['Relocation Buyers', 'First-Time Buyers', 'Future Homeowners', 'Sellers', 'Partners'],
  },
  content_pillars: {
    label: 'Content — pillars',
    default: ['Real Monthly Cost', 'Florida Home Education', 'School Zone Intelligence', 'Neighborhood Comparisons', 'Local Market Insights', 'Homeownership Education'],
  },
};

export async function getCategoryList(listKey) {
  const stored = await getPreference('category_lists', listKey);
  return stored?.items || CATEGORY_LISTS[listKey]?.default || [];
}

export async function setCategoryList(listKey, items) {
  await setPreference('category_lists', listKey, { items });
  await addDevLogEntry('config', `Updated "${CATEGORY_LISTS[listKey]?.label || listKey}" list`, `Now: ${items.join(', ')}`);
}

// ---------- Feature flags ----------
export const FEATURE_FLAGS = {
  show_decorations: { label: 'Show decorative artwork (chibis, backdrop, mascots)', default: true },
  show_energy_checkin: { label: 'Show energy check-in on Today', default: true },
  ai_features_enabled: { label: 'Enable AI features (suggestions, drafting, repurposing)', default: true },
};

export async function getFeatureFlag(flagKey) {
  const stored = await getPreference('feature_flags', flagKey);
  if (stored?.enabled !== undefined) return stored.enabled;
  return FEATURE_FLAGS[flagKey]?.default ?? true;
}

export async function getAllFeatureFlags() {
  const userId = await getUserId();
  const { data } = await supabase.from('user_preferences').select('key, value')
    .eq('user_id', userId).eq('category', 'feature_flags');
  const stored = Object.fromEntries((data || []).map(d => [d.key, d.value.enabled]));
  const result = {};
  Object.keys(FEATURE_FLAGS).forEach(key => {
    result[key] = stored[key] !== undefined ? stored[key] : FEATURE_FLAGS[key].default;
  });
  return result;
}

export async function setFeatureFlag(flagKey, enabled) {
  await setPreference('feature_flags', flagKey, { enabled });
  await addDevLogEntry('config', `${enabled ? 'Enabled' : 'Disabled'} "${FEATURE_FLAGS[flagKey]?.label || flagKey}"`);
}

// ---------- AI settings ----------
// ---------- Sleep target (PM routine countdown widget) ----------
export async function getSleepTargets() {
  const stored = await getPreference('sleep', 'targets');
  return { bedtime: stored?.bedtime || '22:30', wake_time: stored?.wake_time || '06:00' };
}

export async function setSleepTargets({ bedtime, wake_time }) {
  await setPreference('sleep', 'targets', { bedtime, wake_time });
}

export async function getCustomAiInstructions() {
  const stored = await getPreference('ai_settings', 'custom_instructions');
  return stored?.text || '';
}

export async function setCustomAiInstructions(text) {
  await setPreference('ai_settings', 'custom_instructions', { text });
  await addDevLogEntry('config', 'Updated custom AI instructions');
}