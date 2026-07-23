// OWNER: REALTOR-OS (application)
// File: packages/realtor-os/config/states.js
// Purpose: Define lifecycle states for Leads, Clients, and Transactions.

export const LeadLifecycle = [
  'new',           // just captured
  'contacted',     // initial outreach done
  'nurturing',     // marketing/nurture sequence active
  'qualified',     // meets qualification criteria
  'converted',     // became a client
  'disqualified',  // not a fit
];

export const ClientLifecycle = [
  'onboard',       // initial onboarding steps
  'active',        // actively represented
  'past_client',   // relationship completed
];

export const TransactionLifecycle = [
  'open',          // transaction opened (offer, negotiation)
  'under_contract',
  'inspection',
  'closing',
  'closed',
  'cancelled',
];

export default { LeadLifecycle, ClientLifecycle, TransactionLifecycle };
