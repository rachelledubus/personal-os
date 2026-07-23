// OWNER: REALTOR-OS (application)
// File: packages/realtor-os/bootstrap.js
// Purpose: Bootstrap Realtor OS configuration into Universal OS engine.

import '../../packages/realtor-os/config/entities.js';
import policies from './config/policies.js';
import workflows from './config/workflows.js';

import { registerPolicy } from '../../packages/universal-core/policy-registry.js';
import { registerAutomationTriggers } from '../../packages/universal-core/automation-runner/index.js';
import { registerChecklist } from '../../packages/universal-core/checklist-engine/runner.js';

// Register policies
for (const [name, fn] of Object.entries(policies)) {
  try {
    registerPolicy(name, fn);
  } catch (err) {
    console.warn('Failed to register policy', name, err);
  }
}

// Register workflows
registerAutomationTriggers(workflows);

// Register checklists (load markdown checklist and register as items)
import fs from 'fs';
import path from 'path';
const checklistPath = path.resolve(new URL(import.meta.url).pathname, '../../realtor-os/checklists/closing-checklist.md');
try {
  const raw = fs.readFileSync(checklistPath, 'utf8');
  const items = raw.split('\n').filter(l => l.trim().startsWith('- [ ]')).map(l => l.replace(/^- \\[ \\] /, '').trim());
  registerChecklist('closing_checklist', items);
} catch (err) {
  console.warn('Could not register closing checklist', err.message);
}

export default true;
