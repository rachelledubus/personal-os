// OWNER: REALTOR-OS (application)
// File: packages/realtor-os/config/policies.js
// Purpose: Business rule implementations for Realtor domain. These are
// pure functions that can be used by UI validators, automation triggers
// or API endpoints. Keep rules centralized here so they are auditable.

export function isQualifiedLead(lead) {
  // Simple qualification: contact info + expressed interest + budget estimate
  if (!lead) return false;
  const hasContact = !!(lead.email || lead.phone);
  const hasInterest = !!lead.interest_level && lead.interest_level !== 'low';
  const hasBudget = !!lead.budgetMin || !!lead.budgetMax;
  return hasContact && (hasInterest || hasBudget);
}

export function canConvertToClient(lead) {
  // Business rule: only qualified leads may be converted to clients
  return isQualifiedLead(lead) && lead.status !== 'disqualified';
}

export function canCloseTransaction(transaction) {
  // Require transaction to be in 'closing' or 'under_contract' and have a sale_price
  if (!transaction) return false;
  const validState = ['under_contract', 'closing'].includes(transaction.status);
  const hasPrice = typeof transaction.sale_price === 'number' && transaction.sale_price > 0;
  return validState && hasPrice;
}

export function requireClientConsent(client) {
  // Example policy: client must have signed consent to allow outreach/marketing
  return !!client?.consent?.marketing_ok;
}

export default { isQualifiedLead, canConvertToClient, canCloseTransaction, requireClientConsent };
