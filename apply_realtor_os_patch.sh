#!/usr/bin/env bash
set -euo pipefail

# apply_realtor_os_patch.sh
# Run from repo root. Creates files for the Realtor-OS patch.
# Usage:
#   chmod +x apply_realtor_os_patch.sh
#   ./apply_realtor_os_patch.sh

printf "Applying Realtor-OS patch files...\n"

# Helper to create directories
mkd() { mkdir -p "$(dirname "$1")"; }

# File: packages/universal-core/automation-runner/index.js
f="packages/universal-core/automation-runner/index.js"; mkd "$f"
cat > "$f" <<'EOF'
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
EOF

# File: packages/universal-core/checklist-engine/runner.js
f="packages/universal-core/checklist-engine/runner.js"; mkd "$f"
cat > "$f" <<'EOF'
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
EOF

# File: packages/universal-core/policy-registry.js
f="packages/universal-core/policy-registry.js"; mkd "$f"
cat > "$f" <<'EOF'
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
EOF

# File: packages/universal-core/metrics/runner.js
f="packages/universal-core/metrics/runner.js"; mkd "$f"
cat > "$f" <<'EOF'
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
EOF

# File: packages/universal-core/adapters/supabaseAdapter.js
f="packages/universal-core/adapters/supabaseAdapter.js"; mkd "$f"
cat > "$f" <<'EOF'
// OWNER: UNIVERSAL-OS (core)
// File: packages/universal-core/adapters/supabaseAdapter.js
// Purpose: Lightweight supabase adapter helpers used by Universal-OS and Realtor-OS.
// NOTE: This is a minimal implementation used for the MVP. Replace or extend
// with your existing supabase client integration as needed.

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

export const supabase = (SUPABASE_URL && SUPABASE_KEY) ? createClient(SUPABASE_URL, SUPABASE_KEY) : null;

export async function getUserId() {
  if (!supabase) return null;
  try {
    const { data } = await supabase.auth.getUser();
    return data?.user?.id || null;
  } catch {
    return null;
  }
}

export async function getPreference(category, key) {
  // placeholder: applications may store preferences in user_preferences table
  return null;
}

export async function upsertPreference(userId, category, key, value) {
  if (!supabase) return null;
  return supabase.from('user_preferences').upsert({ user_id: userId, category, key, value }, { onConflict: 'user_id,category,key' });
}

export async function insertActivityLog(row) {
  if (!supabase) return null;
  return supabase.from('activity_log').insert(row);
}

export async function selectActivityLog({ userId, source_table, event_type, event_date, gte_event_date }) {
  if (!supabase) return [];
  let q = supabase.from('activity_log').select('*').eq('user_id', userId);
  if (source_table) q = q.eq('source_table', source_table);
  if (event_type) q = q.eq('event_type', event_type);
  if (event_date) q = q.eq('event_date', event_date);
  if (gte_event_date) q = q.gte('event_date', gte_event_date);
  const { data, error } = await q;
  if (error) throw error;
  return data;
}

// Generic create entity helper
export async function createEntity(table, payload) {
  if (!supabase) throw new Error('Supabase not configured');
  const { data, error } = await supabase.from(table).insert(payload).select().single();
  if (error) throw error;
  return data;
}

export async function updateEntity(table, id, payload) {
  if (!supabase) throw new Error('Supabase not configured');
  const { data, error } = await supabase.from(table).update(payload).eq('id', id).select().single();
  if (error) throw error;
  return data;
}

export async function selectById(table, id) {
  if (!supabase) return null;
  const { data, error } = await supabase.from(table).select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return data;
}

// Lightweight raw count helper for metrics runner
export async function rawCount(table, timeField = null, groupBy = null) {
  if (!supabase) return { data: 0 };
  try {
    let q = supabase.from(table).select('*', { count: 'estimated' });
    const { count, error } = await q;
    if (error) return { error };
    return { data: count };
  } catch (err) {
    return { error: err };
  }
}

export async function rawSum(table, field, filter = null) {
  if (!supabase) return { data: 0 };
  try {
    let q = supabase.from(table).select(field, { count: 'exact' });
    if (filter) q = q.filter(filter);
    const { data, error } = await q;
    if (error) return { error };
    const sum = (data || []).reduce((s, r) => s + Number(r[field] || 0), 0);
    return { data: sum };
  } catch (err) {
    return { error: err };
  }
}

export default { supabase, getUserId, upsertPreference, insertActivityLog, selectActivityLog, createEntity, updateEntity, selectById, rawCount, rawSum };
EOF

# File: packages/realtor-os/bootstrap.js
f="packages/realtor-os/bootstrap.js"; mkd "$f"
cat > "$f" <<'EOF'
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
EOF

# File: packages/realtor-os/README.md
f="packages/realtor-os/README.md"; mkd "$f"
cat > "$f" <<'EOF'
# OWNER: REALTOR-OS (application)
# packages/realtor-os/README.md

Realtor‑OS — application layer running on the Universal‑OS foundation.

Purpose
- This package contains the Realtor‑specific configuration, domain rules, templates, checklists and metric definitions that run on top of the Universal‑OS engine.
- It is intentionally configuration-first: the Universal‑OS packages provide the engine (adapters, persistence, automation runner, AI facade, entity registry). Realtor‑OS provides the domain model and assets.

What to expect in this package
- config/entities.js — register entity types used by Realtor workflows
- config/states.js — lifecycle state definitions for Lead, Client, Transaction
- config/policies.js — business rules and validation for domain operations
- config/workflows.js — automation trigger definitions (declarative, not runtime)
- templates/ — communication and document templates
- checklists/ — verification checklists (closing checklist, onboarding checklist)
- metrics/ — metric definitions for BI

How to use
- Import the config files during application bootstrap. They register entity types and declarative workflows with the Universal‑OS engine.
- Nothing in this package performs destructive migrations; it only registers configuration and provides assets.
EOF

# File: packages/realtor-os/config/entities.js
f="packages/realtor-os/config/entities.js"; mkd "$f"
cat > "$f" <<'EOF'
// OWNER: REALTOR-OS (application)
// File: packages/realtor-os/config/entities.js
// Purpose: Register Realtor domain entity types with the Universal-OS entity registry.

import { registerEntityType } from '../../universal-core/entity-engine/registry.js';

// Register core Realtor entities. The `table` values are optional hints
// for apps that want to persist entities to specific database tables.
registerEntityType({
  name: 'Lead',
  table: 'leads',
  primaryKey: 'id',
  fields: ['first_name','last_name','email','phone','source','status','assigned_to','created_at']
});

registerEntityType({
  name: 'Contact',
  table: 'contacts',
  primaryKey: 'id',
  fields: ['first_name','last_name','email','phone','relationship','notes']
});

registerEntityType({
  name: 'Client',
  table: 'clients',
  primaryKey: 'id',
  fields: ['first_name','last_name','email','phone','client_type','representative']
});

registerEntityType({
  name: 'Property',
  table: 'properties',
  primaryKey: 'id',
  fields: ['address','city','state','zip','beds','baths','sqft','price','status','mls_id']
});

registerEntityType({
  name: 'Transaction',
  table: 'transactions',
  primaryKey: 'id',
  fields: ['property_id','buyer_id','seller_id','status','list_price','sale_price','opened_at','closed_at']
});

registerEntityType({
  name: 'Campaign',
  table: 'campaigns',
  primaryKey: 'id',
  fields: ['title','channel','audience','status','sent_at']
});

export default true;
EOF

# File: packages/realtor-os/config/states.js
f="packages/realtor-os/config/states.js"; mkd "$f"
cat > "$f" <<'EOF'
// OWNER: REALTOR-OS (application)
// File: packages/realtor-os/config/states.js
// Purpose: Define lifecycle states for Leads, Clients, and Transactions.

export const LeadLifecycle = [
  'new',           // just captured
  'contacted',     // initial outreach done
  'nurturing',     // marketing/nurture sequence active
  'qualified',     // meets qualification criteria
  'converted',     // became a client
  'disqualified',  // not a fit
];

export const ClientLifecycle = [
  'onboard',       // initial onboarding steps
  'active',        // actively represented
  'past_client',   // relationship completed
];

export const TransactionLifecycle = [
  'open',          // transaction opened (offer, negotiation)
  'under_contract',
  'inspection',
  'closing',
  'closed',
  'cancelled',
];

export default { LeadLifecycle, ClientLifecycle, TransactionLifecycle };
EOF

# File: packages/realtor-os/config/policies.js
f="packages/realtor-os/config/policies.js"; mkd "$f"
cat > "$f" <<'EOF'
// OWNER: REALTOR-OS (application)
// File: packages/realtor-os/config/policies.js
// Purpose: Business rule implementations for Realtor domain. These are
// pure functions that can be used by UI validators, automation triggers
// or API endpoints. Keep rules centralized here so they are auditable.

export function isQualifiedLead(lead) {
  // Simple qualification: contact info + expressed interest + budget estimate
  if (!lead) return false;
  const hasContact = !!(lead.email || lead.phone);
  const hasInterest = !!lead.interest_level && lead.interest_level !== 'low';
  const hasBudget = !!lead.budgetMin || !!lead.budgetMax;
  return hasContact && (hasInterest || hasBudget);
}

export function canConvertToClient(lead) {
  // Business rule: only qualified leads may be converted to clients
  return isQualifiedLead(lead) && lead.status !== 'disqualified';
}

export function canCloseTransaction(transaction) {
  // Require transaction to be in 'closing' or 'under_contract' and have a sale_price
  if (!transaction) return false;
  const validState = ['under_contract', 'closing'].includes(transaction.status);
  const hasPrice = typeof transaction.sale_price === 'number' && transaction.sale_price > 0;
  return validState && hasPrice;
}

export function requireClientConsent(client) {
  // Example policy: client must have signed consent to allow outreach/marketing
  return !!client?.consent?.marketing_ok;
}

export default { isQualifiedLead, canConvertToClient, canCloseTransaction, requireClientConsent };
EOF

# File: packages/realtor-os/config/workflows.js
f="packages/realtor-os/config/workflows.js"; mkd "$f"
cat > "$f" <<'EOF'
// OWNER: REALTOR-OS (application)
// File: packages/realtor-os/config/workflows.js
// Purpose: Declarative automation triggers for Realtor workflows. These
// definitions are lightweight and intended to be registered with a
// Universal-OS automation runner (if present) during app bootstrap.

// Trigger signatures are intentionally simple objects so the core runner
// can pick them up and wire up listeners. The runner is responsible for
// durable execution, retries and observability; these are just configs.

export const automationTriggers = [
  {
    id: 'realtor.new_lead_qualification',
    description: 'When a new lead is created, evaluate qualification and assign/notify',
    event: 'entity.created:Lead',
    condition: 'isQualifiedLead', // refers to policy function by name
    actions: [
      { type: 'assign_to_pool', payload: { pool: 'new_leads' } },
      { type: 'start_campaign', payload: { campaignId: 'welcome_nurture' } },
      { type: 'notify_agent', payload: { message: 'New qualified lead' } },
    ],
  },
  {
    id: 'realtor.offer_accepted_create_transaction',
    description: 'When an offer is accepted, create a Transaction and start closing checklist',
    event: 'offer.accepted',
    condition: null,
    actions: [
      { type: 'create_entity', payload: { entity: 'Transaction' } },
      { type: 'start_checklist', payload: { checklistId: 'closing_checklist' } },
    ],
  },
];

export default automationTriggers;
EOF

# File: packages/realtor-os/templates/email/new-lead-welcome.md
f="packages/realtor-os/templates/email/new-lead-welcome.md"; mkd "$f"
cat > "$f" <<'EOF'
Subject: Welcome — thanks for reaching out, {{first_name}}!

Hi {{first_name}},

Thanks for contacting us about {{property_interest}}. I'm {{agent_name}} — I'd love to learn a bit more about your goals and timeframe and share available homes that match your needs.

When you have a moment, can you reply with the best times/days you’re available for a quick 15-minute chat? If you prefer, you can also book directly here: {{booking_link}}.

Best,
{{agent_name}}
{{agent_signature}}
EOF

# File: packages/realtor-os/checklists/closing-checklist.md
f="packages/realtor-os/checklists/closing-checklist.md"; mkd "$f"
cat > "$f" <<'EOF'
# OWNER: REALTOR-OS (application)
# File: packages/realtor-os/checklists/closing-checklist.md
# Purpose: Verification checklist for closing a transaction. Used by UI and automation to guide closing steps.

- [ ] Confirm buyer financing approval
- [ ] Complete home inspection and resolve outstanding items
- [ ] Confirm title search and insurance ordered
- [ ] Order final walk-through
- [ ] Schedule closing date with settlement agent
- [ ] Collect signatures and confirm funding cleared
- [ ] Mark transaction status as 'closed' and notify client
EOF

# File: packages/realtor-os/metrics/definitions.js
f="packages/realtor-os/metrics/definitions.js"; mkd "$f"
cat > "$f" <<'EOF'
// OWNER: REALTOR-OS (application)
// File: packages/realtor-os/metrics/definitions.js
// Purpose: Business intelligence metric definitions for Realtor OS.
// These definitions are intended to be consumed by a BI layer that can
// map them to SQL or a query builder. Keep them declarative for portability.

export const metrics = {
  leadsPerMonth: {
    id: 'leads_per_month',
    description: 'Count of new leads created per month',
    query: {
      table: 'leads',
      aggregate: 'count',
      timeField: 'created_at',
      groupBy: 'month',
    },
  },
  leadToClientConversionRate: {
    id: 'lead_to_client_conversion_rate',
    description: 'Percent of leads that convert to clients',
    formula: 'converted_leads / total_leads',
    parts: {
      converted_leads: { table: 'leads', filter: "status='converted'", aggregate: 'count' },
      total_leads: { table: 'leads', aggregate: 'count' },
    },
  },
  avgTimeToCloseDays: {
    id: 'avg_time_to_close_days',
    description: 'Average days from transaction open to close',
    query: {
      table: 'transactions',
      compute: 'avg(date_diff("day", opened_at, closed_at))',
    },
  },
  pipelineValue: {
    id: 'pipeline_value',
    description: 'Sum of estimated sale prices for open transactions',
    query: { table: 'transactions', filter: "status!='closed' AND status!='cancelled'", aggregate: 'sum', field: 'list_price' },
  },
};

export default metrics;
EOF

# File: migrations/realtor-os/0001_create_realtor_tables.sql
f="migrations/realtor-os/0001_create_realtor_tables.sql"; mkd "$f"
cat > "$f" <<'EOF'
-- migrations for Realtor-OS (proposal only)
-- File: migrations/realtor-os/0001_create_realtor_tables.sql
-- Purpose: Add basic tables for leads, contacts, clients, properties, transactions, campaigns
-- WARNING: This file is a proposal. It will NOT be run automatically. Review and run in a staging DB first.

-- NOTE: If you use Supabase with uuid_generate_v4(), ensure the "uuid-ossp" extension is enabled.

CREATE TABLE IF NOT EXISTS leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  first_name text,
  last_name text,
  email text,
  phone text,
  source text,
  status text,
  interest_level text,
  budget_min numeric,
  budget_max numeric,
  assigned_to uuid,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  first_name text,
  last_name text,
  email text,
  phone text,
  relationship text,
  notes jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  first_name text,
  last_name text,
  email text,
  phone text,
  client_type text,
  representative uuid,
  consent jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS properties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  address text,
  city text,
  state text,
  zip text,
  beds integer,
  baths numeric,
  sqft integer,
  list_price numeric,
  status text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  property_id uuid,
  buyer_id uuid,
  seller_id uuid,
  status text,
  list_price numeric,
  sale_price numeric,
  opened_at timestamptz,
  closed_at timestamptz,
  metadata jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  title text,
  channel text,
  audience jsonb,
  status text,
  sent_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Rollback (manual): DROP TABLE IF EXISTS campaigns, transactions, properties, clients, contacts, leads;
EOF

# File: migrations/realtor-os/0002_add_mls_id_to_properties.sql
f="migrations/realtor-os/0002_add_mls_id_to_properties.sql"; mkd "$f"
cat > "$f" <<'EOF'
-- migrations for Realtor-OS (proposal only)
-- File: migrations/realtor-os/0002_add_mls_id_to_properties.sql
-- Purpose: Add mls_id column to properties to support MLS integration and user-editable field.

ALTER TABLE IF EXISTS properties ADD COLUMN IF NOT EXISTS mls_id text;

-- Rollback (manual): ALTER TABLE properties DROP COLUMN IF EXISTS mls_id;
EOF

# File: src/pages/realtor/Dashboard.jsx
f="src/pages/realtor/Dashboard.jsx"; mkd "$f"
cat > "$f" <<'EOF'
// OWNER: REALTOR-OS (app)
// File: src/pages/realtor/Dashboard.jsx
// Purpose: Minimal Dashboard UI skeleton for Realtor OS.

import React, { useEffect, useState } from 'react';

export default function Dashboard() {
  const [leads, setLeads] = useState([]);
  const [metrics, setMetrics] = useState({});

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/realtor/summary');
        if (res.ok) {
          const json = await res.json();
          setLeads(json.leads || []);
          setMetrics(json.metrics || {});
        }
      } catch (err) {
        console.error(err);
      }
    }
    load();
  }, []);

  return (
    <div style={{ padding: 20 }}>
      <h1>Realtor OS — Dashboard</h1>
      <section>
        <h2>Today's Focus</h2>
        <ul>
          {leads.slice(0,5).map(l => (<li key={l.id}>{l.first_name} {l.last_name} — {l.status}</li>))}
        </ul>
      </section>
      <section>
        <h2>Business Pulse</h2>
        <pre>{JSON.stringify(metrics, null, 2)}</pre>
      </section>
      <section>
        <h2>Attention Needed</h2>
        <p>Open tasks, overdue follow-ups, and pipeline risks will appear here.</p>
      </section>
    </div>
  );
}
EOF

# File: src/pages/realtor/Leads.jsx
f="src/pages/realtor/Leads.jsx"; mkd "$f"
cat > "$f" <<'EOF'
// OWNER: REALTOR-OS (app)
// File: src/pages/realtor/Leads.jsx

import React, { useEffect, useState } from 'react';

export default function Leads() {
  const [leads, setLeads] = useState([]);

  useEffect(() => {
    async function load() {
      const res = await fetch('/api/realtor/leads');
      if (res.ok) setLeads(await res.json());
    }
    load();
  }, []);

  return (
    <div style={{ padding: 20 }}>
      <h1>Leads</h1>
      <table>
        <thead><tr><th>Name</th><th>Email</th><th>Status</th></tr></thead>
        <tbody>
          {leads.map(l => (
            <tr key={l.id}>
              <td>{l.first_name} {l.last_name}</td>
              <td>{l.email}</td>
              <td>{l.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
EOF

# File: src/pages/realtor/Contacts.jsx
f="src/pages/realtor/Contacts.jsx"; mkd "$f"
cat > "$f" <<'EOF'
// OWNER: REALTOR-OS (app)
// File: src/pages/realtor/Contacts.jsx

import React, { useEffect, useState } from 'react';

export default function Contacts() {
  const [contacts, setContacts] = useState([]);

  useEffect(() => {
    async function load() {
      const res = await fetch('/api/realtor/contacts');
      if (res.ok) setContacts(await res.json());
    }
    load();
  }, []);

  return (
    <div style={{ padding: 20 }}>
      <h1>Contacts</h1>
      <ul>
        {contacts.map(c => (<li key={c.id}>{c.first_name} {c.last_name} — {c.email}</li>))}
      </ul>
    </div>
  );
}
EOF

# File: src/pages/realtor/Properties.jsx
f="src/pages/realtor/Properties.jsx"; mkd "$f"
cat > "$f" <<'EOF'
// OWNER: REALTOR-OS (app)
// File: src/pages/realtor/Properties.jsx

import React, { useEffect, useState } from 'react';

export default function Properties() {
  const [props, setProps] = useState([]);

  useEffect(() => {
    async function load() {
      const res = await fetch('/api/realtor/properties');
      if (res.ok) setProps(await res.json());
    }
    load();
  }, []);

  return (
    <div style={{ padding: 20 }}>
      <h1>Properties</h1>
      <table>
        <thead><tr><th>Address</th><th>MLS ID</th><th>Price</th><th>Status</th></tr></thead>
        <tbody>
          {props.map(p => (
            <tr key={p.id}>
              <td>{p.address}, {p.city}</td>
              <td>{p.mls_id || '-'}</td>
              <td>{p.list_price}</td>
              <td>{p.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
EOF

# File: src/components/realtor/ChecklistViewer.jsx
f="src/components/realtor/ChecklistViewer.jsx"; mkd "$f"
cat > "$f" <<'EOF'
// OWNER: REALTOR-OS (app)
// File: src/components/realtor/ChecklistViewer.jsx

import React, { useEffect, useState } from 'react';

export default function ChecklistViewer({ instanceId }) {
  const [instance, setInstance] = useState(null);

  useEffect(() => {
    async function load() {
      const res = await fetch(`/api/checklists/${instanceId}`);
      if (res.ok) setInstance(await res.json());
    }
    if (instanceId) load();
  }, [instanceId]);

  if (!instance) return <div>No checklist selected.</div>;

  return (
    <div>
      <h3>Checklist: {instance.checklistId}</h3>
      <ul>
        {instance.items.map(i => (
          <li key={i.id}>
            <label>
              <input type="checkbox" checked={i.done} onChange={async () => {
                await fetch(`/api/checklists/${instance.id}/items/${i.id}`, { method: 'POST' });
                const r = await fetch(`/api/checklists/${instance.id}`);
                setInstance(await r.json());
              }} /> {i.text}
            </label>
          </li>
        ))}
      </ul>
    </div>
  );
}
EOF

# File: src/components/realtor/TemplateEditor.jsx
f="src/components/realtor/TemplateEditor.jsx"; mkd "$f"
cat > "$f" <<'EOF'
// OWNER: REALTOR-OS (app)
// File: src/components/realtor/TemplateEditor.jsx

import React, { useEffect, useState } from 'react';

export default function TemplateEditor() {
  const [templates, setTemplates] = useState([]);
  const [current, setCurrent] = useState(null);
  const [content, setContent] = useState('');

  useEffect(() => { async function l(){ const res = await fetch('/api/templates/list'); if(res.ok){ setTemplates(await res.json()); } } l(); }, []);

  async function openTemplate(path) {
    const res = await fetch(`/api/templates/get?path=${encodeURIComponent(path)}`);
    if (!res.ok) return;
    const txt = await res.text();
    setCurrent(path);
    setContent(txt);
  }

  async function save() {
    await fetch('/api/templates/save', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ path: current, content }) });
    alert('Saved');
  }

  return (
    <div style={{ padding: 20 }}>
      <h1>Templates</h1>
      <div style={{ display: 'flex', gap: 20 }}>
        <div style={{ width: 300 }}>
          <h3>Available</h3>
          <ul>
            {templates.map(t => (<li key={t}><button onClick={() => openTemplate(t)}>{t}</button></li>))}
          </ul>
        </div>
        <div style={{ flex: 1 }}>
          {current ? (
            <div>
              <h3>{current}</h3>
              <textarea style={{ width: '100%', height: 400 }} value={content} onChange={e => setContent(e.target.value)} />
              <div><button onClick={save}>Save</button></div>
            </div>
          ) : <div>Select a template to edit</div>}
        </div>
      </div>
    </div>
  );
}
EOF

# File: src/services/templates-api.js
f="src/services/templates-api.js"; mkd "$f"
cat > "$f" <<'EOF'
// OWNER: PERSONAL-OS (app shim endpoint)
// File: src/services/templates-api.js
// Purpose: Simple server-side handlers for reading and writing Realtor OS templates.

import fs from 'fs';
import path from 'path';

const base = path.resolve(process.cwd(), 'packages/realtor-os/templates');

export const handler = async (event) => {
  const { httpMethod, queryStringParameters } = event;
  try {
    if (httpMethod === 'GET' && event.path.endsWith('/templates/list')) {
      const files = fs.readdirSync(base).flatMap(dir => {
        const p = path.join(base, dir);
        if (fs.statSync(p).isDirectory()) {
          return fs.readdirSync(p).map(f => `${dir}/${f}`);
        }
        return dir;
      });
      return { statusCode: 200, body: JSON.stringify(files) };
    }
    if (httpMethod === 'GET' && event.path.endsWith('/templates/get')) {
      const p = queryStringParameters?.path;
      if (!p) return { statusCode: 400, body: 'Missing path' };
      const full = path.join(base, p);
      if (!fs.existsSync(full)) return { statusCode: 404, body: 'Not found' };
      const content = fs.readFileSync(full, 'utf8');
      return { statusCode: 200, body: content };
    }
    if (httpMethod === 'POST' && event.path.endsWith('/templates/save')) {
      const body = JSON.parse(event.body || '{}');
      const { path: p, content } = body;
      if (!p) return { statusCode: 400, body: 'Missing path' };
      const full = path.join(base, p);
      fs.writeFileSync(full, content, 'utf8');
      return { statusCode: 200, body: JSON.stringify({ ok: true }) };
    }
    return { statusCode: 405, body: 'Method not allowed' };
  } catch (err) {
    return { statusCode: 500, body: String(err) };
  }
};
EOF

# File: src/services/checklists.js (shim)
f="src/services/checklists.js"; mkd "$f"
cat > "$f" <<'EOF'
// OWNER: PERSONAL-OS (app shim)
// File: src/services/checklists.js
// Purpose: Simple shim to expose checklist runner to the app.

import { startChecklist, getChecklistInstance, completeChecklistItem } from '../../packages/universal-core/checklist-engine/runner.js';

export { startChecklist, getChecklistInstance, completeChecklistItem };
EOF

# File: tests/run-tests.js
f="tests/run-tests.js"; mkd "$f"
cat > "$f" <<'EOF'
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
EOF

# File: .github/workflows/ci.yml
f=".github/workflows/ci.yml"; mkd "$f"
cat > "$f" <<'EOF'
name: CI
on: [push, pull_request]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: '18'
      - name: Install deps
        run: npm ci
      - name: Build
        run: npm run build --if-present
      - name: Run smoke tests
        run: node tests/run-tests.js
EOF

# File: docs/09 - Realtor OS Project Decision Log (Living Document).md
f="docs/09 - Realtor OS Project Decision Log (Living Document).md"; mkd "$f"
cat > "$f" <<'EOF'
# OWNER: REPOSITORY (docs)
# 09 - Realtor OS Project Decision Log (Living Document)

This file is the living decision log for Realtor OS. Entries MUST follow the ADR template.

ADR-001
Date: 2026-07-23
Status: Accepted
Decision Summary: Realtor OS will be implemented as a module inside Personal OS (not a separate service) until demand justifies a standalone product.
Problem: Need to decide whether Realtor OS is integrated or standalone.
Options Considered: Integrated module, Separate repository/service.
Decision: Integrated module inside Personal OS.
Reasoning: Reuse existing Personal OS infrastructure, minimize duplication, faster iteration for MVP.
Tradeoffs: Potentially tighter coupling; easier for MVP but may require future extraction.
Implementation Impact: New files added under packages/realtor-os and some core Universal-OS packages to host shared logic.
Related Documents: Personal OS Integration Architecture, Implementation Bible
Related PRs: feature/realtor-os branch
EOF

# File: docs/LEGACY_MAP.md
f="docs/LEGACY_MAP.md"; mkd "$f"
cat > "$f" <<'EOF'
# OWNER: REPOSITORY (docs)
# LEGACY_MAP.md

This file maps Personal-OS filenames to Universal-OS core implementations and Realtor-OS configuration.

- src/services/timer.js → packages/universal-core/state-engine/timer/index.js (UNIVERSAL-OS)
- src/services/settings.js → packages/universal-core/adapters/supabaseAdapter.js (UNIVERSAL-OS)
- src/services/classify-capture.js → src/services/classify-capture.js (PERSONAL-OS shim) delegates to packages/universal-core/ai-layer/providers/googleGemini.js (UNIVERSAL-OS)
- Realtor OS config: packages/realtor-os/config/* (REALTOR-OS) — entities, states, policies, workflows
EOF

printf "Patch files written. Review created files and commit them to branch feature/realtor-os.\n"
printf "Done.\n"
