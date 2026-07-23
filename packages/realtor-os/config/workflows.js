// OWNER: REALTOR-OS (application)
// File: packages/realtor-os/config/workflows.js
// Purpose: Declarative automation triggers for Realtor workflows. These
// definitions are lightweight and intended to be registered with a
// Universal-OS automation runner (if present) during app bootstrap.

// Trigger signatures are intentionally simple objects so the core runner
// can pick them up and wire up listeners. The runner is responsible for
// durable execution, retries and observability; these are just configs.

export const automationTriggers = [
  {
    id: 'realtor.new_lead_qualification',
    description: 'When a new lead is created, evaluate qualification and assign/notify',
    event: 'entity.created:Lead',
    condition: 'isQualifiedLead', // refers to policy function by name
    actions: [
      { type: 'assign_to_pool', payload: { pool: 'new_leads' } },
      { type: 'start_campaign', payload: { campaignId: 'welcome_nurture' } },
      { type: 'notify_agent', payload: { message: 'New qualified lead' } },
    ],
  },
  {
    id: 'realtor.offer_accepted_create_transaction',
    description: 'When an offer is accepted, create a Transaction and start closing checklist',
    event: 'offer.accepted',
    condition: null,
    actions: [
      { type: 'create_entity', payload: { entity: 'Transaction' } },
      { type: 'start_checklist', payload: { checklistId: 'closing_checklist' } },
    ],
  },
];

export default automationTriggers;
