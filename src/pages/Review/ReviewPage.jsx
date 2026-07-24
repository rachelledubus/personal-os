import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import Card from '../../components/ui/Card.jsx';
import Button from '../../components/ui/Button.jsx';
import WeeklyResetModal from '../Plan/WeeklyResetModal.jsx';
import { mondayOfWeek, currentMonthStr } from '../../utils/date.js';

// Same three rituals that used to only show up as a one-shot popup on
// the exact right day, gone the moment you dismissed or missed it.
// This is the persistent, on-demand version — "compile all the app's
// review sections into one space." Opening one here still marks it
// shown/completed for its period (same WeeklyResetModal, same
// prompts.js tracking), so it won't also ambush you later that day.
const REVIEWS = [
  {
    type: 'weekly_reset', title: 'Monday Reset', icon: '🧭',
    subtitle: "Set this week's one priority and targets.",
    marker: () => mondayOfWeek(),
  },
  {
    type: 'weekly_closeout', title: 'Friday Close-Out', icon: '🌇',
    subtitle: 'Wins, challenges, next week — becomes your Weekly Review.',
    marker: () => mondayOfWeek(),
  },
  {
    type: 'monthly_snapshot', title: 'Monthly Snapshot', icon: '📊',
    subtitle: 'A one-glance summary of last month.',
    marker: () => currentMonthStr(),
  },
];

export default function ReviewPage() {
  const [open, setOpen] = useState(null);

  return (
    <div>
      <div className="page-title">🪞 Review</div>
      <p className="muted" style={{ marginTop: -8, marginBottom: 'var(--space-4)' }}>
        Every reflection ritual in one place — open any of these whenever you want, not just when the app happens to ask.
      </p>

      <div className="stack" style={{ gap: 'var(--space-3)' }}>
        {REVIEWS.map(r => (
          <Card key={r.type}>
            <div className="row-between">
              <div>
                <div style={{ fontWeight: 700, fontSize: 15 }}>{r.icon} {r.title}</div>
                <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>{r.subtitle}</div>
              </div>
              <Button size="sm" onClick={() => setOpen(r)}>Open</Button>
            </div>
          </Card>
        ))}

        <Card>
          <div className="row-between">
            <div>
              <div style={{ fontWeight: 700, fontSize: 15 }}>🧭 Business Weekly Reset</div>
              <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>Overdue contacts, this week's build, and your targets — start of week.</div>
            </div>
            <Link to="/business/weekly-reset"><Button size="sm" variant="ghost">Open →</Button></Link>
          </div>
        </Card>

        <Card>
          <div className="row-between">
            <div>
              <div style={{ fontWeight: 700, fontSize: 15 }}>💼 Business Weekly Reflection</div>
              <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>What worked, what didn't, what's next — for the business specifically.</div>
            </div>
            <Link to="/business/dashboard"><Button size="sm" variant="ghost">Open in Business →</Button></Link>
          </div>
        </Card>
      </div>

      {open && (
        <WeeklyResetModal promptType={open.type} marker={open.marker()} onClose={() => setOpen(null)} />
      )}
    </div>
  );
}