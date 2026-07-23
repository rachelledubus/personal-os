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
  { section: 'Lead Follow-Up', situation: 'New website lead', script_text: "Hey [Name]! I saw you grabbed my [guide/resource]. I wanted to make sure you got it and see what sparked your interest in [moving/buying/relocating]? No pressure at all — a lot of people start researching months before they're actually ready." },
  { section: 'Lead Follow-Up', situation: 'No response, 3-5 days', script_text: "Hey [Name]! Just wanted to make sure the guide came through okay. If you have questions while researching, I'm always happy to help." },
  { section: 'Lead Follow-Up', situation: 'No response, 2 weeks', script_text: "Hey [Name]! I was updating some local resources and thought about you. Are you still thinking about [moving/buying], or has your timeline changed? Either way is totally fine." },
  { section: 'Lead Magnet Specific', situation: 'Relocation Guide', script_text: "Thanks for grabbing my Southwest Broward Relocation Guide. I'm curious — what has you looking into the area? Already planning a move, researching, or just trying to understand the areas?" },
  { section: 'Lead Magnet Specific', situation: 'Real Payment Guide', script_text: "That's actually one of the biggest things I help people figure out because the purchase price is only one piece of the puzzle in Florida. Were you mainly curious about your budget, or starting to seriously plan a move?" },
  { section: 'Sphere', situation: 'Reconnecting', script_text: "Hey [Name]! It's been forever — I was thinking about you and realized we haven't caught up in a while. How have you been?" },
  { section: 'Referral', situation: 'Asking for referrals', script_text: "One thing I'm trying to do is become the person people think of when someone they know is overwhelmed by a move. If someone in your circle starts talking about moving, buying, or relocating here, I'd love to be a resource for them." },
  { section: 'Buyer Consultation', situation: 'Opening', script_text: "Before we talk houses, I want to understand what you're actually trying to accomplish. A lot of people start with 'we need a house,' but usually there's a bigger reason — schools, commute, lifestyle, family, finances." },
  { section: 'Common Objections', situation: '"We can find homes online ourselves"', script_text: "Where I usually help is everything around the house: is this neighborhood actually a good fit, are there costs you're not seeing, are there things about the property you should know before getting attached?" },
  { section: 'Common Objections', situation: '"We want to wait for rates"', script_text: "The hard part is nobody knows exactly what rates will do, and waiting can solve one problem while creating another. I help people look at the bigger picture: payment, inventory, opportunities right now." },
  { section: 'Partner Outreach', situation: 'Recruiter/HR introduction', script_text: "I specialize in helping people relocating to Southwest Broward understand their housing options before they move. I created resources focused on the questions that create relocation stress. I'd love to learn what housing questions come up most often for your employees." },
  { section: 'Client Experience', situation: 'Weekly buyer update', script_text: "Quick update for this week: What happened: [update]. What's next: [next step]. What I need from you: [action]. As always, if anything comes up, just let me know." },
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
