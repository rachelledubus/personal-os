// ============================================================
// NAV TARGETS — single source of truth for every click-to zone/tab
// in the app. Breadcrumb.jsx uses this for labels, QuickJump.jsx
// uses it for the searchable list. Add a new tab here once and both
// pick it up — no per-page nav wiring needed.
// ============================================================

export const ZONES = [
  {
    path: '/today', label: 'Today', keywords: 'home dashboard',
    tabs: [],
  },
  {
    path: '/inbox', label: 'Inbox', keywords: 'capture notes quick add',
    tabs: [],
  },
  {
    path: '/plan', label: 'Plan', keywords: 'schedule calendar',
    tabs: [
      { path: '/plan', label: 'Time Blocks', keywords: 'schedule calendar day' },
      { path: '/plan/goals', label: 'Goals & Projects', keywords: 'milestones tasks' },
      { path: '/plan/dream-life', label: 'Dream Life', keywords: 'vision north star ideal' },
      { path: '/plan/journal', label: 'Journal', keywords: 'habits mood energy grid' },
      { path: '/plan/schedule-template', label: 'Schedule Template', keywords: 'weekly rhythm routine edit' },
    ],
  },
  {
    path: '/grow', label: 'Grow', keywords: 'personal systems',
    tabs: [
      { path: '/grow', label: 'Systems', keywords: 'habits streaks daily' },
      { path: '/grow/workouts', label: 'Workouts', keywords: 'exercise fitness' },
      { path: '/grow/chores', label: 'Chores', keywords: 'cleaning maintenance house' },
      { path: '/grow/maintenance', label: 'Maintenance', keywords: 'home upkeep' },
      { path: '/grow/finance', label: 'Finance', keywords: 'budget envelopes money' },
      { path: '/grow/nutrition', label: 'Nutrition', keywords: 'meal planner recipes food grocery' },
    ],
  },
  {
    path: '/business', label: 'Business', keywords: 'realtor crm',
    tabs: [
      { path: '/business', label: 'Dashboard', keywords: 'overview metrics' },
      { path: '/business/pipeline', label: 'Pipeline', keywords: 'leads stages' },
      { path: '/business/relationships', label: 'Relationships', keywords: 'contacts sphere' },
      { path: '/business/content', label: 'Content', keywords: 'marketing posts' },
      { path: '/business/marketing', label: 'Marketing', keywords: 'campaigns farming' },
      { path: '/business/library', label: 'Library', keywords: 'templates' },
      { path: '/business/clients', label: 'Clients', keywords: 'past active' },
      { path: '/business/roadmap', label: 'Roadmap', keywords: 'product backlog' },
    ],
  },
  {
    path: '/review', label: 'Review', keywords: 'weekly business reflection',
    tabs: [],
  },
  {
    path: '/library', label: 'Library', keywords: 'notes reference',
    tabs: [
      { path: '/library', label: 'Notes', keywords: '' },
      { path: '/library/backlog', label: 'Backlog', keywords: 'ideas future' },
      { path: '/library/ai-log', label: 'AI Log', keywords: 'assistant history' },
    ],
  },
  {
    path: '/control-center', label: 'Control Center', keywords: 'settings preferences appearance',
    tabs: [],
  },
];

/** Flat list — every zone plus every tab, each with a full label for
 *  breadcrumbs/search ("Plan / Goals & Projects" not just "Goals"). */
export const FLAT_TARGETS = ZONES.flatMap(z => [
  { path: z.path, label: z.label, fullLabel: z.label, keywords: z.keywords },
  ...z.tabs.map(t => ({ ...t, fullLabel: `${z.label} / ${t.label}`, zoneLabel: z.label, zonePath: z.path })),
]);
