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
