// packages/universal-core/entity-engine/persistence.js
import * as db from '../adapters/supabaseAdapter.js';

/**
 * Insert into a shared table (activity_log / prompt_log style).
 * Attaches app_namespace and entity_type metadata.
 */
export async function insertSharedEvent({ appNamespace = 'personal-os', entityType = null, row = {} }) {
  const payload = { ...row, app_namespace: appNamespace, entity_type: entityType };
  // For now route to activity_log as default; callers can use adapter directly for other tables.
  return db.insertActivityLog(payload);
}

/**
 * Query activity_log with common filters and return rows.
 * This is a convenience wrapper around the underlying adapter.
 */
export async function queryActivityLog({ userId, source_table, event_type, event_date, gte_event_date } = {}) {
  return db.selectActivityLog({ userId, source_table, event_type, event_date, gte_event_date });
}
