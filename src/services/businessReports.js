import { supabase } from '../lib/supabaseClient.js';
import { getPreference, setPreference } from './settings.js';
import { listContacts } from './contacts.js';
import { listTransactions } from './transactions.js';
import { listContentPieces } from './contentEngine.js';

async function getUserId() {
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id;
}

// ============================================================
// CEO DASHBOARD — System (Reference) 00. The manual's own template is
// mostly fill-in-the-blank ("___________") — auto-computing GCI,
// website visitors, or partner-conversation counts isn't honestly
// possible from what this app tracks, so those stay manual entry,
// same as the manual intends. A few fields (active clients, closings
// this month, flagship content published) ARE cleanly derivable from
// real data, so those pre-fill as a starting point, editable either
// way. One row per month, same storage pattern as Monthly Theme.
// ============================================================

const CEO_DASHBOARD_CATEGORY = 'ceo_dashboard';

export async function getCeoDashboard(monthKey) {
  return await getPreference(CEO_DASHBOARD_CATEGORY, monthKey, null);
}

export async function saveCeoDashboard(monthKey, data) {
  await setPreference(CEO_DASHBOARD_CATEGORY, monthKey, data);
}

/** Only the fields honestly derivable from real data — everything else
 *  in the manual's template (GCI, downloads, referrals, partner
 *  conversations, sphere touches, reviews) has no tracking system
 *  behind it yet and stays manual, not silently guessed. */
export async function getAutoStatsForMonth(monthKey) {
  const [y, m] = monthKey.split('-').map(Number);
  const monthStart = `${monthKey}-01`;
  const monthEnd = new Date(y, m, 0).toISOString().slice(0, 10); // last day of the month

  const [leads, activeClients, transactions, content] = await Promise.all([
    listContacts('Lead'),
    listContacts('Active Client'),
    listTransactions(),
    listContentPieces ? listContentPieces() : Promise.resolve([]),
  ]);

  const closingsThisMonth = (transactions || []).filter(t => t.closing_date >= monthStart && t.closing_date <= monthEnd).length;
  const flagshipPublished = (content || []).filter(c => c.status === 'published' && c.published_date >= monthStart && c.published_date <= monthEnd).length;

  return {
    active_leads: leads.length,
    active_clients: activeClients.length,
    closings_this_month: closingsThisMonth,
    flagship_content_published: flagshipPublished,
  };
}

// ============================================================
// ANNUAL CAMPAIGN CALENDAR — System (Reference) 00. Fully static —
// "same four quarters, every year," per the manual. No per-user data,
// just the reference itself plus which quarter is current.
// ============================================================

export const ANNUAL_CAMPAIGN_CALENDAR = [
  {
    quarter: 'Q1', months: 'Jan \u2013 Mar', theme: 'Future Buyer Planning',
    audience: "Future homeowners and renters planning ahead \u2014 New Year's \u201cthis is our year\u201d energy",
    why_now: 'Natural planning mindset at the start of the year; buyers with a spring/summer move want to start preparing 3\u20136 months out',
    focus: 'Future Home Plan funnel \u00b7 credit/savings preparation content \u00b7 "what to do before you\'re ready" education',
  },
  {
    quarter: 'Q2', months: 'Apr \u2013 Jun', theme: 'Relocation Season',
    audience: 'Relocation buyers \u2014 peak relocation planning season for a summer move, timed around school years ending',
    why_now: 'Families relocating time their move around the school year; this is when relocation searches spike',
    focus: 'Relocation Starter Guide funnel \u00b7 city comparison content \u00b7 school zone verification content \u00b7 partner outreach to employers/recruiters ahead of summer transfers',
  },
  {
    quarter: 'Q3', months: 'Jul \u2013 Sep', theme: 'Families + School Zone',
    audience: 'Families mid-move or newly arrived \u2014 back-to-school timing',
    why_now: 'New residents are settling in; school boundary and enrollment questions peak',
    focus: 'School zone verification content \u00b7 neighborhood guides \u00b7 "first month living in\u2026" community content \u00b7 first-time buyer education for those who delayed a spring purchase',
  },
  {
    quarter: 'Q4', months: 'Oct \u2013 Dec', theme: 'Sellers + Year-End Planning',
    audience: 'Homeowners considering selling \u00b7 past clients (holiday touch season)',
    why_now: '\u201cShould we sell\u201d conversations peak with year-end financial planning; holidays are natural low-pressure touch points for sphere and past clients',
    focus: 'Home Selling Strategy content \u00b7 equity/market-position education \u00b7 past-client holiday touches \u00b7 annual Intelligence Report recap',
  },
];

export function currentQuarter() {
  const month = new Date().getMonth(); // 0-11
  return Math.floor(month / 3); // 0=Q1, 1=Q2, 2=Q3, 3=Q4
}

// ============================================================
// SYSTEM STATUS INDEX — System (Reference) 00. Master index for the
// 16-folder operating system. "The system is frozen \u2014 no rewrites, no
// new systems. Status changes only." Seeded from the manual, editable
// per-folder status only (not the folder list itself, which the
// manual explicitly says doesn't change outside a quarterly review).
// ============================================================

export const STATUS_LEGEND = {
  active: { label: 'Active System', symbol: '\u2705', description: 'Run per its operating rhythm. No rebuilds.' },
  building: { label: 'Building', symbol: '\ud83d\udee0', description: 'In the current 90-day plan. One major build per month.' },
  later: { label: 'Later', symbol: '\u23f8', description: 'On the future roadmap. Not touched until a quarterly review promotes it.' },
  ai_assisted: { label: 'AI-Assisted', symbol: '\ud83e\udd16', description: 'Reference library. Pulled from as needed; maintained by AI workflows.' },
};

const DEFAULT_SYSTEM_STATUS_FOLDERS = [
  { number: '01', name: 'Brand Identity', status: 'active', note: 'Voice Guide governs all output. Reference only \u2014 no revisions.' },
  { number: '02', name: 'Local Knowledge', status: 'active', note: 'Active daily (Knowledge block). Neighborhood guides queued for Month 2.' },
  { number: '03', name: 'Content Engine', status: 'active', note: 'Minimum output: 1 flagship piece per week.' },
  { number: '04', name: 'Business Growth', status: 'active', note: 'Active. Sub-system 04C Lead Magnet & Funnel is the exception \u2014 in build (Month 1).' },
  { number: '05', name: 'Relationship Growth', status: 'active', note: 'Daily sphere touches, weekly partner outreach. 05D Professional Network activates Month 2.' },
  { number: '06', name: 'Research', status: 'ai_assisted', note: 'Not a business system \u2014 the research assistant framework. Run on demand.' },
  { number: '07', name: 'CRM & Follow-Up', status: 'building', note: 'First build of Month 1. Everything else feeds into it.' },
  { number: '08', name: 'Client Experience', status: 'active', note: 'Active standards. Consultation kit builds in Month 2.' },
  { number: '09', name: 'Business Management', status: 'active', note: 'Weekly review every Friday, 30 min. Monthly review first week of the month.' },
  { number: '10', name: 'Performance Review', status: 'active', note: 'Drives the Month 3 conversion review.' },
  { number: '11', name: 'Implementation Roadmap', status: 'active', note: 'Governs the 90-day plan. Reviewed quarterly \u2014 not monthly, not weekly.' },
  { number: '12', name: 'AI Automation', status: 'building', note: 'Workflows added only as repeated tasks appear. Expansion is a Phase 3 priority.' },
  { number: '13', name: 'CTA Library', status: 'ai_assisted', note: 'Pull from when publishing. Add CTAs as they\u2019re written.' },
  { number: '14', name: 'Script Library', status: 'ai_assisted', note: 'Pull from before calls and outreach.' },
  { number: '15', name: 'Prompt Library', status: 'ai_assisted', note: 'Reusable prompts from Systems 06 and 12.' },
  { number: '16', name: 'Template Library', status: 'ai_assisted', note: 'Built once, reused. Grows as deliverables are completed.' },
];

export const DO_NOT_BUILD_LIST = [
  'Create guides beyond the three in the 90-day plan',
  'Create new funnels beyond 04C',
  'Build new AI automations outside existing workflows',
  'Redesign or \u201cperfect\u201d the website',
  'Write scripts or templates speculatively \u2014 add them only when a task recurs',
  'Join organizations beyond the Month 2 outreach list',
];

export async function getSystemStatusFolders() {
  const stored = await getPreference('system_status', 'folders', null);
  return stored?.folders || DEFAULT_SYSTEM_STATUS_FOLDERS;
}

export async function setSystemStatusFolders(folders) {
  await setPreference('system_status', 'folders', { folders });
}
