// Simple entity registry for Universal OS core.
// Allows apps to register entity types and get canonical info about them.

const registry = {};

export function registerEntityType({ name, table = null, primaryKey = 'id', fields = [] }) {
  if (!name) throw new Error('registerEntityType requires a name');
  registry[name] = { name, table, primaryKey, fields };
}

export function getEntityType(name) {
  return registry[name];
}

export function listEntityTypes() {
  return Object.keys(registry);
}

export default { registerEntityType, getEntityType, listEntityTypes };
