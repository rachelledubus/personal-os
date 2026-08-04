import { supabase } from '../lib/supabaseClient.js';

// ============================================================
// LIBRARY (Systems 13, 14, 15)
// These were prose documents meant to be copy-pasted verbatim. Seeded
// here with the real content from the manual — not placeholders — so
// nothing is lost in the move from document to database. Grows from
// here via the UI as new scripts/CTAs/prompts get written.
// ============================================================

async function getUserId() {
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id;
}

// ---------- Seed data (verbatim from Systems 13/14/15) ----------

const SEED_CTAS = [
  { audience: 'Relocation', stage: 'Awareness', cta_text: 'Get the Southwest Broward Relocation Guide', is_primary: true, page: 'Homepage / Relocation Page' },
  { audience: 'First-Time Buyers', stage: 'Awareness', cta_text: 'Get the First-Time Buyer Guide', is_primary: true, page: 'Buyer Page' },
  { audience: 'Future Homeowners', stage: 'Awareness', cta_text: 'Start Your Future Home Plan', is_primary: true, page: 'Future Buyer Page' },
  { audience: 'Sellers', stage: 'Awareness', cta_text: 'Create your home selling strategy', is_primary: true, page: 'Homepage' },
  { audience: 'General', stage: 'Engagement', cta_text: "Send me an address — I'll help verify the details.", page: 'School zone verification' },
  { audience: 'General', stage: 'Social', cta_text: "Comment 'GUIDE' and I'll send it over.", page: 'Social posts' },
  { audience: 'General', stage: 'Website', cta_text: 'Start Planning Your Southwest Broward Move', is_primary: true, page: 'Homepage' },
  { audience: 'Buyers', stage: 'Website', cta_text: 'Start Your Home Buying Plan', page: 'Buyer Page' },
  { audience: 'General', stage: 'Website', cta_text: 'Explore This Community', page: 'Neighborhood Pages' },
  { audience: 'Partners', stage: 'Partner', cta_text: 'Feel free to share this resource with anyone relocating to Southwest Broward.', page: 'Early partner relationship' },
  { audience: 'Partners', stage: 'Partner', cta_text: 'Add this to your relocation resources for incoming employees.', page: 'Active partnership' },
];

const SEED_SCRIPTS = [
  { section: 'Lead Follow-Up', situation: 'New website lead', script_text: "Hey [Name]! Just wanted to make sure the [guide/resource] actually made it to your inbox — did it? Also curious what's got you looking into [moving/buying/relocating]? No pressure at all, tons of people start researching way before they're actually ready lol" },
  { section: 'Lead Follow-Up', situation: 'No response, 3-5 days', script_text: "Hey [Name]! Just checking the guide actually landed okay lol. Let me know if any questions pop up while you're looking around!" },
  { section: 'Lead Follow-Up', situation: 'No response, 2 weeks', script_text: "Hey [Name]! Was updating some stuff and thought of you lol. Still thinking about [moving/buying], or has the timeline shifted? Either way is totally fine!" },
  { section: 'Lead Magnet Specific', situation: 'Relocation Guide', script_text: "Hey! Thanks for grabbing the Relocation Guide — curious what's got you looking into the area? Already planning the move, still researching, or just trying to wrap your head around it all?" },
  { section: 'Lead Magnet Specific', situation: 'Real Payment Guide', script_text: "Honestly that's one of the biggest things people get tripped up on — the purchase price is only part of the puzzle down here lol. Were you more just curious about the numbers, or are you actually starting to plan a move?" },
  { section: 'Sphere', situation: 'Reconnecting', script_text: "Hey [Name]! Sorry I've been MIA, life's been lifeing lately lol. How have you been??" },
  { section: 'Referral', situation: 'Asking for referrals', script_text: "Honestly one thing I'm working on is just being the person people think of when someone they know is stressed about a move lol. So if anyone in your circle starts talking about moving or buying here, send them my way!" },
  { section: 'Buyer Consultation', situation: 'Opening', script_text: "Before we get into houses, I really want to understand what you're actually trying to accomplish. Most people start with \"we just need a house,\" but there's usually a bigger reason underneath that — schools, commute, family, money, all of it." },
  { section: 'Common Objections', situation: '"We can find homes online ourselves"', script_text: "Totally fair! Where I usually come in is everything AROUND the house — is this neighborhood actually a good fit, are there costs you're not seeing, stuff about the property you'd want to know before you fall in love with it." },
  { section: 'Common Objections', situation: '"We want to wait for rates"', script_text: "Totally get that, but honestly nobody actually knows what rates are gonna do lol — and waiting can fix one thing while creating a different problem. I try to help people look at the whole picture: payment, what's out there right now, all of it." },
  { section: 'Partner Outreach', situation: 'Recruiter/HR introduction', script_text: "I help people relocating to Southwest Broward figure out their housing options before they even move down here. I've put together resources around the stuff that actually stresses people out about relocating — would love to hear what housing questions come up most for your employees!" },
  { section: 'Client Experience', situation: 'Weekly buyer update', script_text: "Quick update for the week: here's what happened — [update]. Here's what's next — [next step]. And here's what I need from you — [action]. As always, just let me know if anything comes up!" },
];

const SEED_PROMPTS = [
  { code: 'P1', category: 'Content Creation', title: 'Create a Complete Content Piece', use_for: 'Blogs, guides, long-form website content, educational articles', prompt_text: `You are my real estate content strategist and copywriter. Create a complete content piece using the following: Topic: [INSERT]  Audience: [INSERT]  Goal: [INSERT] Funnel stage: [Awareness / Consideration / Decision] Relevant information: [PASTE SOURCE MATERIAL] Follow my brand voice: [PASTE BRAND RULES] Requirements: answer the reader's actual question, explain complicated topics simply, include local context and numbers, include honest trade-offs, avoid generic realtor language, don't write like an advertisement, make the reader feel more prepared after reading. Structure: Title / Introduction / Main sections / Key takeaway / CTA. Make this feel like something a knowledgeable local expert would publish.` },
  { code: 'P2', category: 'Content Creation', title: 'Create SEO Website Content', use_for: 'Neighborhood pages, landing pages, blog posts', prompt_text: 'SEO title, meta description, headings, full copy, internal links.' },
  { code: 'P5', category: 'Content Creation', title: 'Content Repurposing Waterfall', use_for: 'One piece -> email, IG caption, Facebook post, 2 video scripts, carousel outline, partner version, FAQ', prompt_text: 'Take one flagship content piece and produce: email version, Instagram caption, Facebook group answer, two short video scripts, a partner-shareable version, and an FAQ entry — each under the target word count for its format.' },
  { code: 'P8', category: 'Client Communication', title: 'Write Client Email', use_for: 'Warm, professional, reassuring client updates', prompt_text: 'Purpose: [INSERT]. CRM context: [PASTE]. Desired outcome: [INSERT]. Under 150 words, one idea, one CTA, no sales pressure.' },
  { code: 'P9', category: 'Client Communication', title: 'Explain a Complex Topic', use_for: 'Insurance, inspections, HOAs, contracts', prompt_text: 'Topic: [INSERT]. Provide: simple explanation, why it matters, common misunderstandings, questions to ask, recommendation.' },
  { code: 'P10', category: 'Research & Intelligence', title: 'Market Research Assistant', use_for: 'Cooper City/Pembroke Pines/Plantation current info', prompt_text: 'Research current information for the three markets. Return current numbers, what changed, buyer/seller impact. Separate verified facts from interpretation.' },
  { code: 'P12', category: 'Business Strategy', title: 'Weekly Business Review', use_for: 'Analyze scorecard data', prompt_text: 'Analyze this week\'s scorecard: [PASTE]. Identify the biggest problem, whether it\'s an activity or conversion issue, the highest-leverage improvement, and what to stop doing.' },
  { code: 'P13', category: 'Business Strategy', title: 'Decision Filter', use_for: 'Evaluate a new opportunity against the roadmap', prompt_text: 'Opportunity: [INSERT]. Evaluate: revenue potential, time cost, alignment with current phase, opportunity cost. Classify as NOW / NEXT / LATER / IGNORE.' },
  { code: 'A6', category: 'Client Preparation', title: 'Consultation Preparation Brief', use_for: 'Client priorities, likely concerns, neighborhood matches', prompt_text: 'Given this consultation questionnaire and CRM context: [PASTE]. Produce: client priorities, likely concerns, top neighborhood matches with honest trade-offs, payment considerations, and questions to ask.' },
  { code: 'A9', category: 'Content Creation', title: 'Buyer Question Bank Management', use_for: 'Organize client/Facebook questions by pillar and priority', prompt_text: 'Given this list of recent buyer questions: [PASTE]. Organize by content pillar, journey stage, and priority. Recommend next month\'s content topics.' },
];

// ---------- Seed functions (only run if empty, never overwrite) ----------

export async function seedLibraryIfEmpty() {
  const userId = await getUserId();
  if (!userId) return;
  const [{ count: ctaCount }, { count: scriptCount }, { count: promptCount }] = await Promise.all([
    supabase.from('ctas').select('id', { count: 'exact', head: true }).eq('user_id', userId),
    supabase.from('scripts').select('id', { count: 'exact', head: true }).eq('user_id', userId),
    supabase.from('prompts').select('id', { count: 'exact', head: true }).eq('user_id', userId),
  ]);
  const inserts = [];
  if (!ctaCount) inserts.push(supabase.from('ctas').insert(SEED_CTAS.map(c => ({ ...c, user_id: userId }))));
  if (!scriptCount) inserts.push(supabase.from('scripts').insert(SEED_SCRIPTS.map(s => ({ ...s, user_id: userId }))));
  if (!promptCount) inserts.push(supabase.from('prompts').insert(SEED_PROMPTS.map(p => ({ ...p, user_id: userId }))));
  if (inserts.length > 0) await Promise.all(inserts);
}

// ---------- CRUD + search ----------

export async function listCtas(search = '') {
  const userId = await getUserId();
  let q = supabase.from('ctas').select('*').eq('user_id', userId).order('stage');
  const { data, error } = await q;
  if (error) throw error;
  if (!search) return data;
  return data.filter(c => (c.cta_text + c.audience).toLowerCase().includes(search.toLowerCase()));
}

export async function listScripts(search = '') {
  const userId = await getUserId();
  const { data, error } = await supabase.from('scripts').select('*').eq('user_id', userId).order('section');
  if (error) throw error;
  if (!search) return data;
  return data.filter(s => (s.situation + s.script_text + s.section).toLowerCase().includes(search.toLowerCase()));
}

export async function listPrompts(search = '') {
  const userId = await getUserId();
  const { data, error } = await supabase.from('prompts').select('*').eq('user_id', userId).order('category');
  if (error) throw error;
  if (!search) return data;
  return data.filter(p => (p.title + p.use_for + p.category).toLowerCase().includes(search.toLowerCase()));
}

export async function addCta(fields) {
  const userId = await getUserId();
  await supabase.from('ctas').insert({ ...fields, user_id: userId });
}
export async function addScript(fields) {
  const userId = await getUserId();
  await supabase.from('scripts').insert({ ...fields, user_id: userId });
}
export async function addPrompt(fields) {
  const userId = await getUserId();
  await supabase.from('prompts').insert({ ...fields, user_id: userId });
}

// ============================================================
// GAP SYNC — content read directly from the manual that was missing
// from the original seed (alternates/secondaries in CTA Library,
// several full script sections, and three entirely new reference
// categories: Decision Rules, If-This-Then-That, Trigger & Knowledge
// Capture). seedLibraryIfEmpty() only fires when a table has zero
// rows, which doesn't help here — the library isn't empty anymore.
// This checks each gap item against what already exists (exact text
// match) and inserts only what's actually missing, so it's safe to
// run more than once.
// ============================================================

const GAP_CTAS = [
  // Stage 1 alternates (ctas.stage is constrained to Awareness/Engagement/Website/Social/Partner)
  { audience: 'Relocation', stage: 'Awareness', cta_text: 'Explore Cooper City, Pembroke Pines, and Plantation before you move' },
  { audience: 'Relocation', stage: 'Awareness', cta_text: 'See what life is actually like in Southwest Broward' },
  { audience: 'Relocation', stage: 'Awareness', cta_text: 'Start planning your move with local insight' },
  { audience: 'First-Time Buyers', stage: 'Awareness', cta_text: 'Learn what Florida buyers need to know before making an offer' },
  { audience: 'First-Time Buyers', stage: 'Awareness', cta_text: 'Understand the process before you start touring homes' },
  { audience: 'Future Homeowners', stage: 'Awareness', cta_text: "Know what to do before you're ready to buy" },
  { audience: 'Future Homeowners', stage: 'Awareness', cta_text: 'Create your roadmap from renting to owning' },
  { audience: 'Sellers', stage: 'Awareness', cta_text: "Understand your home's current position" },
  { audience: 'Sellers', stage: 'Awareness', cta_text: 'Get a personalized selling plan' },
  { audience: 'General', stage: 'Engagement', cta_text: 'Not sure about the school zone? Send me the address.' },
  // Social alternates
  { audience: 'General', stage: 'Social', cta_text: 'Send this to someone planning a move.' },
  { audience: 'General', stage: 'Social', cta_text: "Comment 'MOVE' and I'll send you the relocation guide." },
  { audience: 'General', stage: 'Social', cta_text: 'Have a question about moving to Broward? Send me a message.' },
  { audience: 'General', stage: 'Social', cta_text: 'Send me your biggest question about buying in Florida.' },
  // Website secondaries + the Future Buyer Page's own primary wording
  { audience: 'General', stage: 'Website', cta_text: 'Explore neighborhoods, costs, and options before you decide', page: 'Homepage' },
  { audience: 'Relocation', stage: 'Website', cta_text: 'Compare communities before making your move', page: 'Relocation Page' },
  { audience: 'Buyers', stage: 'Website', cta_text: 'Understand the process before you start touring homes', page: 'Buyer Page' },
  { audience: 'Future Homeowners', stage: 'Website', cta_text: 'Create Your Future Home Plan', is_primary: true, page: 'Future Buyer Page' },
  { audience: 'Future Homeowners', stage: 'Website', cta_text: "Build your roadmap before you're ready to buy", page: 'Future Buyer Page' },
  { audience: 'General', stage: 'Website', cta_text: 'See if this area actually fits your lifestyle', page: 'Neighborhood Pages' },
  // Partner CTAs not yet in the library
  { audience: 'Partners', stage: 'Partner', cta_text: 'Schedule a housing education session for your team.', page: 'Workshop' },
  { audience: 'Partners', stage: 'Partner', cta_text: 'Help your candidates feel confident about relocating.', page: 'Recruiter / hiring partners' },
  { audience: 'General', stage: 'Engagement', cta_text: "Send me an address — I'll help verify the details." },
  { audience: 'General', stage: 'Social', cta_text: 'Save this for when you\u2019re ready.' },
  { audience: 'General', stage: 'Social', cta_text: "Comment 'GUIDE' and I'll send it over." },
];

const GAP_SCRIPTS = [
  { section: 'Lead Magnet Specific', situation: 'Future Home Plan', script_text: "I made that for people who know they'll buy eventually but don't want to feel rushed or blindsided when the time comes. Where are you at right now?" },
  { section: 'Sphere', situation: 'Quarterly referral reminder', script_text: "Hey [Name]! Was putting together my market update and thought you'd actually find this interesting. [Share insight] Also if you ever hear anyone talking about moving to South Florida, send them my way — happy to help!" },
  { section: 'Referral', situation: 'After closing', script_text: "Honestly my favorite part of this job is helping people feel confident through something that can be really stressful. If you know anyone even thinking about moving, I'd love an intro — doesn't matter if they're months out!" },
  { section: 'Buyer Consultation', situation: '"We don\'t know where we want to live"', script_text: "Honestly that's super common, don't worry lol. Most people don't actually need listings first — they need help figuring out what actually fits their life." },
  { section: 'Relocation', situation: "Doesn't know the areas", script_text: "Two cities can look close on a map but feel completely different once you're actually living there. My job isn't just showing you houses — it's helping you understand what each area actually FEELS like day to day." },
  { section: 'Relocation', situation: 'Concerned about Florida', script_text: "I totally get the hesitation — Florida's had a lot of headlines around insurance, storms, cost of living. I'm not gonna pretend those things aren't real, but I can help you understand what actually applies to the specific home and area you're looking at." },
  { section: 'Future Buyers / Renters', situation: '"We\'re not ready yet"', script_text: "That's literally why I made resources for people planning ahead! Honestly the people who feel most confident buying are the ones who started learning before they felt any pressure to." },
  { section: 'Future Buyers / Renters', situation: 'Renter planning to buy later', script_text: "Renting while you prep to buy can honestly be a smart move! The big thing is making sure your rent, savings, credit, and timeline are all actually moving you toward the goal — that's the part I help people map out." },
  { section: 'Partner Outreach', situation: 'Partner follow-up', script_text: "Wanted to send this over because I thought it could genuinely help your team! No pressure for anyone to use me — I just want people moving here to have accurate info before they show up." },
  { section: 'Social Media', situation: 'Comment reply', script_text: "Ah great question! Honestly a lot of people relocating here wonder the same thing. Short answer: [answer]. Really depends on [factor] though. Happy to help you compare areas if you want!" },
  { section: 'Social Media', situation: 'DM from social media', script_text: "Hey! Thanks for reaching out :) what got you looking into [topic]?" },
  { section: 'Client Experience', situation: 'Under contract reassurance', script_text: "I know this part can feel like a LOT because there's so many moving pieces lol. My job is making sure you always know what's happening, what's coming up, and what to ask before something becomes an actual problem." },
  { section: 'Seller (minimal system)', situation: 'Homeowner inquiry', script_text: "Hey, thanks for reaching out! Before we get into listing stuff, I like to understand what's actually driving the move — are you thinking about selling soon, or mostly just trying to understand your options right now?" },
];

const GAP_DECISION_RULES = [
  { section: 'Decision Rules', situation: 'What deadline do I give this?', script_text: 'Sort by size, don\'t estimate from scratch. Quick (under 2hrs) → due in 3 days. Medium (half a day) → due in 1 week. Large build → due end of its assigned week on the Timeline. Nothing fits → due end of this week, no exceptions. A slightly-wrong deadline you use beats a perfect one you spent 20 minutes deciding on.' },
  { section: 'Decision Rules', situation: 'Does this go on the Timeline or the Dashboard?', script_text: 'Has a finish line → Timeline. Repeats forever → Dashboard. A guide, a page, a funnel gets built once and is done: Timeline. A conversation, a follow-up, a post happens again next week regardless: Dashboard. Not sure → Dashboard is the default, the safer catch-net.' },
  { section: 'Decision Rules', situation: 'What do I work on first today?', script_text: "Overdue Timeline items, then today's Dashboard boxes, then this week's Timeline build — in that order, every day, no exceptions. If nothing is overdue, start with the Dashboard." },
  { section: 'Decision Rules', situation: 'Should I add this new idea as a project?', script_text: "Ask: does it improve revenue, relationships, or systems, right now? If no — or not sure — it goes on the future roadmap, not the calendar. Decide at the monthly review, not in the moment the idea shows up." },
  { section: 'Decision Rules', situation: "A task doesn't fit anywhere on my system — now what?", script_text: "Write it down. Don't act on it and don't decide about it yet. Bring it to the Friday review — every open question gets a home once a week, not the second it appears." },
  { section: 'Decision Rules', situation: "My phone is ringing and I don't recognize the number — what do I do?", script_text: "Let it go to voicemail. Text back once you see who it was. A saved contact calling is fine — this rule is only for unrecognized numbers. You never have to answer live to something unexpected." },
];

const GAP_TROUBLESHOOTING = [
  { section: 'Troubleshooting — Pipeline & Activity', situation: 'No consultations booked this week', script_text: 'Increase outreach volume this week only → 2 extra partner touches → 1 extra sphere conversation → post a buyer-focused CTA. Change the volume first, not the offer.' },
  { section: 'Troubleshooting — Pipeline & Activity', situation: "Activity is happening but nothing is converting", script_text: "This is a conversion problem, not an activity problem. Review messaging, the consultation process, and lead quality — don't add more activity on top of a broken step." },
  { section: 'Troubleshooting — Pipeline & Activity', situation: 'A lead goes quiet after initial contact', script_text: 'One value-based follow-up (resource, not a check-in) → if still quiet after 2 weeks, move to their timeline-appropriate nurture cadence and stop chasing.' },
  { section: 'Troubleshooting — Content & Visibility', situation: 'Website traffic drops', script_text: 'Publish a blog post from the Buyer Question Bank → share it in a relevant Facebook group → send it to the email list → add internal links from related pages.' },
  { section: 'Troubleshooting — Content & Visibility', situation: 'You have no content ideas for the week', script_text: "Pull from, in order: Buyer Question Bank → recent consultation questions → Facebook group conversations → this month's Local Intelligence findings." },
  { section: 'Troubleshooting — Content & Visibility', situation: 'A piece of content underperforms', script_text: "Don't abandon the topic — check whether it answered a real question, included local specifics, and had a clear next step (Content Quality Checklist). Fix the piece before assuming the topic was wrong." },
  { section: 'Troubleshooting — Relationships & Referrals', situation: 'No referrals this month', script_text: "Don't ask for referrals directly. Instead: increase value-touches to Tier 1 sphere → check in with 2 dormant professional partners → review who's due for a quarterly touch." },
  { section: 'Troubleshooting — Relationships & Referrals', situation: 'A partner relationship has gone quiet', script_text: "One check-in with a resource attached (not just 'hi') → if still quiet after a quarter, move to occasional value-touch only. Don't force it." },
  { section: 'Troubleshooting — Capacity & Overwhelm', situation: "You're behind on the week's Dashboard boxes", script_text: "Don't try to catch up on everything — do today's four boxes only. Yesterday's gap stays a gap; the week resets Monday, not by cramming." },
  { section: 'Troubleshooting — Capacity & Overwhelm', situation: 'A Timeline build is running behind', script_text: 'It slides to next week automatically — the daily rhythm on the Dashboard does not pause to let it catch up.' },
  { section: 'Troubleshooting — Capacity & Overwhelm', situation: 'Everything feels like too much at once', script_text: 'Stop and check Decision Rules, Rule 3: overdue Timeline items, then today\'s Dashboard, then this week\'s build — in that order, nothing else.' },
];

const GAP_TRIGGERS = [
  { section: 'Trigger — Content', situation: 'A buyer question gets asked more than once (client, Facebook group, consultation)', script_text: 'Answer publicly → add to Buyer Question Bank → becomes a Reel/social post → becomes a blog → becomes an email → saved in Knowledge Base.' },
  { section: 'Trigger — Content', situation: 'Interest rates or market conditions shift', script_text: 'Run the Monthly Intelligence prompt → market update post → email to database → update any website page that references old numbers.' },
  { section: 'Trigger — Content', situation: 'A listing goes under contract or closes', script_text: 'Log in Transaction Review → story/carousel if client agrees → blog if there\'s a teachable moment → newsletter mention.' },
  { section: 'Trigger — Relationship', situation: 'Someone recommends a vendor or contractor', script_text: 'Research them → add a Vendor Database entry → request a coffee/intro → ask about their referral needs → log in Relationship Database.' },
  { section: 'Trigger — Relationship', situation: 'A sphere or past client shares a life update', script_text: 'Log the update in their Contact Record → send a genuine reply, no pitch → note it as a future value-touch opportunity.' },
  { section: 'Trigger — Relationship', situation: 'A new local business opens nearby', script_text: 'Visit → feature it (Local Business Spotlight) → post → add to the neighborhood\'s local resource list.' },
  { section: 'Trigger — Local Knowledge', situation: 'You learn something changed (HOA, school boundary, development, insurance)', script_text: 'Add it to the Local Intelligence System → flag as a content opportunity → goes in next Monthly Intelligence Report → update any website page it affects.' },
  { section: 'Trigger — Local Knowledge', situation: "A client asks something your Knowledge Base doesn't answer well", script_text: 'Research the gap → update the relevant Community Intelligence entry → note it as a content opportunity.' },
  { section: 'Trigger — Local Knowledge', situation: 'You notice a pattern across several consultations (same concern, same objection)', script_text: 'Add to Buyer Question Bank → review monthly for next month\'s content topics.' },
];

const GAP_PROMPTS = [
  { code: 'P3', category: 'Content Creation', title: 'Create Neighborhood Content', use_for: 'Turns the Neighborhood Database into a page/post — overview, lifestyle, housing, pricing, schools, commute, best fit' },
  { code: 'P4', category: 'Content Creation', title: 'Social Media Content Generator', use_for: 'Instagram/Facebook/TikTok — hook, caption, supporting points, CTA, visual format' },
  { code: 'P6', category: 'Marketing Assets', title: 'Create a Lead Magnet', use_for: 'Full magnet build — title, promise, outline, CTA, landing page copy, email follow-up ideas' },
  { code: 'P7', category: 'Marketing Assets', title: 'Landing Page Creator', use_for: 'Conversion-focused page — SEO title, hero, benefits, trust section, FAQ, CTA buttons, thank-you page' },
  { code: 'P11', category: 'Research & Intelligence', title: 'Convert Research Into Client Value', use_for: 'Turns raw research into what clients need to know, consultation talking points, content ideas, FAQ answers' },
  { code: 'P14', category: 'AI Editing & Quality Control', title: 'Make AI Content Sound Like Me', use_for: 'Rewrites draft content warmer, more human, less generic, less "AI" — removes clichés while keeping meaning' },
  { code: 'P15', category: 'AI Editing & Quality Control', title: 'Final Content Quality Check', use_for: 'Pre-publish review — brand voice, audience fit, accuracy of claims' },
].map(p => ({ ...p, prompt_text: p.use_for })); // manual only tables these at directory level (P1 is the only one kept in full) — same fidelity as the app's existing P2/P5/etc entries

// AI Workflow Library — System 12. Only A1 and A7 have full verbatim
// prompts in the manual ("the two most load-bearing... kept in full");
// the other seven are purpose descriptions only, same treatment as the
// P3/P4/P6/etc. entries directly above.
const GAP_AI_WORKFLOW_LIBRARY = [
  {
    code: 'A1', category: 'AI Workflow Library', title: 'Monthly Market Research',
    use_for: 'Maintain current Southwest Broward intelligence — compare findings against the previous report, return what changed, why it matters, and content opportunities',
    prompt_text: "Run my Southwest Broward monthly research checklist. Research current information for: Cooper City, Pembroke Pines, Plantation, FL. Compare findings against my previous report. Return: (1) what changed (2) why it matters (3) whether it impacts my standing market insights (4) content opportunities created by the changes. Include sources. Do not add filler — focus on actionable changes.",
  },
  { code: 'A2', category: 'AI Workflow Library', title: 'Monthly Intelligence Report', use_for: 'Turn verified research into a client-facing authority asset — market update, development, insurance, schools, buyer/seller takeaways' },
  { code: 'A3', category: 'AI Workflow Library', title: 'Content Creation + Repurposing', use_for: 'Turn one content brief into flagship content, a database email, two short video scripts, a Facebook response, and a partner-shareable version' },
  { code: 'A4', category: 'AI Workflow Library', title: 'Partner-Specific Guide Creation', use_for: 'Customize the relocation guide for a specific audience/organization — commute, neighborhoods, housing concerns, relevant programs' },
  { code: 'A5', category: 'AI Workflow Library', title: 'Email & Client Communication', use_for: 'Draft personalized emails — under 150 words, one idea, one CTA, no sales pressure' },
  { code: 'A6', category: 'AI Workflow Library', title: 'Consultation Preparation Brief', use_for: 'Client priorities, likely concerns, top neighborhood matches with honest trade-offs, payment considerations, questions to ask' },
  {
    code: 'A7', category: 'AI Workflow Library', title: 'SOP Creation',
    use_for: 'Convert a repeated manual task into a documented system',
    prompt_text: "I have been completing this task manually: [describe task]. Interview me with up to 6 questions. Then create an SOP using this format: Purpose / Outcome / When To Use / Process / Tools / Templates / Automation Opportunities / Metrics / Maintenance. Match my existing business operating system style.",
  },
  { code: 'A8', category: 'AI Workflow Library', title: 'Business Review Analysis', use_for: 'Analyze scorecards — leading indicators, underperforming sources, bottleneck, highest-leverage next action' },
  { code: 'A9', category: 'AI Workflow Library', title: 'Buyer Question Bank Management', use_for: 'Organize client/Facebook questions by content pillar, journey stage, and priority — recommend next month\u2019s topics' },
].map(p => ({ ...p, prompt_text: p.prompt_text || p.use_for }));

const GAP_PHONE_BOUNDARIES = [
  { section: 'Phone & Communication Boundaries', situation: 'Voicemail greeting', script_text: "Hi, you've reached Rachelle with [Brokerage]! I can't get to the phone right now, but text this number and I'll get right back to you — or grab a time on my calendar at [booking link]. Thanks so much!" },
  { section: 'Phone & Communication Boundaries', situation: 'Texting back a missed call', script_text: "Hey, this is Rachelle — sorry I missed you! Feel free to just text me what you need, or if you'd rather actually talk, here's my booking link: [booking link]" },
];

const GAP_OUTREACH_PLAYBOOK = [
  { section: 'Sphere Conversations', situation: 'Reconnection', script_text: "Hey, sorry I've been MIA! Life's been lifeing lately lol. How have you been??" },
  { section: 'Sphere Conversations', situation: 'Casual check-in', script_text: "Hey!! Randomly thinking about you, how's life been treating you?" },
  { section: 'Sphere Conversations', situation: 'Former coworker', script_text: "Omg I was just thinking about [old job] the other day lol. How've you been??" },
  { section: 'Sphere Conversations', situation: 'Old friend', script_text: "Randomly thought of you today lol. How's life been??" },
  { section: 'Sphere Conversations', situation: 'When real estate comes up', script_text: "Ooh that's exciting!! Are you like actually looking or just thinking about it rn?" },
  { section: 'Community Conversations', situation: 'If they ask what you do', script_text: "I help people figure out Southwest Broward when they're thinking about moving or buying — basically which areas actually fit their life before they commit to anything." },
  { section: 'Professional Partner Outreach', situation: 'Professional introduction', script_text: "Hi [Name], I came across your work with [organization] and wanted to say hi! I help people navigate Southwest Broward when they're relocating or buying — a lot of people struggle to actually understand the area before making a move, so I put together resources that make that easier. Thought they might be useful for the people you work with." },
  { section: 'Referral Conversations', situation: 'Asking about referrals', script_text: "Honestly a lot of my business comes from just helping people figure things out before they're ready to buy. If you ever hear someone talking about moving to Southwest Broward, send them my way — happy to just be a resource, no pressure." },
  { section: 'Outreach Scripts', situation: 'Local business introduction', script_text: "Hi! I'm Rachelle — I help people navigate Southwest Broward real estate. I'm trying to get to know more of the local businesses and what makes these communities actually special. Would love to hear your story and what you do here." },
  { section: 'Outreach Scripts', situation: 'Community member introduction', script_text: "I've been spending more time learning what people actually love about living here, since I want to help people moving in understand what daily life is really like. What's something you think people should know about this community?" },
  { section: 'Outreach Scripts', situation: 'Past contact reconnect', script_text: "Hey, sorry I've been MIA! Life's been lifeing lately lol. How have you been??" },
  { section: 'Outreach Scripts', situation: 'Someone mentions a move', script_text: "Ooh that's exciting!! Are you like actually looking or just thinking about it rn?" },
];

export const RELATIONSHIP_ENERGY_SCALE = [
  { level: 'Low', actions: 'React to a story, comment on a post, send a resource, congratulate an achievement, reply to an update', goal: 'Maintain connection' },
  { level: 'Medium', actions: 'Send a personal text, have a short conversation, follow up with someone you met, ask a genuine question', goal: 'Strengthen familiarity' },
  { level: 'High', actions: 'Coffee meetings, networking events, community events, phone calls, in-person introductions', goal: 'Deepen important relationships' },
];

export const DAILY_CONVERSATION_ROUTINE = [
  { version: 'Minimum (low energy)', time: '10 min', includes: 'Reply to messages, comment on 2 posts, send 1 check-in message' },
  { version: 'Standard', time: '30 min', includes: '3 personal touches, 1 professional/community interaction, follow up on previous conversations' },
  { version: 'Growth', time: '60 min', includes: 'Sphere outreach, partner outreach, community engagement, relationship updates' },
];

export async function syncLibraryGaps() {
  const userId = await getUserId();
  if (!userId) return { added: 0 };

  const [{ data: existingCtas }, { data: existingScripts }, { data: existingPrompts }] = await Promise.all([
    supabase.from('ctas').select('cta_text').eq('user_id', userId),
    supabase.from('scripts').select('situation, section').eq('user_id', userId),
    supabase.from('prompts').select('code').eq('user_id', userId),
  ]);
  const ctaTexts = new Set((existingCtas || []).map(c => c.cta_text));
  const scriptKeys = new Set((existingScripts || []).map(s => `${s.section}||${s.situation}`));
  const promptCodes = new Set((existingPrompts || []).map(p => p.code));

  const newCtas = GAP_CTAS.filter(c => !ctaTexts.has(c.cta_text));
  const allGapScripts = [...GAP_SCRIPTS, ...GAP_DECISION_RULES, ...GAP_TROUBLESHOOTING, ...GAP_TRIGGERS, ...GAP_PHONE_BOUNDARIES, ...GAP_OUTREACH_PLAYBOOK];
  const newScripts = allGapScripts.filter(s => !scriptKeys.has(`${s.section}||${s.situation}`));
  const newPrompts = [...GAP_PROMPTS, ...GAP_AI_WORKFLOW_LIBRARY].filter(p => !promptCodes.has(p.code));

  const inserts = [];
  if (newCtas.length) inserts.push(supabase.from('ctas').insert(newCtas.map(c => ({ ...c, user_id: userId }))));
  if (newScripts.length) inserts.push(supabase.from('scripts').insert(newScripts.map(s => ({ ...s, user_id: userId }))));
  if (newPrompts.length) inserts.push(supabase.from('prompts').insert(newPrompts.map(p => ({ ...p, user_id: userId }))));
  if (inserts.length) await Promise.all(inserts);

  return { added: newCtas.length + newScripts.length + newPrompts.length };
}

// ============================================================
// VOICE REFRESH — every genuinely conversational script (not the
// internal reference content: Decision Rules, Troubleshooting,
// Triggers, which are diagnostic notes to yourself, not things you'd
// actually say to a person) rewritten to match a real voice sample
// rather than the business manual's generic reconnection-advice
// phrasing. syncLibraryGaps() only ever adds missing scripts, so a
// script you'd already synced would stay stale forever without this
// — this does a real update by (section, situation), then adds
// anything genuinely missing too, so it doubles as a full sync.
// ============================================================

export async function refreshScriptVoice() {
  const userId = await getUserId();
  if (!userId) return { updated: 0, added: 0 };

  const allConversational = [...SEED_SCRIPTS, ...GAP_SCRIPTS, ...GAP_PHONE_BOUNDARIES, ...GAP_OUTREACH_PLAYBOOK];

  const { data: existing } = await supabase.from('scripts').select('id, section, situation').eq('user_id', userId);
  const existingByKey = new Map((existing || []).map(s => [`${s.section}||${s.situation}`, s.id]));

  let updated = 0, added = 0;
  const toInsert = [];
  for (const s of allConversational) {
    const key = `${s.section}||${s.situation}`;
    const existingId = existingByKey.get(key);
    if (existingId) {
      const { error } = await supabase.from('scripts').update({ script_text: s.script_text }).eq('id', existingId);
      if (!error) updated += 1;
    } else {
      toInsert.push(s);
    }
  }
  if (toInsert.length > 0) {
    const { error } = await supabase.from('scripts').insert(toInsert.map(s => ({ ...s, user_id: userId })));
    if (!error) added = toInsert.length;
  }

  return { updated, added };
}

