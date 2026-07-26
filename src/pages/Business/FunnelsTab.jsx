import React, { useEffect, useState } from 'react';
import Card from '../../components/ui/Card.jsx';
import Button from '../../components/ui/Button.jsx';
import Checkbox from '../../components/ui/Checkbox.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import { listContacts } from '../../services/contacts.js';
import {
  seedLeadMagnetsIfEmpty, listLeadMagnets, updateLeadMagnetStatus, LANDING_PAGE_STANDARDS, NURTURE_SEQUENCES,
  CTAS_BY_FUNNEL, listNurtureTracking, addNurtureTracking, updateNurtureTracking, deleteNurtureTracking, getFunnelDashboardStats,
} from '../../services/leadMagnets.js';

// ============================================================
// FUNNELS — Bundle 5 / System 04C. Lead magnets as real entities, the
// two nurture sequences as reference, and a live per-lead tracker
// (the manual's own "start with a spreadsheet" recommendation, just
// live) that the dashboard stats are computed from.
// ============================================================
export default
function FunnelsTab() {
  const [subTab, setSubTab] = useState('magnets');
  useEffect(() => { seedLeadMagnetsIfEmpty(); }, []);
  return (
    <div>
      <div className="row" style={{ marginBottom: 'var(--space-4)', gap: 4 }}>
        {[['magnets', 'Lead Magnets'], ['tracking', 'Nurture Tracking']].map(([key, label]) => (
          <button key={key} className={`sub-tab ${subTab === key ? 'active' : ''}`} onClick={() => setSubTab(key)}>{label}</button>
        ))}
      </div>
      {subTab === 'magnets' && <LeadMagnetsView />}
      {subTab === 'tracking' && <NurtureTrackingView />}
    </div>
  );
}

function LeadMagnetsView() {
  const [magnets, setMagnets] = useState([]);
  const [expandedId, setExpandedId] = useState(null);
  const [showStandards, setShowStandards] = useState(false);

  useEffect(() => { refresh(); }, []);
  async function refresh() { setMagnets(await listLeadMagnets()); }

  async function handleStatusChange(id, status) {
    await updateLeadMagnetStatus(id, status);
    refresh();
  }

  return (
    <div className="stack" style={{ gap: 'var(--space-4)' }}>
      <Card>
        <div className="row-between">
          <div className="section-label">Landing page standards</div>
          <Button size="sm" variant="text" onClick={() => setShowStandards(!showStandards)}>{showStandards ? 'Hide' : 'Show'}</Button>
        </div>
        {showStandards && (
          <div className="stack" style={{ marginTop: 'var(--space-2)', gap: 4 }}>
            {LANDING_PAGE_STANDARDS.map((s, i) => (
              <div key={i} style={{ fontSize: 'var(--text-small)' }}><strong>{i + 1}. {s.element}</strong> — {s.standard}</div>
            ))}
          </div>
        )}
      </Card>

      {magnets.map(m => (
        <Card key={m.id}>
          <div className="row-between" onClick={() => setExpandedId(expandedId === m.id ? null : m.id)} style={{ cursor: 'pointer' }}>
            <div>
              <div style={{ fontWeight: 700 }}>{m.name}</div>
              <div className="muted" style={{ fontSize: 'var(--text-caption)' }}>{m.funnel} · {m.build_phase}</div>
            </div>
            <select value={m.status} onClick={e => e.stopPropagation()} onChange={e => handleStatusChange(m.id, e.target.value)}>
              <option value="planned">Planned</option>
              <option value="building">Building</option>
              <option value="live">Live</option>
            </select>
          </div>
          {expandedId === m.id && (
            <div style={{ marginTop: 'var(--space-3)' }}>
              <div style={{ fontSize: 'var(--text-small)' }}><strong>Audience:</strong> {m.audience}</div>
              <div style={{ fontSize: 'var(--text-small)', marginTop: 4 }}><strong>Solves:</strong> {m.primary_problem}</div>
              <div style={{ fontSize: 'var(--text-small)', marginTop: 4 }}><strong>Next step:</strong> {m.next_step}</div>
              <div className="muted" style={{ fontSize: 'var(--text-micro)', marginTop: 'var(--space-2)', textTransform: 'uppercase' }}>What's inside</div>
              <div className="stack" style={{ marginTop: 4, gap: 2 }}>
                {(m.whats_inside || []).map((bullet, i) => <div key={i} style={{ fontSize: 'var(--text-small)' }}>• {bullet}</div>)}
              </div>
              {NURTURE_SEQUENCES[m.funnel] && (
                <>
                  <div className="muted" style={{ fontSize: 'var(--text-micro)', marginTop: 'var(--space-3)', textTransform: 'uppercase' }}>5-email nurture sequence</div>
                  <div className="stack" style={{ marginTop: 4, gap: 2 }}>
                    {NURTURE_SEQUENCES[m.funnel].map((email, i) => <div key={i} style={{ fontSize: 'var(--text-small)' }}>{i + 1}. {email}</div>)}
                  </div>
                </>
              )}
            </div>
          )}
        </Card>
      ))}

      <Card>
        <div className="section-label">CTA library by funnel</div>
        <div className="stack" style={{ marginTop: 'var(--space-2)', gap: 4 }}>
          {Object.entries(CTAS_BY_FUNNEL).map(([category, ctas]) => (
            <div key={category} style={{ fontSize: 'var(--text-small)' }}><strong>{category}:</strong> {ctas.join(' · ')}</div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function NurtureTrackingView() {
  const [rows, setRows] = useState([]);
  const [magnets, setMagnets] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [stats, setStats] = useState(null);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ contact_id: '', lead_magnet_id: '', lead_name: '', date_started: new Date().toISOString().slice(0, 10) });

  useEffect(() => { refresh(); }, []);
  async function refresh() {
    const [t, m, c, s] = await Promise.all([listNurtureTracking(), listLeadMagnets(), listContacts(), getFunnelDashboardStats()]);
    setRows(t);
    setMagnets(m);
    setContacts(c);
    setStats(s);
  }

  async function handleAdd() {
    if (!form.lead_magnet_id) return;
    const contact = contacts.find(c => c.id === form.contact_id);
    await addNurtureTracking({ ...form, lead_name: contact?.name || form.lead_name, contact_id: form.contact_id || null });
    setForm({ contact_id: '', lead_magnet_id: '', lead_name: '', date_started: new Date().toISOString().slice(0, 10) });
    setAdding(false);
    refresh();
  }

  async function handleUpdate(row, fields) {
    await updateNurtureTracking(row.id, fields);
    refresh();
  }

  return (
    <div className="stack" style={{ gap: 'var(--space-4)' }}>
      {stats && (
        <Card>
          <div className="section-label">Tracking dashboard</div>
          <div className="row" style={{ flexWrap: 'wrap', gap: 'var(--space-3)', marginTop: 'var(--space-2)' }}>
            <div><div className="muted" style={{ fontSize: 'var(--text-micro)' }}>Downloads</div><div style={{ fontWeight: 700, fontSize: 'var(--text-subtitle)' }}>{stats.downloads}</div></div>
            <div><div className="muted" style={{ fontSize: 'var(--text-micro)' }}>In sequence</div><div style={{ fontWeight: 700, fontSize: 'var(--text-subtitle)' }}>{stats.inProgress}</div></div>
            <div><div className="muted" style={{ fontSize: 'var(--text-micro)' }}>Replied</div><div style={{ fontWeight: 700, fontSize: 'var(--text-subtitle)' }}>{stats.replied}</div></div>
            <div><div className="muted" style={{ fontSize: 'var(--text-micro)' }}>Booked</div><div style={{ fontWeight: 700, fontSize: 'var(--text-subtitle)' }}>{stats.booked}</div></div>
          </div>
        </Card>
      )}

      <Card>
        <div className="row-between">
          <div className="section-label">Nurture tracking</div>
          <Button size="sm" variant="ghost" onClick={() => setAdding(!adding)}>{adding ? 'Cancel' : '+ New lead on a sequence'}</Button>
        </div>
        {adding && (
          <div className="row" style={{ marginTop: 'var(--space-3)', flexWrap: 'wrap' }}>
            <select value={form.contact_id} onChange={e => setForm({ ...form, contact_id: e.target.value })}>
              <option value="">Not linked to a contact</option>
              {contacts.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            {!form.contact_id && <input placeholder="Lead name" value={form.lead_name} onChange={e => setForm({ ...form, lead_name: e.target.value })} />}
            <select value={form.lead_magnet_id} onChange={e => setForm({ ...form, lead_magnet_id: e.target.value })}>
              <option value="">Which magnet...</option>
              {magnets.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
            <input type="date" value={form.date_started} onChange={e => setForm({ ...form, date_started: e.target.value })} />
            <Button size="sm" onClick={handleAdd}>Add</Button>
          </div>
        )}
      </Card>

      {rows.length === 0 ? <EmptyState icon="megaphone" title="No one on a nurture sequence yet" /> : rows.map(row => (
        <Card key={row.id}>
          <div className="row-between">
            <div>
              <div style={{ fontWeight: 700 }}>{row.contacts?.name || row.lead_name || 'Unnamed lead'}</div>
              <div className="muted" style={{ fontSize: 'var(--text-caption)' }}>{row.lead_magnets?.name} · started {row.date_started}</div>
            </div>
            <button className="row-remove-btn" aria-label="Remove" onClick={() => deleteNurtureTracking(row.id).then(refresh)}>×</button>
          </div>
          <div className="row" style={{ marginTop: 'var(--space-2)', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
            <span className="muted" style={{ fontSize: 'var(--text-micro)' }}>Email sent:</span>
            <select value={row.current_email} onChange={e => handleUpdate(row, { current_email: Number(e.target.value) })}>
              {[0, 1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{n}/5</option>)}
            </select>
            <Checkbox checked={row.replied} onChange={v => handleUpdate(row, { replied: v })} label="Replied" />
            <Checkbox checked={row.booked} onChange={v => handleUpdate(row, { booked: v })} label="Booked" />
          </div>
        </Card>
      ))}
    </div>
  );
}
