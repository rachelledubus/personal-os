import React, { useEffect, useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { Link } from 'react-router-dom';
import Card from '../../components/ui/Card.jsx';
import Button from '../../components/ui/Button.jsx';
import Checkbox from '../../components/ui/Checkbox.jsx';
import AiSuggestionBox from '../../components/ui/AiSuggestionBox.jsx';
import { requestFollowUpDraft, listOverdueContacts, getDatabaseHealth, getPipelineHealth, getRelationshipHealth } from '../../services/contacts.js';
import { FOLLOWUP_STANDARD_TYPES, getCadenceStandards, setCadenceStandards } from '../../services/followupStandards.js';
import { getTodayCheckin, toggleCheckinBox, getWeekCheckins, getWeeklyTargets, setWeeklyTargets, getWeeklyRunningTotals, getWeeklyReview, setWeeklyReview } from '../../services/dailyCheckin.js';
import { seedMasterTimelineIfEmpty, getThisWeekBuild, syncRoadmapStatuses } from '../../services/timeline.js';
import { getAutonomyLevel } from '../../services/aiOperator.js';
import { getDailyBriefing } from '../../services/dailyBriefing.js';
import WeeklyScorecardAndReview from './WeeklyScorecardAndReview.jsx';
import Skeleton from '../../components/ui/Skeleton.jsx';

// ============================================================
// DASHBOARD — a control panel, not the product. Today's four boxes
// and this week's build task were the original scope, deliberately
// kept minimal. One addition since: a daily briefing (the "Executive
// Assistant" item), because it's not another number to restate —
// it's the one thing on this page that synthesizes rather than lists.
// ============================================================
export default
function DashboardTab() {
  const [checkin, setCheckin] = useState(null);
  const [weekCheckins, setWeekCheckins] = useState([]);
  const [targets, setTargets] = useState(null);
  const [running, setRunning] = useState({ conversations: 0, consultations: 0 });
  const [thisWeekBuild, setThisWeekBuild] = useState(null);
  const [overdue, setOverdue] = useState([]);
  const [briefing, setBriefing] = useState(null);
  const [briefingLoading, setBriefingLoading] = useState(true);
  const [health, setHealth] = useState(null);
  const [editingTargets, setEditingTargets] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [targetForm, setTargetForm] = useState({ conversations_target: 10, knowledge_items_target: 10, consultations_target: 0, pipeline_moves_target: 0 });
  const [draftsByContact, setDraftsByContact] = useState({});
  const [drafting, setDrafting] = useState(null);
  const [autonomy, setAutonomy] = useState('confirm');
  const [review, setReview] = useState(null);
  const [reviewForm, setReviewForm] = useState({ what_worked: '', what_didnt: '', needs_attention: '', next_week_priorities: '' });
  const [editingReview, setEditingReview] = useState(false);
  const [pipelineHealth, setPipelineHealth] = useState(null);
  const [relationshipHealth, setRelationshipHealth] = useState(null);
  const [cadenceStandards, setCadenceStandardsState] = useState({});
  const [editingStandards, setEditingStandards] = useState(false);

  useEffect(() => {
    seedMasterTimelineIfEmpty().then(syncRoadmapStatuses).then(refresh);
    getAutonomyLevel().then(setAutonomy);
    getDailyBriefing().then(b => { setBriefing(b); setBriefingLoading(false); });
  }, []);

  async function handleRefreshBriefing() {
    setBriefingLoading(true);
    const b = await getDailyBriefing(true);
    setBriefing(b);
    setBriefingLoading(false);
  }

  async function refresh() {
    const [c, wc, t, r, w, ov, h, rv, ph, rh, cs] = await Promise.all([
      getTodayCheckin(), getWeekCheckins(), getWeeklyTargets(), getWeeklyRunningTotals(),
      getThisWeekBuild(), listOverdueContacts(), getDatabaseHealth(), getWeeklyReview(),
      getPipelineHealth(), getRelationshipHealth(), getCadenceStandards(),
    ]);
    setCheckin(c); setWeekCheckins(wc); setTargets(t); setRunning(r);
    setThisWeekBuild(w); setOverdue(ov); setHealth(h);
    if (t) setTargetForm(t);
    setReview(rv);
    if (rv) setReviewForm({ what_worked: rv.what_worked || '', what_didnt: rv.what_didnt || '', needs_attention: rv.needs_attention || '', next_week_priorities: rv.next_week_priorities || '' });
    setPipelineHealth(ph); setRelationshipHealth(rh); setCadenceStandardsState(cs);

    // Autonomy "auto": overdue follow-ups draft themselves, no click
    // needed. This is the actual behavior the setting controls — see
    // Control Center -> AI Settings.
    const level = await getAutonomyLevel();
    if (level === 'auto') {
      ov.forEach(async c2 => {
        const result = await requestFollowUpDraft(c2);
        if (result) setDraftsByContact(prev => ({ ...prev, [c2.id]: result }));
      });
    }
  }

  async function handleToggleBox(box, done) {
    setCheckin(prev => ({ ...(prev || {}), [`${box}_done`]: done }));
    await toggleCheckinBox(box, done);
    refresh();
  }

  async function handleSaveTargets() {
    await setWeeklyTargets(targetForm);
    setEditingTargets(false);
    refresh();
  }

  async function handleSaveReview() {
    await setWeeklyReview(reviewForm);
    setEditingReview(false);
    refresh();
  }

  async function handleSaveStandards() {
    await setCadenceStandards(cadenceStandards);
    setEditingStandards(false);
    refresh();
  }

  async function handleDraftFollowUp(contact) {
    setDrafting(contact.id);
    const result = await requestFollowUpDraft(contact);
    setDrafting(null);
    setDraftsByContact(prev => ({ ...prev, [contact.id]: result || { unavailable: true } }));
  }

  const BOXES = [
    { key: 'relationship', label: 'Relationship' },
    { key: 'authority', label: 'Authority' },
    { key: 'pipeline', label: 'Pipeline' },
    { key: 'knowledge', label: 'Knowledge' },
  ];
  const weekDoneCount = (box) => weekCheckins.filter(c => c[`${box}_done`]).length;

  return (
    <div className="stack" style={{ gap: 'var(--space-4)' }}>
      <Card>
        <div className="row-between">
          <div className="section-label">Today's briefing</div>
          <Button size="sm" variant="text" onClick={handleRefreshBriefing} disabled={briefingLoading}>{briefingLoading ? '…' : 'Regenerate'}</Button>
        </div>
        {briefingLoading ? (
          <div className="stack" style={{ marginTop: 'var(--space-2)', gap: 4 }}>
            <Skeleton width="90%" />
            <Skeleton width="70%" />
          </div>
        ) : briefing ? (
          <p style={{ fontSize: 'var(--text-small)', marginTop: 4 }}>{briefing}</p>
        ) : (
          <p className="muted" style={{ fontSize: 'var(--text-caption)', marginTop: 4 }}>
            No briefing available right now — this needs the AI service configured (GOOGLE_AI_API_KEY).
          </p>
        )}
      </Card>

      <Card className="today-summary-card">
        <div className="section-label">Today's four boxes</div>
        <div className="row" style={{ flexWrap: 'wrap', gap: 'var(--space-4)', marginTop: 'var(--space-3)' }}>
          {BOXES.map(b => (
            <Checkbox key={b.key} checked={!!checkin?.[`${b.key}_done`]} onChange={v => handleToggleBox(b.key, v)} label={b.label} />
          ))}
        </div>
      </Card>

      <Card>
        <div className="row-between">
          <div className="section-label">This week's targets</div>
          <Button size="sm" variant="text" onClick={() => setEditingTargets(!editingTargets)}>{editingTargets ? 'Cancel' : 'Set targets'}</Button>
        </div>
        {editingTargets ? (
          <div className="row" style={{ flexWrap: 'wrap', marginTop: 'var(--space-2)' }}>
            <label className="reset-field"><span>Conversations</span><input type="number" value={targetForm.conversations_target} onChange={e => setTargetForm({ ...targetForm, conversations_target: Number(e.target.value) })} /></label>
            <label className="reset-field"><span>Knowledge items</span><input type="number" value={targetForm.knowledge_items_target} onChange={e => setTargetForm({ ...targetForm, knowledge_items_target: Number(e.target.value) })} /></label>
            <label className="reset-field"><span>Consultations</span><input type="number" value={targetForm.consultations_target} onChange={e => setTargetForm({ ...targetForm, consultations_target: Number(e.target.value) })} /></label>
            <Button size="sm" onClick={handleSaveTargets}>Save</Button>
          </div>
        ) : (
          <div className="stack" style={{ marginTop: 'var(--space-2)' }}>
            <div className="row-between" style={{ fontSize: 'var(--text-small)' }}><span>Meaningful conversations</span><span className="muted">{running.conversations} / {targets?.conversations_target ?? 10}</span></div>
            <div className="row-between" style={{ fontSize: 'var(--text-small)' }}><span>Relationship boxes checked</span><span className="muted">{weekDoneCount('relationship')} / 5</span></div>
            <div className="row-between" style={{ fontSize: 'var(--text-small)' }}><span>Authority boxes checked</span><span className="muted">{weekDoneCount('authority')} / 5</span></div>
            <div className="row-between" style={{ fontSize: 'var(--text-small)' }}><span>Consultations booked</span><span className="muted">{running.consultations} / {targets?.consultations_target ?? 0}</span></div>
          </div>
        )}
      </Card>

      <WeeklyScorecardAndReview />


      {overdue.length > 0 && (
        <Card>
          <div className="row-between">
            <div className="section-label">Overdue follow-ups</div>
            {autonomy === 'auto' && <span className="muted" style={{ fontSize: 'var(--text-micro)' }}>✨ Auto-drafting enabled</span>}
          </div>
          <div className="stack" style={{ marginTop: 'var(--space-2)' }}>
            {overdue.map(c => (
              <div key={c.id} style={{ padding: '4px 0' }}>
                <div className="row-between">
                  <div>
                    <div style={{ fontSize: 'var(--text-small)', fontWeight: 700 }}>{c.name}</div>
                    <div className="muted" style={{ fontSize: 'var(--text-caption)' }}>{c.next_action || 'No next action set — overdue by relationship cadence'}</div>
                  </div>
                  {autonomy !== 'auto' && (
                    <Button size="sm" variant="ghost" onClick={() => handleDraftFollowUp(c)} disabled={drafting === c.id}>
                      {drafting === c.id ? '…' : '✨ Draft'}
                    </Button>
                  )}
                </div>
                {draftsByContact[c.id] && (
                  <AiSuggestionBox unavailable={draftsByContact[c.id].unavailable}
                    onDismiss={() => setDraftsByContact(prev => { const next = { ...prev }; delete next[c.id]; return next; })}>
                    <div style={{ fontSize: 'var(--text-small)' }}>{draftsByContact[c.id].message}</div>
                    <div className="muted" style={{ fontSize: 'var(--text-micro)', marginTop: 4 }}>{draftsByContact[c.id].channel}</div>
                  </AiSuggestionBox>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      {(health || pipelineHealth || relationshipHealth) && (
        <Card>
          <div className="row-between" style={{ cursor: 'pointer' }} onClick={() => setShowStats(!showStats)}>
            <div className="section-label">Business stats</div>
            <span className="muted" style={{ fontSize: 'var(--text-micro)' }}>{showStats ? 'Hide' : 'Show'}</span>
          </div>
          {showStats && (
            <div className="stack" style={{ marginTop: 'var(--space-3)', gap: 'var(--space-4)' }}>
              {health && (
                <div>
                  <div className="muted" style={{ fontSize: 'var(--text-micro)', textTransform: 'uppercase' }}>Database</div>
                  <div className="row-between" style={{ fontSize: 'var(--text-small)', marginTop: 4 }}>
                    <span>{health.total} contacts</span>
                    <span className="muted">{health.completeness}% have a next action</span>
                  </div>
                </div>
              )}
              {pipelineHealth && (
                <div>
                  <div className="muted" style={{ fontSize: 'var(--text-micro)', textTransform: 'uppercase' }}>Pipeline</div>
                  <div className="row-between" style={{ fontSize: 'var(--text-small)', marginTop: 4 }}>
                    <span>{pipelineHealth.total} active (Lead / Future Client / Active Client)</span>
                    <span className="muted">{pipelineHealth.stalled} stalled</span>
                  </div>
                  <div className="row" style={{ marginTop: 'var(--space-2)', flexWrap: 'wrap', gap: 4 }}>
                    {Object.entries(pipelineHealth.byCategory).map(([cat, n]) => (
                      <span key={cat} className="muted" style={{ fontSize: 'var(--text-micro)', background: 'var(--sand)', padding: '2px 8px', borderRadius: 'var(--radius-pill)' }}>{cat}: {n}</span>
                    ))}
                  </div>
                  {Object.keys(pipelineHealth.byStage).length > 0 && (
                    <div className="row" style={{ marginTop: 'var(--space-2)', flexWrap: 'wrap', gap: 4 }}>
                      {Object.entries(pipelineHealth.byStage).map(([stage, n]) => (
                        <span key={stage} className="muted" style={{ fontSize: 'var(--text-micro)' }}>{stage}: {n} · </span>
                      ))}
                    </div>
                  )}
                </div>
              )}
              {relationshipHealth && (
                <div>
                  <div className="muted" style={{ fontSize: 'var(--text-micro)', textTransform: 'uppercase' }}>Relationships</div>
                  <div className="stack" style={{ marginTop: 4, gap: 4 }}>
                    {Object.entries(relationshipHealth).map(([tier, h]) => (
                      <div key={tier} className="row-between" style={{ fontSize: 'var(--text-small)' }}>
                        <span>{tier.replace(' - ', ' \u2014 ')}</span>
                        <span className="muted">
                          {h.total} total{h.overdue > 0 && ` \u00b7 ${h.overdue} overdue`}
                          {h.avgDaysSinceContact != null && ` \u00b7 avg ${h.avgDaysSinceContact}d since contact`}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </Card>
      )}


      <Card>
        <div className="row-between">
          <div className="section-label">Follow-up standards</div>
          <Button size="sm" variant="text" onClick={() => setEditingStandards(!editingStandards)}>{editingStandards ? 'Cancel' : 'Edit'}</Button>
        </div>
        <div className="stack" style={{ marginTop: 'var(--space-2)', gap: 6 }}>
          {FOLLOWUP_STANDARD_TYPES.map(s => (
            <div key={s.key} className="row-between" style={{ fontSize: 'var(--text-small)' }}>
              <div>
                <div>{s.label}</div>
                <div className="muted" style={{ fontSize: 'var(--text-micro)' }}>{s.appliesTo}</div>
              </div>
              {editingStandards ? (
                <div className="row" style={{ alignItems: 'center', gap: 4 }}>
                  <input type="number" style={{ width: 60 }} value={cadenceStandards[s.key] ?? ''}
                    onChange={e => setCadenceStandardsState({ ...cadenceStandards, [s.key]: Number(e.target.value) })} />
                  <span className="muted" style={{ fontSize: 'var(--text-micro)' }}>days</span>
                </div>
              ) : (
                <span className="muted">every {cadenceStandards[s.key] ?? '—'} days</span>
              )}
            </div>
          ))}
          {editingStandards && <div><Button size="sm" onClick={handleSaveStandards}>Save standards</Button></div>}
        </div>
      </Card>
    </div>
  );
}
