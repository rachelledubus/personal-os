// OWNER: UNIVERSAL-OS (core)
// File: packages/universal-core/metrics/runner.js
// Purpose: Minimal metrics evaluator that converts simple metric definitions
// into queries against the adapter. For MVP this returns mock or simple counts.

import * as db from '../adapters/supabaseAdapter.js';

export async function evaluateMetric(def) {
  // Very small subset: count or sum on a table with optional filter
  try {
    if (def.query) {
      const q = def.query;
      if (q.aggregate === 'count') {
        const { data, error } = await db.rawCount(q.table, q.timeField, q.groupBy);
        if (error) throw error;
        return data;
      }
      if (q.aggregate === 'sum' && q.field) {
        const { data, error } = await db.rawSum(q.table, q.field, q.filter);
        if (error) throw error;
        return data;
      }
    }
    if (def.parts) {
      // Evaluate parts and compute formula client-side (very small evaluator)
      const partValues = {};
      for (const [key, p] of Object.entries(def.parts)) {
        if (p.aggregate === 'count') {
          const { data } = await db.rawCount(p.table);
          partValues[key] = Number(data) || 0;
        }
      }
      // naive formula evaluation: replace part names in formula
      if (def.formula) {
        let expr = def.formula;
        for (const k of Object.keys(partValues)) expr = expr.replace(new RegExp(k, 'g'), String(partValues[k]));
        // eslint-disable-next-line no-eval
        return eval(expr);
      }
    }
    return null;
  } catch (err) {
    console.error('metrics runner error', err);
    return null;
  }
}

export default { evaluateMetric };
