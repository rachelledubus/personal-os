import { supabase } from '../lib/supabaseClient.js';

// ============================================================
// MASTER BUILD TIMELINE (System 11) -> roadmap_items
// The real 13-week sequence from 00_MASTER_BUILD_TIMELINE.docx,
// verbatim. Phase names match the existing roadmap_items.phase values
// (Foundation/Growth/Expansion) already used by the Business ->
// Roadmap tab — no new UI needed, just real data instead of empty rows.
// ============================================================

const MASTER_TIMELINE = [
  { week_number: 1, date_range: 'Jul 20-24', phase: 'Foundation', title: 'Build CRM: contact categories, lead sources, pipeline stages' },
  { week_number: 2, date_range: 'Jul 27-31', phase: 'Foundation', title: 'Build CRM: follow-up rules + tracking complete. Publish flagship content #1.' },
  { week_number: 3, date_range: 'Aug 3-7', phase: 'Foundation', title: 'Real Payment Guide: outline + draft content. Publish flagship content #2.' },
  { week_number: 4, date_range: 'Aug 10-14', phase: 'Foundation', title: 'Real Payment Guide live + promotion. Relocation funnel outlined. Email nurture drafted. Publish flagship content #3. Month 1 review Friday.' },
  { week_number: 5, date_range: 'Aug 17-21', phase: 'Growth', title: 'Cooper City guide drafted. Email nurture finalized. Publish flagship content #4.' },
  { week_number: 6, date_range: 'Aug 24-28', phase: 'Growth', title: 'Plantation guide drafted. List 10 target organizations for 05D. Publish flagship content #5.' },
  { week_number: 7, date_range: 'Aug 31-Sep 4', phase: 'Growth', title: 'Pembroke Pines guide drafted. Begin outreach — first 5 organizations. Publish flagship content #6.' },
  { week_number: 8, date_range: 'Sep 7-11', phase: 'Growth', title: 'Consultation presentation + buyer questionnaire built. Outreach to remaining 5 organizations. Publish flagship content #7. Month 2 review Friday.' },
  { week_number: 9, date_range: 'Sep 14-18', phase: 'Expansion', title: "Pull data: which content created conversations, which relationships created opportunities. Publish content #8." },
  { week_number: 10, date_range: 'Sep 21-25', phase: 'Expansion', title: 'Diagnose per System 10 rules: activity vs. results. Publish content #9.' },
  { week_number: 11, date_range: 'Sep 28-Oct 2', phase: 'Expansion', title: "Expand: double down on the top lead source. Publish content #10." },
  { week_number: 12, date_range: 'Oct 5-9', phase: 'Expansion', title: 'Expand: deepen the 2-3 most responsive organizations. Publish content #11.' },
  { week_number: 13, date_range: 'Oct 12-16', phase: 'Expansion', title: 'Repurpose top-performing content. Day-90 review against Phase 1 success criteria. Set next 90-day plan Friday.' },
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

  const rows = MASTER_TIMELINE.map((w, i) => ({
    user_id: userId,
    title: w.title,
    phase: w.phase,
    week_number: w.week_number,
    date_range: w.date_range,
    status: i === 0 ? 'In Progress' : 'Not Started',
    sort_order: w.week_number,
  }));
  await supabase.from('roadmap_items').insert(rows);
}

export async function getThisWeekBuild() {
  const userId = await getUserId();
  const { data, error } = await supabase.from('roadmap_items').select('*')
    .eq('user_id', userId).eq('status', 'In Progress').order('week_number').limit(1).maybeSingle();
  if (error) throw error;
  return data;
}
