// OWNER: PERSONAL-OS (app shim)
// File: src/services/checklists.js
// Purpose: Simple shim to expose checklist runner to the app.

import { startChecklist, getChecklistInstance, completeChecklistItem } from '../../packages/universal-core/checklist-engine/runner.js';

export { startChecklist, getChecklistInstance, completeChecklistItem };
