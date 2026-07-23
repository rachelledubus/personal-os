// src/services/timer.js
// Backwards-compatible shim that re-exports the core Timer API from the
// Universal OS core package. This keeps all existing imports in the app
// (which import from 'src/services/timer.js') working while the real logic
// lives in packages/universal-core/state-engine/timer.

export * from '../../packages/universal-core/state-engine/timer/index.js';
