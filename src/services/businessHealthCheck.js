import { listOverdueContacts } from './contacts.js';
import { getWeeklyScorecard } from './businessActivityLog.js';
import { supabase } from '../lib/supabaseClient.js';

async function getUserId() {
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id;
}

// ============================================================
// BUSINESS HEALTH CHECK — surfaces the actual Troubleshooting rule
// that applies right now, checked against real data, instead of a
// static list you have to remember to go read. Only checks
// conditions that are genuinely verifiable from what's in the app —
// website traffic and content performance need external analytics
// this app doesn't have, so those stay as reference-only.
// ============================================================

export async function checkBusinessHealth() {
  const alerts = [];

  const [overdue, scorecard] = await Promise.all([listOverdueContacts(), getWeeklyScorecard()]);

  const stalePartners = overdue.filter(c => c.category === 'Referral Partner');
  if (stalePartners.length > 0) {
    alerts.push({
      title: 'A partner relationship has gone quiet',
      detail: `${stalePartners.length} referral partner${stalePartners.length === 1 ? '' : 's'} overdue for a touch: ${stalePartners.slice(0, 3).map(c => c.name).join(', ')}${stalePartners.length > 3 ? '...' : ''}`,
      guidance: "One check-in with a resource attached (not just \u201chi\u201d) \u2014 if still quiet after a quarter, move to occasional value-touch only. Don't force it.",
      link: '/business/relationships',
    });
  }

  const staleLeads = overdue.filter(c => c.category === 'Lead');
  if (staleLeads.length > 0) {
    alerts.push({
      title: 'A lead has gone quiet after initial contact',
      detail: `${staleLeads.length} lead${staleLeads.length === 1 ? '' : 's'} overdue: ${staleLeads.slice(0, 3).map(c => c.name).join(', ')}${staleLeads.length > 3 ? '...' : ''}`,
      guidance: 'One value-based follow-up (resource, not a check-in) \u2014 if still quiet after 2 weeks, move to their timeline-appropriate nurture cadence and stop chasing.',
      link: '/business/pipeline',
    });
  }

  const totalActivity = scorecard.conversation + scorecard.partner_touch + scorecard.content_published + scorecard.follow_up;
  if (totalActivity === 0) {
    alerts.push({
      title: "Nothing logged on the scorecard this week",
      detail: 'All four activity counts are still at zero.',
      guidance: 'Stop and check Decision Rules, Rule 3: overdue Timeline items, then today\u2019s Dashboard, then this week\u2019s build \u2014 in that order, nothing else.',
      link: '/business',
    });
  } else if (scorecard.content_published === 0) {
    alerts.push({
      title: 'No content published this week',
      detail: 'The other activity types have entries, but nothing under Content Published.',
      guidance: 'Pull from, in order: Buyer Question Bank \u2192 recent consultation questions \u2192 Facebook group conversations \u2192 this month\u2019s Local Intelligence findings.',
      link: '/business/content',
    });
  }

  return alerts;
}
