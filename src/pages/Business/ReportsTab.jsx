import React, { useEffect, useState } from 'react';
import Card from '../../components/ui/Card.jsx';
import Button from '../../components/ui/Button.jsx';
import {
  getCeoDashboard, saveCeoDashboard, getAutoStatsForMonth, ANNUAL_CAMPAIGN_CALENDAR, currentQuarter,
  STATUS_LEGEND, getSystemStatusFolders, setSystemStatusFolders, DO_NOT_BUILD_LIST,
} from '../../services/businessReports.js';
import { currentMonthStr } from '../../utils/date.js';
import { getWeeklyPersonalEconomy } from '../../services/personalEconomy.js';
import Skeleton from '../../components/ui/Skeleton.jsx';

// ============================================================
// REPORTS — Bundle 3. Three "zoom out" views: CEO Dashboard (monthly
// snapshot), Annual Campaign Calendar (static, quarter-highlighted),
// System Status Index (16-folder master index, status-editable).
// ============================================================
export default
function ReportsTab() {
  const [subTab, setSubTab] = useState('ceo');
  return (
    <div>
      <div className="row" style={{ marginBottom: 'var(--space-4)', gap: 4 }}>
        {[['ceo', 'CEO Dashboard'], ['calendar', 'Campaign Calendar'], ['status', 'System Status'], ['economy', 'Personal Economy']].map(([key, label]) => (
          <button key={key} className={`sub-tab ${subTab === key ? 'active' : ''}`} onClick={() => setSubTab(key)}>{label}</button>
        ))}
      </div>
      {subTab === 'ceo' && <CeoDashboardView />}
      {subTab === 'calendar' && <CampaignCalendarView />}
      {subTab === 'status' && <SystemStatusView />}
      {subTab === 'economy' && <PersonalEconomyView />}
    </div>
  );
}

function CeoDashboardView() {
  const [monthKey, setMonthKey] = useState(currentMonthStr());
  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);

  const FIELDS = [
    ['consultations_booked', 'Consultations booked this month'],
    ['pending_contracts', 'Pending contracts'],
    ['website_visitors', 'Website visitors (if tracked)'],
    ['downloads_signups', 'Guide downloads / email signups'],
    ['referrals_received', 'Referrals received'],
    ['partner_conversations', 'New professional partner conversations'],
    ['sphere_touches', 'Sphere touches completed'],
    ['gci', 'Gross Commission Income (GCI) this month'],
    ['reviews_received', 'Reviews / testimonials received'],
  ];
  const REFLECTION_FIELDS = [
    ['biggest_win', 'Biggest win'],
    ['biggest_challenge', 'Biggest challenge'],
    ['doing_differently', 'What I\u2019m doing differently next month'],
    ['one_priority', 'This month\u2019s one priority'],
  ];

  useEffect(() => { load(); }, [monthKey]);

  async function load() {
    setLoading(true);
    const [saved, autoStats] = await Promise.all([getCeoDashboard(monthKey), getAutoStatsForMonth(monthKey)]);
    setForm({ ...autoStats, ...(saved || {}) }); // saved values win over auto stats once you've edited them
    setLoading(false);
  }

  async function handleSave() {
    await saveCeoDashboard(monthKey, form);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }

  function shiftMonth(delta) {
    const [y, m] = monthKey.split('-').map(Number);
    const d = new Date(y, m - 1 + delta, 1);
    setMonthKey(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }

  if (loading || !form) return null;
  const monthLabel = (() => {
    const [y, m] = monthKey.split('-').map(Number);
    return new Date(y, m - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  })();

  return (
    <div className="stack" style={{ gap: 'var(--space-4)' }}>
      <div className="row" style={{ gap: 'var(--space-2)', alignItems: 'center' }}>
        <Button size="sm" variant="ghost" onClick={() => shiftMonth(-1)}>←</Button>
        <span style={{ fontWeight: 700 }}>{monthLabel}</span>
        <Button size="sm" variant="ghost" onClick={() => shiftMonth(1)}>→</Button>
      </div>

      <Card>
        <div className="section-label">Pipeline snapshot</div>
        <p className="muted" style={{ fontSize: 'var(--text-micro)', marginTop: 4 }}>Active leads, active clients, closings, and flagship content pre-fill from real data — everything else is a manual snapshot, same as the paper version.</p>
        <div className="row" style={{ flexWrap: 'wrap', gap: 'var(--space-3)', marginTop: 'var(--space-2)' }}>
          <div><div className="muted" style={{ fontSize: 'var(--text-micro)' }}>Active leads</div><div style={{ fontWeight: 700, fontSize: 'var(--text-subtitle)' }}>{form.active_leads ?? 0}</div></div>
          <div><div className="muted" style={{ fontSize: 'var(--text-micro)' }}>Active clients</div><div style={{ fontWeight: 700, fontSize: 'var(--text-subtitle)' }}>{form.active_clients ?? 0}</div></div>
          <div><div className="muted" style={{ fontSize: 'var(--text-micro)' }}>Closings this month</div><div style={{ fontWeight: 700, fontSize: 'var(--text-subtitle)' }}>{form.closings_this_month ?? 0}</div></div>
          <div><div className="muted" style={{ fontSize: 'var(--text-micro)' }}>Flagship content published</div><div style={{ fontWeight: 700, fontSize: 'var(--text-subtitle)' }}>{form.flagship_content_published ?? 0}</div></div>
        </div>
      </Card>

      <Card>
        <div className="section-label">The rest of the snapshot</div>
        <div className="stack" style={{ marginTop: 'var(--space-2)', gap: 'var(--space-2)' }}>
          {FIELDS.map(([key, label]) => (
            <label key={key} className="reset-field">
              <span>{label}</span>
              <input value={form[key] || ''} onChange={e => setForm({ ...form, [key]: e.target.value })} />
            </label>
          ))}
        </div>
      </Card>

      <Card>
        <div className="section-label">This month, in one line each</div>
        <div className="stack" style={{ marginTop: 'var(--space-2)', gap: 'var(--space-2)' }}>
          {REFLECTION_FIELDS.map(([key, label]) => (
            <label key={key} className="reset-field">
              <span>{label}</span>
              <input value={form[key] || ''} onChange={e => setForm({ ...form, [key]: e.target.value })} />
            </label>
          ))}
        </div>
        <Button size="sm" onClick={handleSave} style={{ marginTop: 'var(--space-3)' }}>{saved ? 'Saved \u2713' : 'Save snapshot'}</Button>
      </Card>
    </div>
  );
}

function CampaignCalendarView() {
  const nowQ = currentQuarter();
  return (
    <div className="stack" style={{ gap: 'var(--space-3)' }}>
      <p className="muted" style={{ fontSize: 'var(--text-caption)' }}>
        Not a content calendar — a focus calendar. Same four quarters every year; only revisit this at the annual review.
      </p>
      {ANNUAL_CAMPAIGN_CALENDAR.map((q, i) => (
        <Card key={q.quarter} style={i === nowQ ? { borderColor: 'var(--sage)', borderWidth: 2, borderStyle: 'solid' } : undefined}>
          <div className="row-between">
            <div style={{ fontWeight: 700 }}>{q.quarter} · {q.months} — {q.theme}</div>
            {i === nowQ && <span className="muted" style={{ fontSize: 'var(--text-micro)', color: 'var(--sage)' }}>● Current quarter</span>}
          </div>
          <div style={{ fontSize: 'var(--text-small)', marginTop: 'var(--space-2)' }}><strong>Audience:</strong> {q.audience}</div>
          <div style={{ fontSize: 'var(--text-small)', marginTop: 4 }}><strong>Why now:</strong> {q.why_now}</div>
          <div style={{ fontSize: 'var(--text-small)', marginTop: 4 }}><strong>Focus:</strong> {q.focus}</div>
        </Card>
      ))}
    </div>
  );
}

function SystemStatusView() {
  const [folders, setFolders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, []);
  async function load() {
    setFolders(await getSystemStatusFolders());
    setLoading(false);
  }

  async function handleStatusChange(number, status) {
    const next = folders.map(f => (f.number === number ? { ...f, status } : f));
    setFolders(next);
    await setSystemStatusFolders(next);
  }

  if (loading) return null;

  return (
    <div className="stack" style={{ gap: 'var(--space-4)' }}>
      <p className="muted" style={{ fontSize: 'var(--text-caption)' }}>
        Master index for the 16-folder operating system. The system is frozen — status changes only, no rewrites, no new systems.
      </p>
      <div className="row" style={{ flexWrap: 'wrap', gap: 8 }}>
        {Object.entries(STATUS_LEGEND).map(([key, s]) => (
          <div key={key} className="muted" style={{ fontSize: 'var(--text-micro)' }}>{s.symbol} {s.label} — {s.description}</div>
        ))}
      </div>
      <div className="stack" style={{ gap: 4 }}>
        {folders.map(f => (
          <Card key={f.number}>
            <div className="row-between">
              <div><strong>{f.number}</strong> · {f.name}</div>
              <select value={f.status} onChange={e => handleStatusChange(f.number, e.target.value)}>
                {Object.entries(STATUS_LEGEND).map(([key, s]) => <option key={key} value={key}>{s.symbol} {s.label}</option>)}
              </select>
            </div>
            <div className="muted" style={{ fontSize: 'var(--text-caption)', marginTop: 4 }}>{f.note}</div>
          </Card>
        ))}
      </div>
      <Card>
        <div className="section-label">Not now — do-not-build list</div>
        <div className="stack" style={{ marginTop: 'var(--space-2)', gap: 4 }}>
          {DO_NOT_BUILD_LIST.map((item, i) => <div key={i} style={{ fontSize: 'var(--text-small)' }}>• {item}</div>)}
        </div>
      </Card>
    </div>
  );
}

// ============================================================
// PERSONAL ECONOMY — Phase 4 backlog item, built from a one-line
// description. Time, energy, and money as one combined weekly
// picture, built entirely from data that already exists elsewhere in
// the app (time_blocks, energy_logs, finance_entries) rather than a
// fourth kind of daily input.
// ============================================================
function PersonalEconomyView() {
  const [economy, setEconomy] = useState(null);

  useEffect(() => { getWeeklyPersonalEconomy().then(setEconomy); }, []);

  if (!economy) {
    return (
      <div className="stack" style={{ gap: 'var(--space-3)' }}>
        <Skeleton variant="card" />
      </div>
    );
  }

  const totalMinutes = economy.timeByTrack.personal + economy.timeByTrack.business;
  const businessPct = totalMinutes ? Math.round((economy.timeByTrack.business / totalMinutes) * 100) : 0;

  return (
    <div className="stack" style={{ gap: 'var(--space-4)' }}>
      <Card>
        <div className="section-label">Week of {economy.weekOf}</div>
        <p className="muted" style={{ fontSize: 'var(--text-caption)', marginTop: 4 }}>
          Time, energy, and money for the same week — pulled from what's already tracked elsewhere, not a new log.
        </p>

        <div className="macro-grid" style={{ marginTop: 'var(--space-4)' }}>
          <div className="macro-cell">
            <span className="muted">Time — scheduled hours</span>
            <div style={{ fontSize: 'var(--text-subtitle)', fontWeight: 700 }}>
              {Math.round(totalMinutes / 60)}h total
            </div>
            <div className="muted" style={{ fontSize: 'var(--text-micro)' }}>
              {Math.round(economy.timeByTrack.personal / 60)}h personal · {Math.round(economy.timeByTrack.business / 60)}h business ({businessPct}%)
            </div>
          </div>

          <div className="macro-cell">
            <span className="muted">Energy — average check-in</span>
            <div style={{ fontSize: 'var(--text-subtitle)', fontWeight: 700 }}>
              {economy.avgEnergy ? economy.avgEnergy.toFixed(1) + ' / 3' : 'No check-ins yet'}
            </div>
            <div className="muted" style={{ fontSize: 'var(--text-micro)' }}>{economy.energyCheckins} check-in{economy.energyCheckins === 1 ? '' : 's'} this week</div>
          </div>

          <div className="macro-cell">
            <span className="muted">Money — this week</span>
            <div style={{ fontSize: 'var(--text-subtitle)', fontWeight: 700, color: economy.money.net >= 0 ? 'var(--success)' : 'var(--danger)' }}>
              ${economy.money.net.toFixed(0)} net
            </div>
            <div className="muted" style={{ fontSize: 'var(--text-micro)' }}>${economy.money.income.toFixed(0)} in · ${economy.money.spend.toFixed(0)} out</div>
          </div>
        </div>
      </Card>
    </div>
  );
}
