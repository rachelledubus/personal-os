// OWNER: UNIVERSAL-OS (core)
// File: packages/universal-core/checklist-engine/runner.js
// Purpose: Minimal checklist runner to start and track checklists for entities.

const checklists = {};
const instances = {};

export function registerChecklist(id, items = []) {
  checklists[id] = items;
}

export async function startChecklist(checklistId, context = {}) {
  if (!checklists[checklistId]) {
    console.warn('Checklist not found', checklistId);
    return null;
  }
  const instanceId = `${checklistId}:${Date.now()}`;
  instances[instanceId] = {
    id: instanceId,
    checklistId,
    context,
    items: checklists[checklistId].map((t, i) => ({ id: i+1, text: t, done: false })),
    createdAt: new Date().toISOString(),
  };
  console.log('Checklist started', instanceId);
  return instances[instanceId];
}

export function getChecklistInstance(instanceId) {
  return instances[instanceId] || null;
}

export function completeChecklistItem(instanceId, itemId) {
  const inst = instances[instanceId];
  if (!inst) return null;
  const item = inst.items.find(i => i.id === itemId);
  if (item) item.done = true;
  return inst;
}

export default { registerChecklist, startChecklist, getChecklistInstance, completeChecklistItem };
