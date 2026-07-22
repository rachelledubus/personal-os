import { supabase } from '../lib/supabaseClient.js';

// ============================================================
// GUARDIAN SYSTEM — Harmony House (Path 1 adoption of the real
// Harmony Guardians Bible, replacing the earlier placeholder system
// that used generic domain names like "Productivity Guardian" before
// the Bible document was found in the project's own files).
//
// Four named Guardians, equals as companions per the Bible's own
// "The guardians are equals as companions" principle — none of them
// is a lesser reskin of another. Each earns XP from something real
// and distinct, matching their actual documented purpose rather than
// all four being identical domain-XP counters:
//   Hana (Vitality)  <- habits, chores, workouts — starting, momentum
//   Rei  (Direction) <- tasks, goals, maintenance, content, transactions,
//                        business interactions — commitments, follow-through
//   Mochi (Heart)    <- energy check-ins — "how are we feeling?"
//   Sora (Balance)   <- weekly resets — sustainability, reflection
//
// Guardians observe systems, they don't control them (Constitution
// §12): nothing in here ever writes to tasks, contacts, or any other
// system's data. It only reads activity_log-driven events and reacts.
// ============================================================

const GUARDIAN_DEFINITIONS = [
  { guardian_key: 'hana', name: 'Hana', role: 'vitality', personality_values: ['momentum', 'courage', 'beginning'] },
  { guardian_key: 'rei', name: 'Rei', role: 'direction', personality_values: ['accountability', 'commitment', 'systems'] },
  { guardian_key: 'mochi', name: 'Mochi', role: 'heart', personality_values: ['warmth', 'joy', 'kindness'] },
  { guardian_key: 'sora', name: 'Sora', role: 'balance', personality_values: ['sustainability', 'reflection', 'pattern'] },
];

// Personality Layer (Guardian Stage 3) — voice for each of these
// four is pulled directly from the Harmony Guardians Bible's own
// character sections (Communication Style, Humor Style, Promise) for
// level-up moments specifically, which the Bible itself doesn't
// script verbatim — everything below is written to match each
// character's documented voice, not invented lore beyond that.
const REACTION_VARIANTS = {
  hana: [
    (name, level) => `${name}: LEVEL ${level}!! Starting counts, and look at you go!`,
    (name, level) => `${name}: Level ${level} — that's the spark catching!`,
    (name, level) => `${name}: Level ${level}! Next step, unlocked. Let's keep moving.`,
  ],
  rei: [
    (name, level) => `${name}: Level ${level} now. The direction is holding.`,
    (name, level) => `${name}: Level ${level}. This is what consistency of purpose looks like.`,
    (name, level) => `${name}: Level ${level} — the map is working.`,
  ],
  mochi: [
    (name, level) => `${name}: omg level ${level}?? I'm so proud of you!!`,
    (name, level) => `${name}: Level ${level}! Look at you, taking care of yourself. This matters.`,
    (name, level) => `${name}: Level ${level} — I noticed. I always notice.`,
  ],
  sora: [
    (name, level) => `${name}: Level ${level}. Balance, practiced quietly.`,
    (name, level) => `${name}: Level ${level} — a season of tending to yourself.`,
    (name, level) => `${name}: Level ${level}. You're staying connected to what matters.`,
  ],
};

// Event -> Guardian XP mapping. Split by WHAT KIND OF MOMENT it is
// (per the Bible's own "Life Core" philosophy — one unified self, not
// four separate life-domain meters), not by life domain — a business
// task completion and a personal task completion both go to Rei,
// because they're both "direction/follow-through" moments regardless
// of which part of life they're in.
const EVENT_XP_MAP = {
  'habits:completed': { guardianKey: 'hana', amount: 10 },
  'chores:completed': { guardianKey: 'hana', amount: 5 },
  'workouts:logged': { guardianKey: 'hana', amount: 10 },
  'tasks:completed': { guardianKey: 'rei', amount: 10 },
  'goals:completed': { guardianKey: 'rei', amount: 25 },
  'maintenance:completed': { guardianKey: 'rei', amount: 10 },
  'content_items:published': { guardianKey: 'rei', amount: 15 },
  'transactions:closed': { guardianKey: 'rei', amount: 50 },
  'interactions:interaction_logged': { guardianKey: 'rei', amount: 10 },
  'energy_checkin:logged': { guardianKey: 'mochi', amount: 10 },
  'weekly_reset:completed': { guardianKey: 'sora', amount: 15 },
};

// Mood (Emotional State field, already in the data model) — reflects
// real recent engagement, not a score to optimize or a guilt trip for
// gaps. Computed from how many of THIS Guardian's events landed in the
// last 14 days, using recent_events (already tracked, nothing new to
// read). Deliberately no negative/shame-adjacent word for the quiet
// end — "quiet" describes the data, it doesn't judge the person.
function computeMood(recentEvents) {
  const cutoff = Date.now() - 14 * 24 * 60 * 60 * 1000;
  const recentCount = (recentEvents || []).filter(e => new Date(e.at).getTime() >= cutoff).length;
  if (recentCount >= 5) return 'thriving';
  if (recentCount >= 2) return 'content';
  return 'quiet';
}

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

  const newMood = computeMood(recentEvents);
  const newBondLevel = guardian.bond_level + 1;

  const { data: updated, error } = await supabase.from('guardians').update({
    experience_points: newXp,
    level: newLevel,
    growth_stage: newGrowthStage,
    recent_events: recentEvents,
    unlocked_features: unlockedFeatures,
    mood: newMood,
    bond_level: newBondLevel,
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
// Per-Guardian dialogue via REACTION_VARIANTS above (Bible-sourced
// voice, several variants each so it doesn't feel scripted) — no
// generic one-size-fits-all template anymore.
export function getGuardianReaction(result) {
  if (!result) return null;
  const { guardian, leveledUp } = result;
  if (leveledUp) {
    const variants = REACTION_VARIANTS[guardian.guardian_key];
    if (variants && variants.length > 0) {
      const pick = variants[Math.floor(Math.random() * variants.length)];
      return pick(guardian.name, guardian.level);
    }
    // Fallback only reachable for a guardian_key not in REACTION_VARIANTS
    // (shouldn't happen with the current 4, but never let a missing
    // variant silently produce no reaction at all).
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
