import { supabase } from '../lib/supabaseClient.js';
import { addLifeRhythmBlock } from './lifeRhythm.js';

// ============================================================
// TIER 4 PHASE D — the real Mon-Sun + weekend schedule, expressed in
// the dependency-based model from Phase A/B.
//
// Linear chains don't need explicit depends_on_block_id — the chain
// engine already falls back to "the previous block in sort_order" when
// no dependency is set, so a plain sequential day just needs correct
// sort order, which array order + insertion gives for free.
//
// Assumptions made where the original spec didn't give exact numbers
// (flagged here, not hidden) — all editable afterward in Schedule
// Template like any other block:
// - Workout/class durations not explicitly stated (Tue/Thu/Sat) are
//   estimated at 60 minutes.
// - "Dinner by 6 PM" is modeled as a fixed 6:00-6:30 block.
// - Morning routine step durations (meds, pack lunch, smoothies,
//   shower, drive home) are estimated at 5-20 minutes each.
// - Weekday "Work block" / "Afternoon work" durations are estimates
//   (2.5hr / 2hr) since no exact hours were specified.
// ============================================================

function gymDay(gymTitle, targetArrival, travelMinutes, classBlock) {
  return [
    { title: 'Wake', block_type: 'routine', schedule_mode: 'fixed', is_anchor: true, start_time: '06:00', end_time: '06:05', estimated_duration_minutes: 5 },
    { title: 'Morning meds', block_type: 'routine', schedule_mode: 'anchored', estimated_duration_minutes: 5 },
    { title: "Pack husband's lunch", block_type: 'routine', schedule_mode: 'anchored', estimated_duration_minutes: 10 },
    { title: 'Make smoothies', block_type: 'routine', schedule_mode: 'anchored', estimated_duration_minutes: 15 },
    { title: `Leave for ${gymTitle}`, block_type: 'workout', schedule_mode: 'commute', target_arrival_time: targetArrival, travel_minutes: travelMinutes },
    classBlock || { title: gymTitle, block_type: 'workout', schedule_mode: 'anchored', estimated_duration_minutes: 60 },
    { title: 'Drive home', block_type: 'routine', schedule_mode: 'anchored', estimated_duration_minutes: 15 },
    { title: 'Shower', block_type: 'routine', schedule_mode: 'anchored', estimated_duration_minutes: 15 },
    { title: 'Breakfast', block_type: 'meal', schedule_mode: 'anchored', estimated_duration_minutes: 20 },
    { title: 'Work block', block_type: 'work', track: 'business', schedule_mode: 'anchored', estimated_duration_minutes: 150 },
    { title: 'Lunch', block_type: 'meal', schedule_mode: 'anchored', estimated_duration_minutes: 30 },
    { title: 'Cleaning', block_type: 'routine', schedule_mode: 'anchored', estimated_duration_minutes: 30 },
    { title: 'Afternoon work', block_type: 'work', track: 'business', schedule_mode: 'anchored', estimated_duration_minutes: 120 },
    { title: 'Wrap up work', block_type: 'work', track: 'business', schedule_mode: 'anchored', estimated_duration_minutes: 15 },
    { title: 'Optional game', block_type: 'personal', schedule_mode: 'anchored', estimated_duration_minutes: 30 },
    { title: 'Dinner prep', block_type: 'meal', schedule_mode: 'anchored', estimated_duration_minutes: 30 },
    { title: 'Dinner', block_type: 'meal', schedule_mode: 'fixed', start_time: '18:00', end_time: '18:30' },
  ];
}

export const NEW_WEEK_TEMPLATE = {
  // Monday — Cycle, 8:45 arrival for a 9:00 class, 15min drive
  1: gymDay('Cycle', '08:45', 15, { title: 'Cycle Class', block_type: 'workout', schedule_mode: 'fixed', start_time: '09:00', end_time: '10:00' }),
  // Tuesday — Upper Body, 7:00 arrival, 25min drive
  2: gymDay('Upper Body', '07:00', 25),
  // Wednesday — Pilates, 7:00 arrival for a 7:15 class, 15min drive
  3: gymDay('Pilates', '07:00', 15, { title: 'Pilates Class', block_type: 'workout', schedule_mode: 'fixed', start_time: '07:15', end_time: '08:15' }),
  // Thursday — Lower/Quads, 7:00 arrival, 25min drive
  4: gymDay('Lower/Quads', '07:00', 25),

  // Friday — Rest day. No gym chain specified in the original spec;
  // kept parallel to the weekday work rhythm minus workout-specific
  // steps. Worth confirming this matches what you actually want Fridays
  // to look like — easy to edit in Schedule Template either way.
  5: [
    { title: 'Wake', block_type: 'routine', schedule_mode: 'fixed', is_anchor: true, start_time: '06:00', end_time: '06:05', estimated_duration_minutes: 5 },
    { title: 'Morning meds', block_type: 'routine', schedule_mode: 'anchored', estimated_duration_minutes: 5 },
    { title: 'Breakfast', block_type: 'meal', schedule_mode: 'anchored', estimated_duration_minutes: 20 },
    { title: 'Work block', block_type: 'work', track: 'business', schedule_mode: 'anchored', estimated_duration_minutes: 180 },
    { title: 'Lunch', block_type: 'meal', schedule_mode: 'anchored', estimated_duration_minutes: 30 },
    { title: 'Afternoon work', block_type: 'work', track: 'business', schedule_mode: 'anchored', estimated_duration_minutes: 120 },
    { title: 'Wrap up work', block_type: 'work', track: 'business', schedule_mode: 'anchored', estimated_duration_minutes: 15 },
    { title: 'Optional game', block_type: 'personal', schedule_mode: 'anchored', estimated_duration_minutes: 45 },
    { title: 'Dinner prep', block_type: 'meal', schedule_mode: 'anchored', estimated_duration_minutes: 30 },
    { title: 'Dinner', block_type: 'meal', schedule_mode: 'fixed', start_time: '18:00', end_time: '18:30' },
  ],

  // Saturday — Posterior Chain, 7:00 arrival, 25min drive, then your
  // real weekend list (grocery shopping, house project, free time)
  6: [
    { title: 'Wake', block_type: 'routine', schedule_mode: 'fixed', is_anchor: true, start_time: '06:00', end_time: '06:05', estimated_duration_minutes: 5 },
    { title: 'Morning meds', block_type: 'routine', schedule_mode: 'anchored', estimated_duration_minutes: 5 },
    { title: "Make husband's lunch (if applicable)", block_type: 'routine', schedule_mode: 'anchored', estimated_duration_minutes: 10 },
    { title: 'Make smoothies', block_type: 'routine', schedule_mode: 'anchored', estimated_duration_minutes: 15 },
    { title: 'Leave for Posterior Chain', block_type: 'workout', schedule_mode: 'commute', target_arrival_time: '07:00', travel_minutes: 25 },
    { title: 'Posterior Chain', block_type: 'workout', schedule_mode: 'anchored', estimated_duration_minutes: 60 },
    { title: 'Drive home', block_type: 'routine', schedule_mode: 'anchored', estimated_duration_minutes: 25 },
    { title: 'Shower', block_type: 'routine', schedule_mode: 'anchored', estimated_duration_minutes: 15 },
    { title: 'Breakfast', block_type: 'meal', schedule_mode: 'anchored', estimated_duration_minutes: 20 },
    { title: 'Grocery shopping (if needed)', block_type: 'personal', schedule_mode: 'anchored', estimated_duration_minutes: 60 },
    { title: 'Lunch', block_type: 'meal', schedule_mode: 'anchored', estimated_duration_minutes: 30 },
    { title: 'House project / deeper cleaning', block_type: 'personal', schedule_mode: 'anchored', estimated_duration_minutes: 90 },
    { title: 'Free time (games, programming, hobbies)', block_type: 'personal', schedule_mode: 'anchored', estimated_duration_minutes: 120 },
    { title: 'Dinner prep', block_type: 'meal', schedule_mode: 'anchored', estimated_duration_minutes: 30 },
    { title: 'Dinner', block_type: 'meal', schedule_mode: 'anchored', estimated_duration_minutes: 30 },
    { title: 'Relax', block_type: 'reset', schedule_mode: 'anchored', estimated_duration_minutes: 90 },
  ],

  // Sunday — Reset Day
  0: [
    { title: 'Wake', block_type: 'routine', schedule_mode: 'fixed', is_anchor: true, start_time: '07:00', end_time: '07:05', estimated_duration_minutes: 5 },
    { title: 'Morning meds', block_type: 'routine', schedule_mode: 'anchored', estimated_duration_minutes: 5 },
    { title: 'Make smoothies', block_type: 'routine', schedule_mode: 'anchored', estimated_duration_minutes: 15 },
    { title: 'Breakfast', block_type: 'meal', schedule_mode: 'anchored', estimated_duration_minutes: 20 },
    { title: 'Weekly planning/review', block_type: 'reset', schedule_mode: 'anchored', estimated_duration_minutes: 30 },
    { title: 'Meal prep for the week', block_type: 'reset', schedule_mode: 'anchored', estimated_duration_minutes: 60 },
    { title: 'Laundry', block_type: 'reset', schedule_mode: 'anchored', estimated_duration_minutes: 45 },
    { title: 'Light cleaning', block_type: 'reset', schedule_mode: 'anchored', estimated_duration_minutes: 30 },
    { title: 'Programming or hobby time', block_type: 'personal', schedule_mode: 'anchored', estimated_duration_minutes: 90 },
    { title: 'Free time', block_type: 'personal', schedule_mode: 'anchored', estimated_duration_minutes: 60 },
    { title: 'Dinner prep', block_type: 'meal', schedule_mode: 'anchored', estimated_duration_minutes: 30 },
    { title: 'Dinner', block_type: 'meal', schedule_mode: 'anchored', estimated_duration_minutes: 30 },
    { title: 'Wind down for Monday', block_type: 'reset', schedule_mode: 'anchored', estimated_duration_minutes: 45 },
  ],
};

/** Explicit, user-triggered replacement of the current weekly
 *  template — never called automatically. Deletes every existing
 *  life_rhythm_blocks row for this user, then inserts the new
 *  structure day by day (array order gives correct sort_order, and
 *  the chain engine's "previous block" fallback means no explicit
 *  depends_on_block_id wiring is needed for these linear days). */
export async function applyNewWeeklyTemplate() {
  const { data: { user } } = await supabase.auth.getUser();
  const { error: deleteError } = await supabase.from('life_rhythm_blocks').delete().eq('user_id', user.id);
  if (deleteError) throw deleteError;

  for (const dayOfWeek of Object.keys(NEW_WEEK_TEMPLATE)) {
    const blocks = NEW_WEEK_TEMPLATE[dayOfWeek];
    for (let i = 0; i < blocks.length; i++) {
      await addLifeRhythmBlock({
        day_of_week: Number(dayOfWeek),
        sort_order: i,
        track: 'personal',
        active: true,
        ...blocks[i],
      });
    }
  }
}
