import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Card from '../../components/ui/Card.jsx';
import Button from '../../components/ui/Button.jsx';
import ContactProfilePanel from '../../components/business/ContactProfilePanel.jsx';
import { listOverdueContacts } from '../../services/contacts.js';
import { getWeeklyTargets, setWeeklyTargets, getWeeklyRunningTotals, getWeekCheckins } from '../../services/dailyCheckin.js';
import { getThisWeekBuild } from '../../services/timeline.js';

const STATUS_TONE = { Overdue: 'var(--terracotta, #C0553A)' };

// The actual "Business Monday Reset" — what was missing wasn't a link
// to Business Dashboard (too generic, makes you go hunting), it was
// one page that shows the specific overdue people, this week's build,
// and lets you set targets, all in the one place you're sent to.
//
// Targets here deliberately mirror exactly what Business Dashboard's
// "This week's targets" summary shows — conversations and
// consultations (real weekly_targets, editable + live progress) plus
// relationship/authority boxes checked (derived from daily check-ins,
// read-only here same as there). Earlier version also had
// "Knowledge items" / "Pipeline moves" fields that saved correctly
// but don't correspond to anything visibly tracked anywhere, so
// editing them looked broken even though it wasn't. Dropped rather
// than kept as dead, confusing inputs.
export default function BusinessWeeklyResetPage() {
  const [overdue, setOverdue] = useState([]);
  const [thisWeekBuild, setThisWeekBuild] = useState(null);
  const [targets, setTargets] = useState(null);
  const [running, setRunning] = useState({ conversations: 0, consultations: 0 });
  const [weekCheckins, setWeekCheckins] = useState([]);
  const [targetForm, setTargetForm] = useState({ conversations_target: 10, consultations_target: 0 });
  const [editingTargets, setEditingTargets] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [saved, setSaved] = useState(false);

  const weekDoneCount = (box) => weekCheckins.filter(c => c[`${box}_done`]).length;

  async function refresh() {
    const [ov, build, t, r, wc] = await Promise.all([
      listOverdueContacts(), getThisWeekBuild(), getWeeklyTargets(), getWeeklyRunningTotals(), getWeekCheckins(),
    ]);
    setOverdue(ov);
    setThisWeekBuild(build);
    setTargets(t);
    setRunning(r);
    setWeekCheckins(wc);
    if (t) setTargetForm({ conversations_target: t.conversations_target ?? 10, consultations_target: t.consultations_target ?? 0 });
  }
  useEffect(() => { refresh(); }, []);

  async function handleSaveTargets() {
    await setWeeklyTargets(targetForm);
    setSaved(true);
    setEditingTargets(false);
    await refresh();
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="stack" style={{ gap: 'var(--space-4)', maxWidth: 720 }}>
      <div>
        <div className="page-title">🧭 Business Weekly Reset</div>
        <p className="muted" style={{ marginTop: -8 }}>Who needs attention, what's this week's build, and what you're aiming for.</p>
      </div>

      <Card>
        <div className="section-label">Overdue · {overdue.length}</div>
        {overdue.length === 0 ? (
          <div className="muted" style={{ fontSize: 13, marginTop: 'var(--space-2)' }}>Nobody's overdue right now.</div>
        ) : (
          <div className="stack" style={{ marginTop: 'var(--space-2)' }}>
            {overdue.map(c => (
              <div key={c.id} className="row-between" style={{ borderBottom: '1px solid var(--sand)', padding: '6px 0', cursor: 'pointer' }}
                onClick={() => setSelectedId(c.id)}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{c.name}</div>
                  <div className="muted" style={{ fontSize: 12 }}>{c.next_action || 'No next action set'}</div>
                </div>
                <span style={{ fontSize: 11, fontWeight: 700, color: STATUS_TONE.Overdue }}>Overdue</span>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card>
        <div className="section-label">This week's build</div>
        {thisWeekBuild ? (
          <div className="row-between" style={{ marginTop: 'var(--space-2)' }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14 }}>{thisWeekBuild.title}</div>
              <div className="muted" style={{ fontSize: 12 }}>{thisWeekBuild.phase}</div>
            </div>
            <Link to="/business/roadmap"><Button size="sm" variant="ghost">Open →</Button></Link>
          </div>
        ) : (
          <div className="muted" style={{ fontSize: 13, marginTop: 'var(--space-2)' }}>Nothing marked In Progress on the roadmap this week.</div>
        )}
      </Card>

      <Card>
        <div className="row-between">
          <div className="section-label">This week's targets</div>
          <Button size="sm" variant="text" onClick={() => setEditingTargets(!editingTargets)}>{editingTargets ? 'Cancel' : 'Edit'}</Button>
        </div>
        {editingTargets ? (
          <div className="row" style={{ marginTop: 'var(--space-2)', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
            <label className="reset-field"><span>Meaningful conversations target</span>
              <input type="number" value={targetForm.conversations_target} onChange={e => setTargetForm({ ...targetForm, conversations_target: Number(e.target.value) })} />
            </label>
            <label className="reset-field"><span>Consultations target</span>
              <input type="number" value={targetForm.consultations_target} onChange={e => setTargetForm({ ...targetForm, consultations_target: Number(e.target.value) })} />
            </label>
            <div style={{ width: '100%' }}><Button size="sm" onClick={handleSaveTargets}>{saved ? 'Saved ✓' : 'Save targets'}</Button></div>
          </div>
        ) : (
          <div className="stack" style={{ marginTop: 'var(--space-2)' }}>
            <div className="row-between" style={{ fontSize: 13 }}><span>Meaningful conversations</span><span className="muted">{running.conversations} / {targets?.conversations_target ?? 10}</span></div>
            <div className="row-between" style={{ fontSize: 13 }}><span>Relationship boxes checked</span><span className="muted">{weekDoneCount('relationship')} / 5</span></div>
            <div className="row-between" style={{ fontSize: 13 }}><span>Authority boxes checked</span><span className="muted">{weekDoneCount('authority')} / 5</span></div>
            <div className="row-between" style={{ fontSize: 13 }}><span>Consultations booked</span><span className="muted">{running.consultations} / {targets?.consultations_target ?? 0}</span></div>
          </div>
        )}
      </Card>

      <ContactProfilePanel contactId={selectedId} onClose={() => setSelectedId(null)} onUpdated={refresh} />
    </div>
  );
}