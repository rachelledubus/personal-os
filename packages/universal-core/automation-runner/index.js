// OWNER: UNIVERSAL-OS (core)
// File: packages/universal-core/automation-runner/index.js
// Purpose: Lightweight automation runner to register declarative triggers and execute actions.

const triggers = [];

export function registerAutomationTriggers(triggerDefs = []) {
  for (const t of triggerDefs) triggers.push(t);
}

// Simple event emitter for the runner. In a full implementation this would
// be durable, support retries, and be observable. For MVP we execute
// actions synchronously and log results.
export async function emitEvent(eventName, payload = {}) {
  const matched = triggers.filter(t => t.event === eventName || t.event === `entity.${eventName}` || t.event === `entity.${payload.type}`);
  for (const t of matched) {
    try {
      // condition can be a function name registered in policy-registry or a truthy literal
      let conditionResult = true;
      if (t.condition) {
        // lazy-resolve policy by name if present
        const { getPolicy } = await import('../policy-registry.js');
        const policyFn = getPolicy(t.condition);
        if (typeof policyFn === 'function') conditionResult = await policyFn(payload.entity || payload);
      }
      if (!conditionResult) continue;
      for (const action of t.actions || []) {
        await executeAction(action, { trigger: t, payload });
      }
    } catch (err) {
      console.error('automation-runner: trigger failed', t?.id, err);
    }
  }
}

async function executeAction(action, ctx) {
  // Basic built-in action implementations. Apps can extend this by
  // providing their own action handlers by wrapping/overriding this module.
  const type = action.type;
  switch (type) {
    case 'assign_to_pool':
      // stub: in a real app we would call an assignment service
      console.log('Action assign_to_pool', action.payload, ctx);
      break;
    case 'start_campaign':
      console.log('Action start_campaign', action.payload, ctx);
      break;
    case 'notify_agent':
      console.log('Action notify_agent', action.payload, ctx);
      break;
    case 'create_entity': {
      const { registerEntityType } = await import('../entity-engine/registry.js');
      // For MVP we log; apps should implement create API that persists entities
      console.log('Action create_entity', action.payload, ctx);
      break;
    }
    case 'start_checklist': {
      const { startChecklist } = await import('../checklist-engine/runner.js');
      await startChecklist(action.payload.checklistId, ctx.payload);
      break;
    }
    default:
      console.warn('Unknown automation action type', type);
  }
}

export default { registerAutomationTriggers, emitEvent };
