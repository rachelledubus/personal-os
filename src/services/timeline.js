import { supabase } from '../lib/supabaseClient.js';

// ============================================================
// MASTER BUILD TIMELINE (System 11) -> roadmap_items
// The real 13-week sequence from 00_MASTER_BUILD_TIMELINE.docx,
// verbatim. Phase names match the existing roadmap_items.phase values
// (Foundation/Growth/Expansion) already used by the Business ->
// Roadmap tab — no new UI needed, just real data instead of empty rows.
// ============================================================

const MASTER_TIMELINE = [
  { week_number: 1, date_range: 'Jul 20-24', start_date: '2026-07-20', end_date: '2026-07-24', phase: 'Foundation', title: 'Build CRM: contact categories, lead sources, pipeline stages' },
  { week_number: 2, date_range: 'Jul 27-31', start_date: '2026-07-27', end_date: '2026-07-31', phase: 'Foundation', title: 'Build CRM: follow-up rules + tracking complete. Publish flagship content #1.' },
  { week_number: 3, date_range: 'Aug 3-7', start_date: '2026-08-03', end_date: '2026-08-07', phase: 'Foundation', title: 'Real Payment Guide: outline + draft content. Publish flagship content #2.' },
  { week_number: 4, date_range: 'Aug 10-14', start_date: '2026-08-10', end_date: '2026-08-14', phase: 'Foundation', title: 'Real Payment Guide live + promotion. Relocation funnel outlined. Email nurture drafted. Publish flagship content #3. Month 1 review Friday.' },
  { week_number: 5, date_range: 'Aug 17-21', start_date: '2026-08-17', end_date: '2026-08-21', phase: 'Growth', title: 'Cooper City guide drafted. Email nurture finalized. Publish flagship content #4.' },
  { week_number: 6, date_range: 'Aug 24-28', start_date: '2026-08-24', end_date: '2026-08-28', phase: 'Growth', title: 'Plantation guide drafted. List 10 target organizations for 05D. Publish flagship content #5.' },
  { week_number: 7, date_range: 'Aug 31-Sep 4', start_date: '2026-08-31', end_date: '2026-09-04', phase: 'Growth', title: 'Pembroke Pines guide drafted. Begin outreach — first 5 organizations. Publish flagship content #6.' },
  { week_number: 8, date_range: 'Sep 7-11', start_date: '2026-09-07', end_date: '2026-09-11', phase: 'Growth', title: 'Consultation presentation + buyer questionnaire built. Outreach to remaining 5 organizations. Publish flagship content #7. Month 2 review Friday.' },
  { week_number: 9, date_range: 'Sep 14-18', start_date: '2026-09-14', end_date: '2026-09-18', phase: 'Expansion', title: "Pull data: which content created conversations, which relationships created opportunities. Publish content #8." },
  { week_number: 10, date_range: 'Sep 21-25', start_date: '2026-09-21', end_date: '2026-09-25', phase: 'Expansion', title: 'Diagnose per System 10 rules: activity vs. results. Publish content #9.' },
  { week_number: 11, date_range: 'Sep 28-Oct 2', start_date: '2026-09-28', end_date: '2026-10-02', phase: 'Expansion', title: "Expand: double down on the top lead source. Publish content #10." },
  { week_number: 12, date_range: 'Oct 5-9', start_date: '2026-10-05', end_date: '2026-10-09', phase: 'Expansion', title: 'Expand: deepen the 2-3 most responsive organizations. Publish content #11.' },
  { week_number: 13, date_range: 'Oct 12-16', start_date: '2026-10-12', end_date: '2026-10-16', phase: 'Expansion', title: 'Repurpose top-performing content. Day-90 review against Phase 1 success criteria. Set next 90-day plan Friday.' },
];

async function getUserId() {
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id;
}

export async function seedMasterTimelineIfEmpty() {
  const userId = await getUserId();
  if (!userId) return;
  const { count } = await supabase.from('roadmap_items').select('id', { count: 'exact', head: true }).eq('user_id', userId);
  if (count && count > 0) return; // never overwrite real data, seed once only

  const rows = MASTER_TIMELINE.map((w) => ({
    user_id: userId,
    title: w.title,
    phase: w.phase,
    week_number: w.week_number,
    date_range: w.date_range,
    start_date: w.start_date,
    end_date: w.end_date,
    status: inferStatus(w.start_date, w.end_date),
    sort_order: w.week_number,
  }));
  await supabase.from('roadmap_items').insert(rows);
}

/** Status computed from real dates, never typed by hand: before the
 *  window = Not Started, inside it = In Progress, after it = Done.
 *  Items without dates (custom roadmap entries) keep whatever status
 *  was set manually — this only applies where real dates exist. */
export function inferStatus(startDate, endDate) {
  if (!startDate || !endDate) return null;
  const today = new Date().toISOString().slice(0, 10);
  if (today < startDate) return 'Not Started';
  if (today > endDate) return 'Done';
  return 'In Progress';
}

/** Re-syncs every dated roadmap item's status to today — call this on
 *  load so a week rolling over doesn't require anyone to remember to
 *  flip a status by hand.
 *  Never downgrades an item that's already 'Done' — this was the bug:
 *  a week finished early (all sub-tasks checked off, or checked off
 *  directly in Today's Schedule) would get silently flipped back to
 *  'In Progress' on the next page load, because date-inference alone
 *  doesn't know the difference between "not done yet" and "done
 *  early." Once something's Done, only an explicit action (unchecking
 *  a sub-task, editing status by hand) should move it off that. */
export async function syncRoadmapStatuses() {
  const userId = await getUserId();
  const { data, error } = await supabase.from('roadmap_items').select('id, start_date, end_date, status')
    .eq('user_id', userId).not('start_date', 'is', null);
  if (error) throw error;
  const updates = (data || [])
    .filter(item => item.status !== 'Done')
    .map(item => ({ id: item.id, status: inferStatus(item.start_date, item.end_date) }))
    .filter(u => u.status && u.status !== data.find(d => d.id === u.id).status);
  await Promise.all(updates.map(u => supabase.from('roadmap_items').update({ status: u.status }).eq('id', u.id)));
}

export async function updateRoadmapStatus(id, status) {
  const { error } = await supabase.from('roadmap_items').update({ status }).eq('id', id);
  if (error) throw error;
}

/** The other half of the fix: sub-task completion now actually drives
 *  the parent's status instead of doing nothing. Finishing the last
 *  sub-task marks the parent Done; unchecking one after full
 *  completion reverts it to whatever the date alone would say, so it
 *  isn't stuck Done if you realize something wasn't actually finished.
 *  Returns true if this call just completed the item (so callers —
 *  the Roadmap tab, Today's Schedule — know when to show the
 *  completion moment vs. a routine toggle). */
export async function syncRoadmapItemFromSubtasks(roadmapItemId) {
  const { data: siblings, error } = await supabase.from('milestones').select('completed').eq('roadmap_item_id', roadmapItemId);
  if (error) throw error;
  if (!siblings.length) return false;
  const allDone = siblings.every(s => s.completed);
  const { data: item } = await supabase.from('roadmap_items').select('start_date, end_date, status').eq('id', roadmapItemId).single();
  if (!item) return false;
  if (allDone && item.status !== 'Done') {
    await updateRoadmapStatus(roadmapItemId, 'Done');
    return true;
  }
  if (!allDone && item.status === 'Done') {
    await updateRoadmapStatus(roadmapItemId, inferStatus(item.start_date, item.end_date) || 'Not Started');
  }
  return false;
}

export async function getThisWeekBuild() {
  const userId = await getUserId();
  const { data, error } = await supabase.from('roadmap_items').select('*')
    .eq('user_id', userId).eq('status', 'In Progress').order('week_number').limit(1).maybeSingle();
  if (error) throw error;
  return data;
}