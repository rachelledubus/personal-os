// OWNER: UNIVERSAL-OS (core)
// File: packages/universal-core/policy-registry.js
// Purpose: Registry for policy functions so automation triggers can reference them by name.

const policies = {};

export function registerPolicy(name, fn) {
  if (!name || typeof fn !== 'function') throw new Error('registerPolicy requires a name and function');
  policies[name] = fn;
}

export function getPolicy(name) {
  return policies[name];
}

export function listPolicies() {
  return Object.keys(policies);
}

export default { registerPolicy, getPolicy, listPolicies };
