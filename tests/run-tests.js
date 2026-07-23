// OWNER: REPOSITORY (tests)
// File: tests/run-tests.js
// Purpose: Basic smoke tests for core pieces (registry, policies, checklist runner)

import registry from '../packages/universal-core/entity-engine/registry.js';
import policies from '../packages/realtor-os/config/policies.js';
import { registerChecklist, startChecklist } from '../packages/universal-core/checklist-engine/runner.js';

function assert(cond, msg){ if(!cond){ console.error('TEST FAIL:', msg); process.exit(1); } }

// registry smoke
registry.registerEntityType({ name: 'TestEntity', fields: ['a'] });
assert(registry.getEntityType('TestEntity').name === 'TestEntity', 'registry register/get');

// policies smoke
assert(typeof policies.isQualifiedLead === 'function', 'isQualifiedLead exists');

// checklist smoke
registerChecklist('smoketest', ['one','two']);
(async () => {
  const inst = await startChecklist('smoketest', { id: 'ctx' });
  assert(inst && inst.items.length === 2, 'checklist started');
  console.log('All smoke tests passed');
})();
