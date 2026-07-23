-- ============================================================
-- Migration: Populate real sub-tasks for the 13-week Master Build Timeline
-- ============================================================
-- Every sub-task below is pulled from the actual BOS system docs
-- referenced by each week's "SYSTEM" column in 00_MASTER_BUILD_TIMELINE
-- (07 CRM, 03 Content Engine, 04C Lead Magnet & Funnel, 02 Local
-- Knowledge, 05D Professional Network, 08 Client Experience, 09 Weekly
-- Review, 10 Performance Review, 11 Roadmap) — not generic placeholders.
--
-- Each week: the roadmap_items.title is shortened to something
-- readable (the full original text moves into real, checkable
-- sub-tasks instead of being crammed into one line), then real
-- milestone rows are added under it.
--
-- Matches by exact title text (the seeded titles from timeline.js) —
-- if a title was already edited by hand, that week's block below
-- simply won't match anything and does nothing. Safe to run once;
-- re-running would create duplicate sub-tasks, so don't run twice.
-- ============================================================

-- ---------- Week 1: Build CRM Foundation (System 07) ----------
update roadmap_items set title = 'Build CRM Foundation'
  where user_id = '89223a54-2d73-4ed8-8714-f21f6a063d64' and title = 'Build CRM: contact categories, lead sources, pipeline stages';

insert into milestones (user_id, roadmap_item_id, title, sort_order)
select '89223a54-2d73-4ed8-8714-f21f6a063d64', id, sub.title, sub.ord
from roadmap_items, unnest(array[
  'Set up 7 contact categories: Lead, Future Client, Active Client, Past Client, Sphere, Partner, Agent Referral',
  'Set up lead source tracking: Relocation Guide, Real Payment Guide, Website SEO, Facebook group, Sphere referral, Partner referral',
  'Set up timeline/pipeline stages: Now (0-3mo), Soon (3-6mo), Future (6-12mo), Long Term (12mo+)'
]) with ordinality as sub(title, ord)
where roadmap_items.user_id = '89223a54-2d73-4ed8-8714-f21f6a063d64' and roadmap_items.title = 'Build CRM Foundation';

-- ---------- Week 2: Complete CRM + Publish Content #1 (Systems 07, 03) ----------
update roadmap_items set title = 'Complete CRM + Publish Content #1'
  where user_id = '89223a54-2d73-4ed8-8714-f21f6a063d64' and title = 'Build CRM: follow-up rules + tracking complete. Publish flagship content #1.';

insert into milestones (user_id, roadmap_item_id, title, sort_order)
select '89223a54-2d73-4ed8-8714-f21f6a063d64', id, sub.title, sub.ord
from roadmap_items, unnest(array[
  'Set follow-up standards per contact type (new inquiry, active buyer lead, future buyer, sphere, partner, past client)',
  'Set up tracking dashboard: database health, pipeline health, relationship health',
  'Pull a real buyer question and build a content brief',
  'Draft, fact-check, and run the quality checklist on flagship content #1',
  'Publish flagship content #1 and repurpose into 2+ formats'
]) with ordinality as sub(title, ord)
where roadmap_items.user_id = '89223a54-2d73-4ed8-8714-f21f6a063d64' and roadmap_items.title = 'Complete CRM + Publish Content #1';

-- ---------- Week 3: Draft Real Payment Guide + Content #2 (Systems 04C, 03) ----------
update roadmap_items set title = 'Draft Real Payment Guide + Content #2'
  where user_id = '89223a54-2d73-4ed8-8714-f21f6a063d64' and title = 'Real Payment Guide: outline + draft content. Publish flagship content #2.';

insert into milestones (user_id, roadmap_item_id, title, sort_order)
select '89223a54-2d73-4ed8-8714-f21f6a063d64', id, sub.title, sub.ord
from roadmap_items, unnest(array[
  'Outline Real Payment Guide: purchase price education, monthly cost breakdown, buyer preparation',
  'Draft the Real Payment Guide content',
  'Publish flagship content #2'
]) with ordinality as sub(title, ord)
where roadmap_items.user_id = '89223a54-2d73-4ed8-8714-f21f6a063d64' and roadmap_items.title = 'Draft Real Payment Guide + Content #2';

-- ---------- Week 4: Launch Real Payment Guide + Month 1 Review (Systems 04C, 09) ----------
update roadmap_items set title = 'Launch Real Payment Guide + Month 1 Review'
  where user_id = '89223a54-2d73-4ed8-8714-f21f6a063d64' and title = 'Real Payment Guide live + promotion. Relocation funnel outlined. Email nurture drafted. Publish flagship content #3. Month 1 review Friday.';

insert into milestones (user_id, roadmap_item_id, title, sort_order)
select '89223a54-2d73-4ed8-8714-f21f6a063d64', id, sub.title, sub.ord
from roadmap_items, unnest(array[
  'Real Payment Guide landing page live + promotion',
  'Outline the Relocation Starter Guide funnel',
  'Draft the 5-email nurture sequence',
  'Publish flagship content #3',
  'Run Month 1 review (Friday, System 09) — confirm CRM active, guide live, nurture sending, 4 consecutive weekly reviews done'
]) with ordinality as sub(title, ord)
where roadmap_items.user_id = '89223a54-2d73-4ed8-8714-f21f6a063d64' and roadmap_items.title = 'Launch Real Payment Guide + Month 1 Review';

-- ---------- Week 5: Cooper City Guide + Content #4 (Systems 02, 03) ----------
update roadmap_items set title = 'Cooper City Guide + Content #4'
  where user_id = '89223a54-2d73-4ed8-8714-f21f6a063d64' and title = 'Cooper City guide drafted. Email nurture finalized. Publish flagship content #4.';

insert into milestones (user_id, roadmap_item_id, title, sort_order)
select '89223a54-2d73-4ed8-8714-f21f6a063d64', id, sub.title, sub.ord
from roadmap_items, unnest(array[
  'Draft Cooper City neighborhood guide (community comparisons, lifestyle, buyer education)',
  'Finalize the email nurture sequence',
  'Publish flagship content #4'
]) with ordinality as sub(title, ord)
where roadmap_items.user_id = '89223a54-2d73-4ed8-8714-f21f6a063d64' and roadmap_items.title = 'Cooper City Guide + Content #4';

-- ---------- Week 6: Plantation Guide + Network List (Systems 02, 05D) ----------
update roadmap_items set title = 'Plantation Guide + Network List'
  where user_id = '89223a54-2d73-4ed8-8714-f21f6a063d64' and title = 'Plantation guide drafted. List 10 target organizations for 05D. Publish flagship content #5.';

insert into milestones (user_id, roadmap_item_id, title, sort_order)
select '89223a54-2d73-4ed8-8714-f21f6a063d64', id, sub.title, sub.ord
from roadmap_items, unnest(array[
  'Draft Plantation neighborhood guide',
  'List 10 target organizations for Professional Network outreach',
  'Publish flagship content #5'
]) with ordinality as sub(title, ord)
where roadmap_items.user_id = '89223a54-2d73-4ed8-8714-f21f6a063d64' and roadmap_items.title = 'Plantation Guide + Network List';

-- ---------- Week 7: Pembroke Pines Guide + Outreach Begins (Systems 02, 05D) ----------
update roadmap_items set title = 'Pembroke Pines Guide + Outreach Begins'
  where user_id = '89223a54-2d73-4ed8-8714-f21f6a063d64' and title = 'Pembroke Pines guide drafted. Begin outreach — first 5 organizations. Publish flagship content #6.';

insert into milestones (user_id, roadmap_item_id, title, sort_order)
select '89223a54-2d73-4ed8-8714-f21f6a063d64', id, sub.title, sub.ord
from roadmap_items, unnest(array[
  'Draft Pembroke Pines neighborhood guide',
  'Begin outreach to first 5 organizations (contribution first, no partnership asks yet)',
  'Publish flagship content #6'
]) with ordinality as sub(title, ord)
where roadmap_items.user_id = '89223a54-2d73-4ed8-8714-f21f6a063d64' and roadmap_items.title = 'Pembroke Pines Guide + Outreach Begins';

-- ---------- Week 8: Consultation Materials + Month 2 Review (Systems 08, 09) ----------
update roadmap_items set title = 'Consultation Materials + Month 2 Review'
  where user_id = '89223a54-2d73-4ed8-8714-f21f6a063d64' and title = 'Consultation presentation + buyer questionnaire built. Outreach to remaining 5 organizations. Publish flagship content #7. Month 2 review Friday.';

insert into milestones (user_id, roadmap_item_id, title, sort_order)
select '89223a54-2d73-4ed8-8714-f21f6a063d64', id, sub.title, sub.ord
from roadmap_items, unnest(array[
  'Build the consultation presentation',
  'Build the buyer questionnaire',
  'Outreach to the remaining 5 organizations',
  'Publish flagship content #7',
  'Run Month 2 review (Friday) — confirm all 3 neighborhood guides live, first conversation logged with each of the 10 organizations, consultation materials used in a real consultation'
]) with ordinality as sub(title, ord)
where roadmap_items.user_id = '89223a54-2d73-4ed8-8714-f21f6a063d64' and roadmap_items.title = 'Consultation Materials + Month 2 Review';

-- ---------- Week 9: Conversion Data Review (System 00A) ----------
update roadmap_items set title = 'Conversion Data Review'
  where user_id = '89223a54-2d73-4ed8-8714-f21f6a063d64' and title = 'Pull data: which content created conversations, which relationships created opportunities. Publish content #8.';

insert into milestones (user_id, roadmap_item_id, title, sort_order)
select '89223a54-2d73-4ed8-8714-f21f6a063d64', id, sub.title, sub.ord
from roadmap_items, unnest(array[
  'Pull data on which content created conversations',
  'Pull data on which relationships created opportunities',
  'Publish content #8'
]) with ordinality as sub(title, ord)
where roadmap_items.user_id = '89223a54-2d73-4ed8-8714-f21f6a063d64' and roadmap_items.title = 'Conversion Data Review';

-- ---------- Week 10: Activity vs. Results Diagnosis (System 10) ----------
update roadmap_items set title = 'Activity vs. Results Diagnosis'
  where user_id = '89223a54-2d73-4ed8-8714-f21f6a063d64' and title = 'Diagnose per System 10 rules: activity vs. results. Publish content #9.';

insert into milestones (user_id, roadmap_item_id, title, sort_order)
select '89223a54-2d73-4ed8-8714-f21f6a063d64', id, sub.title, sub.ord
from roadmap_items, unnest(array[
  'Run the System 10 diagnosis: activity vs. results across the month',
  'Publish content #9'
]) with ordinality as sub(title, ord)
where roadmap_items.user_id = '89223a54-2d73-4ed8-8714-f21f6a063d64' and roadmap_items.title = 'Activity vs. Results Diagnosis';

-- ---------- Week 11: Scale Top Lead Source (Systems 04, 07) ----------
update roadmap_items set title = 'Scale Top Lead Source'
  where user_id = '89223a54-2d73-4ed8-8714-f21f6a063d64' and title = 'Expand: double down on the top lead source. Publish content #10.';

insert into milestones (user_id, roadmap_item_id, title, sort_order)
select '89223a54-2d73-4ed8-8714-f21f6a063d64', id, sub.title, sub.ord
from roadmap_items, unnest(array[
  'Identify the top-performing lead source from the data review',
  'Double down / expand investment in that lead source',
  'Publish content #10'
]) with ordinality as sub(title, ord)
where roadmap_items.user_id = '89223a54-2d73-4ed8-8714-f21f6a063d64' and roadmap_items.title = 'Scale Top Lead Source';

-- ---------- Week 12: Deepen Top Partner Relationships (System 05D) ----------
update roadmap_items set title = 'Deepen Top Partner Relationships'
  where user_id = '89223a54-2d73-4ed8-8714-f21f6a063d64' and title = 'Expand: deepen the 2-3 most responsive organizations. Publish content #11.';

insert into milestones (user_id, roadmap_item_id, title, sort_order)
select '89223a54-2d73-4ed8-8714-f21f6a063d64', id, sub.title, sub.ord
from roadmap_items, unnest(array[
  'Identify the 2-3 most responsive professional network organizations',
  'Deepen those relationships',
  'Publish content #11'
]) with ordinality as sub(title, ord)
where roadmap_items.user_id = '89223a54-2d73-4ed8-8714-f21f6a063d64' and roadmap_items.title = 'Deepen Top Partner Relationships';

-- ---------- Week 13: Day-90 Review + Next Plan (Systems 11, 09) ----------
update roadmap_items set title = 'Day-90 Review + Next Plan'
  where user_id = '89223a54-2d73-4ed8-8714-f21f6a063d64' and title = 'Repurpose top-performing content. Day-90 review against Phase 1 success criteria. Set next 90-day plan Friday.';

insert into milestones (user_id, roadmap_item_id, title, sort_order)
select '89223a54-2d73-4ed8-8714-f21f6a063d64', id, sub.title, sub.ord
from roadmap_items, unnest(array[
  'Repurpose top-performing content into additional formats',
  'Run the Day-90 review against Phase 1 success criteria',
  'Set the next 90-day plan (Friday)'
]) with ordinality as sub(title, ord)
where roadmap_items.user_id = '89223a54-2d73-4ed8-8714-f21f6a063d64' and roadmap_items.title = 'Day-90 Review + Next Plan';
