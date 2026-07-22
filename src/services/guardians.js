import { supabase } from '../lib/supabaseClient.js';

// ============================================================
// GUARDIAN SYSTEM — Technical Foundation (Phase 3, Stage 1 per the
// Guardian Integration Architecture doc's own sequencing)
//
// Scope, deliberately: data model + XP system + event system +
// progression logic + a minimal reaction framework. NOT in scope yet
// (by design, matching the doc's own phase order):
//   - Personality/dialogue content beyond generic, functional names
//   - Visual expansion (sprites, outfits, environments) — Companion.jsx
//     stays exactly as-is, untouched
//   - Unlocks (Phase 4 / Gamification concern)
//   - Connecting habits/workouts/goals (Guardian doc's own Phase 2 —
//     "Integration" — comes after this)
//
// Guardians observe systems, they don't control them (Constitution
// §12): nothing in here ever writes to tasks, contacts, or any other
// system's data. It only reads activity_log-driven events and reacts.
// ============================================================

// Functional names only, on purpose — see file header. Values for
// Productivity/Business/Health match the concrete example already
// given in the Guardian Integration doc. Growth has no example values
// given anywhere in the docs — these are a reasonable placeholder,
// same honesty caveat as the others' generic naming.
const GUARDIAN_DEFINITIONS = [
  { guardian_key: 'productivity', name: 'Productivity Guardian', role: 'productivity', personality_values: ['consistency', 'focus', 'discipline'] },
  { guardian_key: 'business', name: 'Business Guardian', role: 'business', personality_values: ['relationships', 'courage', 'communication'] },
  { guardian_key: 'health', name: 'Health Guardian', role: 'health', personality_values: ['balance', 'energy', 'self-care'] },
  { guardian_key: 'growth', name: 'Growth Guardian', role: 'growth', personality_values: ['reflection', 'intention', 'self-improvement'] },
];

// Event -> Guardian XP mapping. Tasks and interactions were the first
// events flowing into activity_log; habits and workouts were added
// once their completion paths started logging too (see dailyExecution
// call sites in GrowPage/missions.js and workoutAnalytics.js).
//
// habits map to 'growth', not 'health' — the doc's own Event
// Categories section lists HABIT_COMPLETED under "Personal Growth
// Events", separate from "Health Events" (WORKOUT_COMPLETED,
// MEAL_LOGGED, SLEEP_GOAL_MET). Workouts stay under Health; habits
// belong to Growth. GOAL_COMPLETED is explicitly listed under
// "Productivity Events" in the same doc, alongside TASK_COMPLETED.
const EVENT_XP_MAP = {
  'tasks:completed': { guardianKey: 'productivity', amount: 10 },
  'goals:completed': { guardianKey: 'productivity', amount: 25 }, // a finished goal is a bigger deal than one task — matches the doc's "growth should feel earned" principle
  'interactions:interaction_logged': { guardianKey: 'business', amount: 10 },
  'habits:completed': { guardianKey: 'growth', amount: 10 },
  'workouts:logged': { guardianKey: 'health', amount: 10 },
  'chores:completed': { guardianKey: 'growth', amount: 5 }, // small and frequent, same bucket as habits — routine personal upkeep
  'maintenance:completed': { guardianKey: 'growth', amount: 10 },
  'content_items:published': { guardianKey: 'business', amount: 15 },
  'transactions:closed': { guardianKey: 'business', amount: 50 }, // the single biggest real-world business win the app tracks
};

// XP -> level: simple, deliberately not final. 100 XP per level.
// Adjust here if it feels too fast/slow once real data exists.
export function getLevelForXp(xp) {
  return Math.floor(xp / 100) + 1;
}

// Growth stage is a coarse label derived from level, not stored
// creative writing — real personality-per-stage content belongs to
// the later Personality Layer phase, not this one.
export function getGrowthStageForLevel(level) {
  if (level >= 10) return 'Flourishing';
  if (level >= 5) return 'Growing';
  if (level >= 2) return 'Sprouting';
  return 'Seedling';
}

/** XP progress within the current level, for a simple progress bar —
 *  keeps the "100 XP per level" formula in exactly one place rather
 *  than letting display code redo the math. */
export function getXpProgressWithinLevel(xp) {
  return xp % 100;
}

async function getUserId() {
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id;
}

/** Seeds any Guardian from GUARDIAN_DEFINITIONS the user doesn't
 *  already have — not just "seed if totally empty." This matters
 *  because Guardians were added to this list in two passes (3 first,
 *  Growth added after); anyone already seeded with the first 3 needs
 *  the new one added without re-seeding or duplicating the others.
 *  Safe to call on every load either way. */
export async function seedGuardiansIfEmpty() {
  const userId = await getUserId();
  if (!userId) return;
  const { data: existing } = await supabase.from('guardians').select('guardian_key').eq('user_id', userId);
  const existingKeys = new Set((existing || []).map(g => g.guardian_key));
  const missing = GUARDIAN_DEFINITIONS.filter(g => !existingKeys.has(g.guardian_key));
  if (missing.length === 0) return;

  const rows = missing.map(g => ({ ...g, user_id: userId }));
  await supabase.from('guardians').insert(rows);
}

export async function listGuardians() {
  const userId = await getUserId();
  const { data, error } = await supabase.from('guardians').select('*').eq('user_id', userId).order('guardian_key');
  if (error) throw error;
  return data || [];
}

export async function getGuardian(guardianKey) {
  const userId = await getUserId();
  const { data, error } = await supabase.from('guardians').select('*')
    .eq('user_id', userId).eq('guardian_key', guardianKey).maybeSingle();
  if (error) throw error;
  return data;
}

// Level-based unlocks (Phase 4/Gamification) — functional, not cosmetic,
// per the Guardian doc's own "no major art work" principle for anything
// before the Personality Layer. 'full_history' just means: stop capping
// the visible event list at 10 — the real data (xp_transactions) was
// always complete, this only unlocks *seeing* more of it.
const UNLOCK_THRESHOLDS = [
  { level: 3, feature: 'full_history' },
];

function getNewlyUnlockedFeatures(level, alreadyUnlocked) {
  const unlocked = new Set(alreadyUnlocked || []);
  UNLOCK_THRESHOLDS.filter(u => level >= u.level).forEach(u => unlocked.add(u.feature));
  return Array.from(unlocked);
}

/** The one real write path for Guardian growth. Records the XP
 *  transaction (the real audit trail), then updates the Guardian's
 *  running total, level, growth stage, and a short rolling log of
 *  recent events — capped at 10 so this stays "a glance," matching
 *  the Product Vision's "clarity over completeness" principle. */
async function awardXp(guardianKey, amount, sourceTable, sourceId, eventType) {
  const guardian = await getGuardian(guardianKey);
  if (!guardian) return null; // not seeded yet — never throw over a missing Guardian, this is an observer, not a blocker

  const userId = guardian.user_id;
  await supabase.from('xp_transactions').insert({
    user_id: userId, guardian_id: guardian.id, amount,
    source_table: sourceTable, source_id: sourceId, event_type: eventType,
  });

  const newXp = guardian.experience_points + amount;
  const newLevel = getLevelForXp(newXp);
  const leveledUp = newLevel > guardian.level;
  const newGrowthStage = getGrowthStageForLevel(newLevel);
  const reaction = getGuardianReaction({ guardian: { ...guardian, level: newLevel, growth_stage: newGrowthStage }, leveledUp });
  const unlockedFeatures = getNewlyUnlockedFeatures(newLevel, guardian.unlocked_features);

  const recentEvents = [
    { eventType, amount, at: new Date().toISOString(), reaction },
    ...(guardian.recent_events || []),
  ].slice(0, 10);

  const { data: updated, error } = await supabase.from('guardians').update({
    experience_points: newXp,
    level: newLevel,
    growth_stage: newGrowthStage,
    recent_events: recentEvents,
    unlocked_features: unlockedFeatures,
    updated_at: new Date().toISOString(),
  }).eq('id', guardian.id).select().single();
  if (error) throw error;

  return { guardian: updated, leveledUp, xpAwarded: amount, reaction };
}

/** The event system's landing point — called from logActivity() so
 *  every existing call site (task completion, interaction logging)
 *  automatically feeds the Guardian system with zero changes needed
 *  elsewhere. This is a pragmatic stand-in for a real decoupled event
 *  bus: this build environment can't verify a Supabase Realtime
 *  subscription actually works end-to-end, so a direct call is the
 *  most honest thing to ship — a true pub/sub swap is a reasonable
 *  future upgrade once that can be tested in a real browser.
 *  Never throws — a Guardian miscalculation should never break the
 *  real action that triggered it. */
export async function processActivityEvent(sourceTable, sourceId, eventType) {
  const mapping = EVENT_XP_MAP[`${sourceTable}:${eventType}`];
  if (!mapping) return null;
  try {
    return await awardXp(mapping.guardianKey, mapping.amount, sourceTable, sourceId, eventType);
  } catch {
    return null;
  }
}

/** Most recent level-up across all Guardians, if any happened in the
 *  last 2 minutes — what the Companion polls to know whether to
 *  celebrate. Session-local "already shown" tracking lives on the
 *  caller side (Companion.jsx), not here, so this stays a plain read. */
export async function getRecentLevelUp() {
  const guardians = await listGuardians();
  const cutoff = Date.now() - 2 * 60 * 1000;
  let mostRecent = null;
  for (const g of guardians) {
    const top = (g.recent_events || [])[0];
    if (!top?.reaction) continue;
    const at = new Date(top.at).getTime();
    if (at < cutoff) continue;
    if (!mostRecent || at > new Date(mostRecent.at).getTime()) {
      mostRecent = { ...top, guardianId: g.id };
    }
  }
  return mostRecent;
}

// ---------- Reaction framework ----------
// Deliberately generic, supportive phrasing (Brand Voice: warm,
// encouraging, never shame-based) — not per-Guardian dialogue trees.
// That richer personality layer is explicitly a later phase; this is
// the plumbing it will eventually plug into.
export function getGuardianReaction(result) {
  if (!result) return null;
  const { guardian, leveledUp } = result;
  if (leveledUp) {
    return `${guardian.name} grew to level ${guardian.level} — ${guardian.growth_stage.toLowerCase()} now.`;
  }
  return null; // no reaction on every single XP tick — docs are explicit: too many reactions reduce meaning
}

/** The "full_history" unlock's actual payoff — recent_events on the
 *  guardian row is always capped at 10, but xp_transactions was never
 *  capped, it's the real audit trail. This just reads more of what
 *  already existed. */
export async function getFullHistory(guardianId) {
  const { data, error } = await supabase.from('xp_transactions')
    .select('*').eq('guardian_id', guardianId).order('created_at', { ascending: false }).limit(100);
  if (error) throw error;
  return data;
}

// ---------- Achievements ----------
// Deliberately text + icon, zero custom art — matches the Guardian
// doc's own "no major art work" rule for anything before the
// Personality Layer. Computed live from xp_transactions and guardian
// levels, nothing new stored — an achievement "unlocking" is just a
// true/false read of data that already exists, same principle as the
// rest of this file (Guardians observe, they don't own data).
export const ACHIEVEMENT_DEFINITIONS = [
  { key: 'first_step', name: 'First Step', description: 'Earn your first XP', icon: '✨', check: s => s.totalEvents >= 1 },
  { key: 'level_up', name: 'Growing', description: 'Any Guardian reaches level 2', icon: '🌱', check: s => s.maxLevel >= 2 },
  { key: 'well_rounded', name: 'Well-Rounded', description: 'All 4 Guardians reach level 2', icon: '🧭', check: s => s.minLevel >= 2 },
  { key: 'consistent', name: 'Consistent', description: 'Log 7 habit completions', icon: '🔁', check: s => (s.byEvent['habits:completed'] || 0) >= 7 },
  { key: 'relationship_builder', name: 'Relationship Builder', description: 'Log 10 business interactions', icon: '🤝', check: s => (s.byEvent['interactions:interaction_logged'] || 0) >= 10 },
  { key: 'closer', name: 'Closer', description: 'Log your first closed transaction', icon: '🏆', check: s => (s.byEvent['transactions:closed'] || 0) >= 1 },
  { key: 'goal_getter', name: 'Goal Getter', description: 'Complete your first goal', icon: '🎯', check: s => (s.byEvent['goals:completed'] || 0) >= 1 },
  { key: 'content_creator', name: 'Content Creator', description: 'Publish 5 pieces of content', icon: '📣', check: s => (s.byEvent['content_items:published'] || 0) >= 5 },
];

export async function getAchievementProgress() {
  const userId = await getUserId();
  if (!userId) return ACHIEVEMENT_DEFINITIONS.map(a => ({ ...a, earned: false }));

  const [{ data: transactions, error }, guardians] = await Promise.all([
    supabase.from('xp_transactions').select('source_table, event_type').eq('user_id', userId),
    listGuardians(),
  ]);
  if (error) throw error;

  // Composite key, same shape as EVENT_XP_MAP's keys — event_type alone
  // isn't unique ('completed' is shared by tasks/habits/goals/chores).
  const byEvent = {};
  (transactions || []).forEach(t => {
    const key = `${t.source_table}:${t.event_type}`;
    byEvent[key] = (byEvent[key] || 0) + 1;
  });

  const stats = {
    totalEvents: (transactions || []).length,
    maxLevel: guardians.length ? Math.max(...guardians.map(g => g.level)) : 0,
    minLevel: guardians.length ? Math.min(...guardians.map(g => g.level)) : 0,
    byEvent,
  };

  return ACHIEVEMENT_DEFINITIONS.map(a => ({ ...a, earned: a.check(stats) }));
}
