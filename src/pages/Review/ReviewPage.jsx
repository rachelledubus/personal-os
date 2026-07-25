import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import Card from '../../components/ui/Card.jsx';
import Button from '../../components/ui/Button.jsx';
import PageHeader from '../../components/layout/PageHeader.jsx';
import Stack from '../../components/layout/Stack.jsx';
import { RowBetween } from '../../components/layout/Row.jsx';
import WeeklyResetModal from '../Plan/WeeklyResetModal.jsx';
import { mondayOfWeek, currentMonthStr } from '../../utils/date.js';
import { Compass, Sunset, BarChart3, RotateCcw, Briefcase } from 'lucide-react';

// Same three rituals that used to only show up as a one-shot popup on
// the exact right day, gone the moment you dismissed or missed it.
// This is the persistent, on-demand version — "compile all the app's
// review sections into one space." Opening one here still marks it
// shown/completed for its period (same WeeklyResetModal, same
// prompts.js tracking), so it won't also ambush you later that day.
const REVIEWS = [
  {
    type: 'weekly_reset', title: 'Monday Reset', icon: Compass,
    subtitle: "Set this week's one priority and targets.",
    marker: () => mondayOfWeek(),
    linkOut: null,
  },
  {
    type: 'weekly_closeout', title: 'Friday Close-Out', icon: Sunset,
    subtitle: 'Wins, challenges, next week — becomes your Weekly Review.',
    marker: () => mondayOfWeek(),
    linkOut: null,
  },
  {
    type: 'monthly_snapshot', title: 'Monthly Snapshot', icon: BarChart3,
    subtitle: 'A one-glance summary of last month.',
    marker: () => currentMonthStr(),
    linkOut: null,
  },
];

// Two rituals that live on their own dedicated pages rather than the
// shared WeeklyResetModal — same list shape so they render the same
// way (Batch 4 pilot: this is the kind of duplication SubTabNav-style
// consolidation targets next, once Business's own split happens).
const EXTERNAL_REVIEWS = [
  { title: 'Business Weekly Reset', icon: Compass, subtitle: "Overdue contacts, this week's build, and your targets — start of week.", to: '/business/weekly-reset', cta: 'Open →' },
  { title: 'Business Weekly Reflection', icon: Briefcase, subtitle: "What worked, what didn't, what's next — for the business specifically.", to: '/business/dashboard', cta: 'Open in Business →' },
];

export default function ReviewPage() {
  const [open, setOpen] = useState(null);

  return (
    <div>
      <PageHeader
        icon={RotateCcw}
        title="Review"
        subtitle="Every reflection ritual in one place — open any of these whenever you want, not just when the app happens to ask."
      />

      <Stack gap={3}>
        {REVIEWS.map(r => (
          <Card key={r.type}>
            <RowBetween>
              <div>
                <div style={{ fontWeight: 700, fontSize: 'var(--text-body)', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <r.icon size={16} /> {r.title}
                </div>
                <div className="muted" style={{ fontSize: 'var(--text-caption)', marginTop: 2 }}>{r.subtitle}</div>
              </div>
              <Button size="sm" onClick={() => setOpen(r)}>Open</Button>
            </RowBetween>
          </Card>
        ))}

        {EXTERNAL_REVIEWS.map(r => (
          <Card key={r.title}>
            <RowBetween>
              <div>
                <div style={{ fontWeight: 700, fontSize: 'var(--text-body)', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <r.icon size={16} /> {r.title}
                </div>
                <div className="muted" style={{ fontSize: 'var(--text-caption)', marginTop: 2 }}>{r.subtitle}</div>
              </div>
              <Link to={r.to}><Button size="sm" variant="ghost">{r.cta}</Button></Link>
            </RowBetween>
          </Card>
        ))}
      </Stack>

      {open && (
        <WeeklyResetModal promptType={open.type} marker={open.marker()} onClose={() => setOpen(null)} />
      )}
    </div>
  );
}
