import React, { useEffect, useState } from 'react';
import { Briefcase, RotateCcw, Target, Check, Split } from 'lucide-react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import Card from '../../components/ui/Card.jsx';
import Button from '../../components/ui/Button.jsx';
import Checkbox from '../../components/ui/Checkbox.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import { supabase } from '../../lib/supabaseClient.js';
import { FLOWS } from '../../services/flows.js';
import { listMilestones, addMilestone, toggleMilestone, updateMilestone, deleteMilestone, updateRoadmapLink, updateRoadmapTitle, listGoals } from '../../services/goals.js';
import { getCategoryList } from '../../services/settings.js';
import Banner from '../../components/ui/Banner.jsx';
import AiSuggestionBox from '../../components/ui/AiSuggestionBox.jsx';
import {
  listContacts, listByTier, listOverdueContacts, getDatabaseHealth, addContact, requestFollowUpDraft,
  inferDefaultTier, autoTagUntieredContacts, getPipelineHealth, getRelationshipHealth,
} from '../../services/contacts.js';
import ContactProfilePanel from '../../components/business/ContactProfilePanel.jsx';
import { FOLLOWUP_STANDARD_TYPES, getCadenceStandards, setCadenceStandards } from '../../services/followupStandards.js';
import { getTodayCheckin, toggleCheckinBox, getWeekCheckins, getWeeklyTargets, setWeeklyTargets, getWeeklyRunningTotals, getWeeklyReview, setWeeklyReview } from '../../services/dailyCheckin.js';
import { seedMasterTimelineIfEmpty, getThisWeekBuild, syncRoadmapStatuses, syncRoadmapItemFromSubtasks, setRoadmapItemInProgress, setRoadmapItemStatus, resetRoadmapItemToAutomatic } from '../../services/timeline.js';
import { listContentPieces, addContentPiece } from '../../services/contentEngine.js';
import { listMarketingActivities, addMarketingActivity, updateMarketingActivity, completeMarketingActivity, deleteMarketingActivity } from '../../services/marketing.js';
import { seedLibraryIfEmpty, listCtas, listScripts, listPrompts, addCta, addScript, addPrompt, syncLibraryGaps } from '../../services/library.js';
import { listTransactions, addTransaction } from '../../services/transactions.js';
import { getAutonomyLevel } from '../../services/aiOperator.js';
import {
  getCeoDashboard, saveCeoDashboard, getAutoStatsForMonth, ANNUAL_CAMPAIGN_CALENDAR, currentQuarter,
  STATUS_LEGEND, getSystemStatusFolders, setSystemStatusFolders, DO_NOT_BUILD_LIST,
} from '../../services/businessReports.js';
import { currentMonthStr } from '../../utils/date.js';
import {
  seedLeadMagnetsIfEmpty, listLeadMagnets, updateLeadMagnetStatus, LANDING_PAGE_STANDARDS, NURTURE_SEQUENCES,
  CTAS_BY_FUNNEL, listNurtureTracking, addNurtureTracking, updateNurtureTracking, deleteNurtureTracking, getFunnelDashboardStats,
} from '../../services/leadMagnets.js';

const TABS = ['dashboard', 'pipeline', 'relationships', 'content', 'marketing', 'library', 'clients', 'roadmap', 'reports', 'funnels'];
const TAB_LABELS = { dashboard: 'Dashboard', pipeline: 'Pipeline', relationships: 'Relationships', content: 'Content', marketing: 'Marketing', library: 'Library', clients: 'Clients', roadmap: 'Roadmap', reports: 'Reports', funnels: 'Funnels' };

export default function BusinessPage() {
  const { tab = 'dashboard' } = useParams();
  const navigate = useNavigate();

  return (
    <div>
      <Banner slotKey="business_banner" scene="business" />
      <div className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Briefcase size={20} /> Business</div>

      <div className="row" style={{ marginBottom: 'var(--space-4)', flexWrap: 'wrap' }}>
        {TABS.map(t => (
          <button key={t} className={`sub-tab ${tab === t ? 'active' : ''}`} onClick={() => navigate(`/business/${t}`)}>
            {TAB_LABELS[t]}
          </button>
        ))}
      </div>

      {tab === 'dashboard' && <DashboardTab />}
      {tab === 'pipeline' && <PipelineTab />}
      {tab === 'relationships' && <RelationshipsTab />}
      {tab === 'content' && <ContentTab />}
      {tab === 'marketing' && <MarketingTab />}
      {tab === 'library' && <LibraryTab />}
      {tab === 'clients' && <ClientsTab />}
      {tab === 'roadmap' && <RoadmapTab />}
      {tab === 'reports' && <ReportsTab />}
      {tab === 'funnels' && <FunnelsTab />}
    </div>
  );
}

// ============================================================
// DASHBOARD — a control panel, not the product. Today's four boxes
// and this week's build task, nothing more added here on purpose.
// ============================================================
function DashboardTab() {
  const [checkin, setCheckin] = useState(null);
  const [weekCheckins, setWeekCheckins] = useState([]);
  const [targets, setTargets] = useState(null);
  const [running, setRunning] = useState({ conversations: 0, consultations: 0 });
  const [thisWeekBuild, setThisWeekBuild] = useState(null);
  const [overdue, setOverdue] = useState([]);
  const [health, setHealth] = useState(null);
  const [editingTargets, setEditingTargets] = useState(false);
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

  useEffect(() => { seedMasterTimelineIfEmpty().then(syncRoadmapStatuses).then(refresh); getAutonomyLevel().then(setAutonomy); }, []);

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
          <div className="section-label">This week's one build task</div>
          {thisWeekBuild?.date_range && <span className="muted" style={{ fontSize: 12 }}>{thisWeekBuild.date_range}</span>}
        </div>
        {thisWeekBuild ? <div style={{ marginTop: 'var(--space-2)' }}>{thisWeekBuild.title}</div> : <div className="muted" style={{ fontSize: 13 }}>No build currently in progress — check Roadmap.</div>}
        <Link to="/business/roadmap"><Button size="sm" variant="text">Open Roadmap →</Button></Link>
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
            <div className="row-between" style={{ fontSize: 13 }}><span>Meaningful conversations</span><span className="muted">{running.conversations} / {targets?.conversations_target ?? 10}</span></div>
            <div className="row-between" style={{ fontSize: 13 }}><span>Relationship boxes checked</span><span className="muted">{weekDoneCount('relationship')} / 5</span></div>
            <div className="row-between" style={{ fontSize: 13 }}><span>Authority boxes checked</span><span className="muted">{weekDoneCount('authority')} / 5</span></div>
            <div className="row-between" style={{ fontSize: 13 }}><span>Consultations booked</span><span className="muted">{running.consultations} / {targets?.consultations_target ?? 0}</span></div>
          </div>
        )}
      </Card>

      <Card>
        <div className="row-between">
          <div>
            <div className="section-label">Weekly reflection</div>
            <Link to="/review" className="muted" style={{ fontSize: 11, display: 'inline-flex', alignItems: 'center', gap: 3 }}><RotateCcw size={12} />All reviews →</Link>
          </div>
          <Button size="sm" variant="text" onClick={() => setEditingReview(!editingReview)}>
            {editingReview ? 'Cancel' : (review ? 'Edit' : 'Add reflection')}
          </Button>
        </div>
        {editingReview ? (
          <div className="stack" style={{ marginTop: 'var(--space-2)' }}>
            <label className="reset-field">
              <span>One thing that went well</span>
              <div className="muted" style={{ fontSize: 11, marginTop: -2, marginBottom: 2 }}>A specific conversation, follow-up, or activity — not a general feeling.</div>
              <textarea placeholder="e.g. Called Sarah back within an hour of her question" value={reviewForm.what_worked}
                onChange={e => setReviewForm({ ...reviewForm, what_worked: e.target.value })} style={{ minHeight: 44 }} />
            </label>
            <label className="reset-field">
              <span>One thing that was a struggle</span>
              <div className="muted" style={{ fontSize: 11, marginTop: -2, marginBottom: 2 }}>Name the specific thing, not just "I was busy."</div>
              <textarea placeholder="e.g. Put off following up with 3 leads until Thursday" value={reviewForm.what_didnt}
                onChange={e => setReviewForm({ ...reviewForm, what_didnt: e.target.value })} style={{ minHeight: 44 }} />
            </label>
            <label className="reset-field">
              <span>Anyone or anything that needs attention now</span>
              <div className="muted" style={{ fontSize: 11, marginTop: -2, marginBottom: 2 }}>A specific contact, deal, or task — not a category.</div>
              <textarea placeholder="e.g. The Ramirez listing — haven't heard back in 5 days" value={reviewForm.needs_attention}
                onChange={e => setReviewForm({ ...reviewForm, needs_attention: e.target.value })} style={{ minHeight: 44 }} />
            </label>
            <label className="reset-field">
              <span>The ONE priority for next week</span>
              <div className="muted" style={{ fontSize: 11, marginTop: -2, marginBottom: 2 }}>Just one. Not a list.</div>
              <textarea placeholder="e.g. Get the Real Payment Guide drafted" value={reviewForm.next_week_priorities}
                onChange={e => setReviewForm({ ...reviewForm, next_week_priorities: e.target.value })} style={{ minHeight: 44 }} />
            </label>
            <div><Button size="sm" onClick={handleSaveReview}>Save reflection</Button></div>
          </div>
        ) : review ? (
          <div className="stack" style={{ marginTop: 'var(--space-2)', fontSize: 13 }}>
            {review.what_worked && <div><strong>Went well:</strong> {review.what_worked}</div>}
            {review.what_didnt && <div><strong>Struggle:</strong> {review.what_didnt}</div>}
            {review.needs_attention && <div><strong>Needs attention:</strong> {review.needs_attention}</div>}
            {review.next_week_priorities && <div><strong>Next week's one thing:</strong> {review.next_week_priorities}</div>}
          </div>
        ) : (
          <div className="muted" style={{ fontSize: 13, marginTop: 'var(--space-2)' }}>No reflection recorded for this week yet.</div>
        )}
      </Card>

      {overdue.length > 0 && (
        <Card>
          <div className="row-between">
            <div className="section-label">Overdue follow-ups</div>
            {autonomy === 'auto' && <span className="muted" style={{ fontSize: 11 }}>✨ Auto-drafting enabled</span>}
          </div>
          <div className="stack" style={{ marginTop: 'var(--space-2)' }}>
            {overdue.map(c => (
              <div key={c.id} style={{ padding: '4px 0' }}>
                <div className="row-between">
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700 }}>{c.name}</div>
                    <div className="muted" style={{ fontSize: 12 }}>{c.next_action || 'No next action set — overdue by relationship cadence'}</div>
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
                    <div style={{ fontSize: 13 }}>{draftsByContact[c.id].message}</div>
                    <div className="muted" style={{ fontSize: 11, marginTop: 4 }}>{draftsByContact[c.id].channel}</div>
                  </AiSuggestionBox>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      {health && (
        <Card>
          <div className="section-label">Database health</div>
          <div className="row-between" style={{ fontSize: 13, marginTop: 'var(--space-2)' }}>
            <span>{health.total} contacts</span>
            <span className="muted">{health.completeness}% have a next action</span>
          </div>
        </Card>
      )}

      {pipelineHealth && (
        <Card>
          <div className="section-label">Pipeline health</div>
          <div className="row-between" style={{ fontSize: 13, marginTop: 'var(--space-2)' }}>
            <span>{pipelineHealth.total} active (Lead / Future Client / Active Client)</span>
            <span className="muted">{pipelineHealth.stalled} stalled</span>
          </div>
          <div className="row" style={{ marginTop: 'var(--space-2)', flexWrap: 'wrap', gap: 4 }}>
            {Object.entries(pipelineHealth.byCategory).map(([cat, n]) => (
              <span key={cat} className="muted" style={{ fontSize: 11, background: 'var(--sand)', padding: '2px 8px', borderRadius: 'var(--radius-pill)' }}>{cat}: {n}</span>
            ))}
          </div>
          {Object.keys(pipelineHealth.byStage).length > 0 && (
            <div className="row" style={{ marginTop: 'var(--space-2)', flexWrap: 'wrap', gap: 4 }}>
              {Object.entries(pipelineHealth.byStage).map(([stage, n]) => (
                <span key={stage} className="muted" style={{ fontSize: 11 }}>{stage}: {n} · </span>
              ))}
            </div>
          )}
        </Card>
      )}

      {relationshipHealth && (
        <Card>
          <div className="section-label">Relationship health</div>
          <div className="stack" style={{ marginTop: 'var(--space-2)', gap: 4 }}>
            {Object.entries(relationshipHealth).map(([tier, h]) => (
              <div key={tier} className="row-between" style={{ fontSize: 13 }}>
                <span>{tier.replace(' - ', ' — ')}</span>
                <span className="muted">
                  {h.total} total{h.overdue > 0 && ` · ${h.overdue} overdue`}
                  {h.avgDaysSinceContact != null && ` · avg ${h.avgDaysSinceContact}d since contact`}
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card>
        <div className="row-between">
          <div className="section-label">Follow-up standards</div>
          <Button size="sm" variant="text" onClick={() => setEditingStandards(!editingStandards)}>{editingStandards ? 'Cancel' : 'Edit'}</Button>
        </div>
        <div className="stack" style={{ marginTop: 'var(--space-2)', gap: 6 }}>
          {FOLLOWUP_STANDARD_TYPES.map(s => (
            <div key={s.key} className="row-between" style={{ fontSize: 13 }}>
              <div>
                <div>{s.label}</div>
                <div className="muted" style={{ fontSize: 11 }}>{s.appliesTo}</div>
              </div>
              {editingStandards ? (
                <div className="row" style={{ alignItems: 'center', gap: 4 }}>
                  <input type="number" style={{ width: 60 }} value={cadenceStandards[s.key] ?? ''}
                    onChange={e => setCadenceStandardsState({ ...cadenceStandards, [s.key]: Number(e.target.value) })} />
                  <span className="muted" style={{ fontSize: 11 }}>days</span>
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

// ============================================================
// PIPELINE — the CRM, once and only once. `pipeline_deals` and
// `contacts` described the same opportunities as two systems; this is
// the one, grouped by stage, with the fields the real spreadsheet has
// and AI-drafted follow-ups so a next action never sits empty because
// writing it felt like a chore.
// ============================================================
const STATUS_TONE = { Overdue: 'var(--danger)', 'Due Soon': 'var(--gold)', 'On Track': 'var(--success)', 'No Next Action': 'var(--ink-faint)', 'No Date Set': 'var(--ink-faint)' };

function PipelineTab() {
  const [contacts, setContacts] = useState([]);
  const [categories, setCategories] = useState(['Lead']);
  const [stages, setStages] = useState([]);
  const [sources, setSources] = useState([]);
  const [timelines, setTimelines] = useState([]);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ name: '', category: 'Lead', organization: '', preferred_contact_method: 'text', lead_stage: '', source: '', timeline: '' });
  const [selectedId, setSelectedId] = useState(null);
  const [filter, setFilter] = useState('All');
  const [saveError, setSaveError] = useState(null);

  async function refresh() {
    setContacts(await listContacts());
    setCategories(await getCategoryList('pipeline_categories'));
    setStages(await getCategoryList('lead_stages'));
    setSources(await getCategoryList('lead_sources'));
    setTimelines(await getCategoryList('contact_timelines'));
  }
  useEffect(() => { refresh(); }, []);

  async function handleAdd() {
    if (!form.name.trim()) return;
    setSaveError(null);
    try {
      await addContact({ ...form, lead_stage: form.lead_stage || null, source: form.source || null, timeline: form.timeline || null, relationship_tier: inferDefaultTier(form.category) });
    } catch (err) {
      setSaveError(err.message || 'Something went wrong saving this contact.');
      return;
    }
    setForm({ name: '', category: 'Lead', organization: '', preferred_contact_method: 'text', lead_stage: '', source: '', timeline: '' });
    setAdding(false);
    refresh();
  }

  const filtered = filter === 'All' ? contacts : contacts.filter(c => c.category === filter);
  const byCategory = {};
  filtered.forEach(c => { (byCategory[c.category] ||= []).push(c); });

  return (
    <div className="stack" style={{ gap: 'var(--space-4)' }}>
      <Card>
        <div className="row-between">
          <div className="section-label">Pipeline</div>
          <Button size="sm" variant="ghost" onClick={() => setAdding(!adding)}>{adding ? 'Cancel' : '+ Add contact'}</Button>
        </div>

        {adding && (
          <div className="row" style={{ marginTop: 'var(--space-3)', flexWrap: 'wrap' }}>
            <input placeholder="Name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
            <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <input placeholder="Organization (optional)" value={form.organization} onChange={e => setForm({ ...form, organization: e.target.value })} />
            <select value={form.preferred_contact_method} onChange={e => setForm({ ...form, preferred_contact_method: e.target.value })}>
              <option value="text">Prefers text</option>
              <option value="email">Prefers email</option>
              <option value="call_scheduled">Scheduled calls only</option>
            </select>
            {['Lead', 'Future Client'].includes(form.category) && (
              <select value={form.lead_stage} onChange={e => setForm({ ...form, lead_stage: e.target.value })}>
                <option value="">No stage set</option>
                {stages.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            )}
            {['Lead', 'Future Client'].includes(form.category) && (
              <select value={form.source} onChange={e => setForm({ ...form, source: e.target.value })}>
                <option value="">Source unknown</option>
                {sources.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            )}
            {['Lead', 'Future Client'].includes(form.category) && (
              <select value={form.timeline} onChange={e => setForm({ ...form, timeline: e.target.value })}>
                <option value="">Timeline unknown</option>
                {timelines.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            )}
            <Button size="sm" onClick={handleAdd}>Save</Button>
            {saveError && <div style={{ fontSize: 12, color: 'var(--danger)', width: '100%' }}>{saveError}</div>}
          </div>
        )}

        <div className="row" style={{ marginTop: 'var(--space-3)', flexWrap: 'wrap', gap: 4 }}>
          {['All', ...categories].map(c => (
            <button key={c} className={`sub-tab ${filter === c ? 'active' : ''}`} style={{ fontSize: 11 }} onClick={() => setFilter(c)}>{c}</button>
          ))}
        </div>
      </Card>

      {Object.keys(byCategory).length === 0 ? <EmptyState icon="coffee" title="Nothing here yet" /> : (
        Object.entries(byCategory).map(([cat, list]) => (
          <Card key={cat}>
            <div className="section-label">{cat} · {list.length}</div>
            <div className="stack" style={{ marginTop: 'var(--space-2)' }}>
              {list.map(c => (
                <div key={c.id} className="row-between" style={{ borderBottom: '1px solid var(--sand)', padding: '8px 0', cursor: 'pointer' }} onClick={() => setSelectedId(c.id)}>
                  <div>
                    <div style={{ fontWeight: 700 }}>
                      {c.name}{c.organization && <span className="muted" style={{ fontWeight: 400 }}> · {c.organization}</span>}
                      {c.lead_stage && <span className="muted" style={{ fontWeight: 400 }}> · {c.lead_stage}</span>}
                    </div>
                    <div className="muted" style={{ fontSize: 12 }}>{c.next_action || 'No next action set'}</div>
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 700, color: STATUS_TONE[c.status] }}>{c.status}</span>
                </div>
              ))}
            </div>
          </Card>
        ))
      )}

      <ContactProfilePanel contactId={selectedId} onClose={() => setSelectedId(null)} onUpdated={refresh} />
    </div>
  );
}

// ============================================================
// RELATIONSHIPS — replaces what would have been three separate pages
// (Sphere / Community / Professional Network). Same contact list,
// same one CRM, filtered by tier — because that's all those three
// systems ever actually were.
// ============================================================
const TIERS = [
  { key: 'Tier 1 - Core', label: 'Tier 1 — Core', cadence: 'Monthly touch' },
  { key: 'Tier 2 - Developing', label: 'Tier 2 — Developing', cadence: 'Every 60-90 days' },
  { key: 'Tier 3 - Strategic', label: 'Tier 3 — Strategic (Professional)', cadence: 'Quarterly' },
];

function RelationshipsTab() {
  const [byTier, setByTier] = useState({});
  const [untiered, setUntiered] = useState([]);
  const [tagging, setTagging] = useState(false);
  const [selectedId, setSelectedId] = useState(null);

  async function refresh() {
    const [t1, t2, t3, all] = await Promise.all([
      listByTier('Tier 1 - Core'), listByTier('Tier 2 - Developing'), listByTier('Tier 3 - Strategic'), listContacts(),
    ]);
    setByTier({ 'Tier 1 - Core': t1, 'Tier 2 - Developing': t2, 'Tier 3 - Strategic': t3 });
    setUntiered(all.filter(c => !c.relationship_tier && ['Sphere', 'Partner', 'Agent Referral'].includes(c.category)));
  }
  useEffect(() => { refresh(); }, []);

  async function handleAutoTag() {
    setTagging(true);
    await autoTagUntieredContacts();
    setTagging(false);
    refresh();
  }

  return (
    <div className="stack" style={{ gap: 'var(--space-4)' }}>
      {untiered.length > 0 && (
        <Card className="track-personal">
          <div className="row-between">
            <div style={{ fontSize: 13 }}>{untiered.length} contact{untiered.length === 1 ? '' : 's'} without a relationship tier — Sphere defaults to Tier 2, Partner/Agent Referral default to Tier 3.</div>
            <Button size="sm" onClick={handleAutoTag} disabled={tagging}>{tagging ? 'Tagging…' : 'Auto-tag all'}</Button>
          </div>
        </Card>
      )}

      {TIERS.map((t, i) => (
        <Card key={t.key}>
          <div className="row-between">
            <div className="section-label">{t.label}</div>
            <span className="muted" style={{ fontSize: 11 }}>{t.cadence}</span>
          </div>
          {(byTier[t.key] || []).length === 0 ? <EmptyState icon="sparkles" title="Nobody tagged to this tier yet" /> : (
            <div className="stack" style={{ marginTop: 'var(--space-2)' }}>
              {byTier[t.key].map(c => (
                <div key={c.id} className="row-between" style={{ fontSize: 13, cursor: 'pointer', padding: '4px 0', borderBottom: '1px solid var(--sand)' }}
                  onClick={() => setSelectedId(c.id)}>
                  <span>{c.name}</span>
                  <span className="muted" style={{ fontSize: 11 }}>{c.last_contact_date ? `Last: ${c.last_contact_date}` : 'No contact logged'}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      ))}

      <ContactProfilePanel contactId={selectedId} onClose={() => setSelectedId(null)} onUpdated={refresh} />
    </div>
  );
}

// ============================================================
// CONTENT — the real Brief -> Repurpose pipeline (System 03), with AI
// drafting the 5 derivative formats instead of you writing each by hand.
// ============================================================
function ContentTab() {
  const [pieces, setPieces] = useState([]);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ title: '', buyer_question: '', audience: '', pillar: '', content_type: '', funnel_stage: 'Awareness' });
  const [autonomy, setAutonomy] = useState('confirm');
  const [pillars, setPillars] = useState([]);
  const [audiences, setAudiences] = useState([]);
  const [contentTypes, setContentTypes] = useState([]);

  async function refresh() { setPieces(await listContentPieces()); }
  useEffect(() => {
    refresh();
    getAutonomyLevel().then(setAutonomy);
    getCategoryList('content_pillars').then(setPillars);
    getCategoryList('content_audiences').then(setAudiences);
    getCategoryList('content_types').then(setContentTypes);
  }, []);

  async function handleAdd() {
    if (!form.title.trim()) return;
    await addContentPiece(form);
    setForm({ title: '', buyer_question: '', audience: '', pillar: '', content_type: '', funnel_stage: 'Awareness' });
    setAdding(false);
    refresh();
  }

  const COLUMNS = [
    { key: 'idea', label: 'Idea' },
    { key: 'drafting', label: 'Drafting' },
    { key: 'published', label: 'Published' },
  ];

  return (
    <div className="stack" style={{ gap: 'var(--space-4)' }}>
      <Card>
        <div className="row-between">
          <div className="section-label">Content pipeline</div>
          <Button size="sm" variant="ghost" onClick={() => setAdding(!adding)}>{adding ? 'Cancel' : '+ New idea'}</Button>
        </div>
        {autonomy === 'auto' && <div className="muted" style={{ fontSize: 11, marginTop: 4 }}>✨ Auto-repurposing enabled — publishing marks all formats done automatically</div>}
        {adding && (
          <div className="row" style={{ marginTop: 'var(--space-3)', flexWrap: 'wrap' }}>
            <input placeholder="Title" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
            <input placeholder="Buyer question this answers" value={form.buyer_question} onChange={e => setForm({ ...form, buyer_question: e.target.value })} />
            <select value={form.audience} onChange={e => setForm({ ...form, audience: e.target.value })}>
              <option value="">No audience set</option>
              {audiences.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
            <select value={form.pillar} onChange={e => setForm({ ...form, pillar: e.target.value })}>
              <option value="">No pillar set</option>
              {pillars.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
            <select value={form.content_type} onChange={e => setForm({ ...form, content_type: e.target.value })}>
              <option value="">No content type set</option>
              {contentTypes.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <select value={form.funnel_stage} onChange={e => setForm({ ...form, funnel_stage: e.target.value })}>
              <option>Awareness</option><option>Consideration</option><option>Decision</option>
            </select>
            <Button size="sm" onClick={handleAdd}>Add</Button>
          </div>
        )}
      </Card>

      {pieces.length > 0 && pillars.length > 0 && (
        <Card>
          <div className="section-label" style={{ fontSize: 12 }}>Pillar coverage</div>
          <div className="row" style={{ flexWrap: 'wrap', gap: 8, marginTop: 'var(--space-2)' }}>
            {pillars.map(pillar => {
              const count = pieces.filter(p => p.pillar === pillar).length;
              return (
                <div key={pillar} className="muted" style={{ fontSize: 12, border: '1px solid var(--sand)', borderRadius: 'var(--radius-pill)', padding: '4px 10px' }}>
                  {pillar}: {count}
                </div>
              );
            })}
            {pieces.some(p => !p.pillar) && (
              <div className="muted" style={{ fontSize: 12, border: '1px dashed var(--sand)', borderRadius: 'var(--radius-pill)', padding: '4px 10px' }}>
                No pillar: {pieces.filter(p => !p.pillar).length}
              </div>
            )}
          </div>
        </Card>
      )}

      {pieces.length === 0 ? <EmptyState icon="megaphone" title="No content in the pipeline yet" /> : (
        <div className="row" style={{ alignItems: 'flex-start', gap: 'var(--space-3)', overflowX: 'auto' }}>
          {COLUMNS.map(col => {
            const items = pieces.filter(p => p.status === col.key);
            return (
              <div key={col.key} style={{ flex: '1 1 0', minWidth: 200 }}>
                <div className="muted" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>
                  {col.label} · {items.length}
                </div>
                <div className="stack" style={{ gap: 'var(--space-2)' }}>
                  {items.map(p => (
                    <Link key={p.id} to={`/business/content/${p.id}`} style={{ textDecoration: 'none' }}>
                      <div className="planner-block track-business" style={{ cursor: 'pointer' }}>
                        <div style={{ fontWeight: 700, fontSize: 14 }}>{p.title}</div>
                        <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>{p.audience || 'No audience set'}</div>
                        {p.pillar && <div className="faint" style={{ fontSize: 11 }}>{p.pillar}</div>}
                        {col.key === 'published' && (
                          <div className="muted" style={{ fontSize: 11, marginTop: 4 }}>
                            {(p.content_repurpose_items || []).filter(r => r.published).length}/{(p.content_repurpose_items || []).length} repurposed
                          </div>
                        )}
                      </div>
                    </Link>
                  ))}
                  {items.length === 0 && <div className="muted" style={{ fontSize: 12 }}>Nothing here</div>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ============================================================
// MARKETING — Relationship Marketing / Farming / Networking / Events /
// Campaigns (PRD Module 4). Deliberately separate from ContentTab:
// that tab is the written-content pipeline (brief -> repurpose);
// this tab is dated, real-world activities that aren't "content" —
// a mailer drop, a client appreciation call, a networking event.
// ============================================================
function truncateGoalTitle(title, max = 34) {
  if (!title) return '';
  return title.length > max ? title.slice(0, max).trim() + '…' : title;
}

function MarketingTab() {
  const [activities, setActivities] = useState([]);
  const [categories, setCategories] = useState([]);
  const [goals, setGoals] = useState([]);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ title: '', category: '', activity_date: '', notes: '', goal_id: '' });
  const [filter, setFilter] = useState('All');
  const [linkingGoalFor, setLinkingGoalFor] = useState(null);

  async function refresh() {
    setActivities(await listMarketingActivities());
    setCategories(await getCategoryList('marketing_activity_categories'));
    setGoals(await listGoals());
  }
  useEffect(() => { refresh(); }, []);

  async function handleAdd() {
    if (!form.title.trim() || !form.category) return;
    await addMarketingActivity({ ...form, activity_date: form.activity_date || null, goal_id: form.goal_id || null });
    setForm({ title: '', category: categories[0] || '', activity_date: '', notes: '', goal_id: '' });
    setAdding(false);
    refresh();
  }

  async function handleLinkGoal(activity, goalId) {
    await updateMarketingActivity(activity.id, { goal_id: goalId || null });
    setLinkingGoalFor(null);
    refresh();
  }

  async function handleComplete(activity) {
    await completeMarketingActivity(activity.id);
    refresh();
  }

  async function handleDelete(activity) {
    await deleteMarketingActivity(activity.id);
    refresh();
  }

  const filtered = filter === 'All' ? activities : activities.filter(a => a.category === filter);
  const planned = filtered.filter(a => a.status === 'planned');
  const completed = filtered.filter(a => a.status === 'completed');

  return (
    <div className="stack" style={{ gap: 'var(--space-4)' }}>
      <Card>
        <div className="row-between">
          <div className="section-label">Marketing Calendar</div>
          <Button size="sm" variant="ghost" onClick={() => setAdding(!adding)}>{adding ? 'Cancel' : '+ Add activity'}</Button>
        </div>

        {adding && (
          <div className="row" style={{ marginTop: 'var(--space-3)', flexWrap: 'wrap' }}>
            <input placeholder="Activity title" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
            <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
              <option value="">Select category...</option>
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <input type="date" value={form.activity_date} onChange={e => setForm({ ...form, activity_date: e.target.value })} />
            {goals.length > 0 && (
              <select value={form.goal_id} onChange={e => setForm({ ...form, goal_id: e.target.value })}>
                <option value="">Not linked to a goal</option>
                {goals.map(g => <option key={g.id} value={g.id}>{truncateGoalTitle(g.title)}</option>)}
              </select>
            )}
            <Button size="sm" onClick={handleAdd}>Save</Button>
          </div>
        )}
        {adding && (
          <textarea placeholder="Notes (optional)" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })}
            style={{ marginTop: 'var(--space-2)', minHeight: 50, width: '100%' }} />
        )}

        <div className="row" style={{ marginTop: 'var(--space-3)', flexWrap: 'wrap', gap: 4 }}>
          {['All', ...categories].map(c => (
            <button key={c} className={`sub-tab ${filter === c ? 'active' : ''}`} style={{ fontSize: 11 }} onClick={() => setFilter(c)}>{c}</button>
          ))}
        </div>
      </Card>

      <Card>
        <div className="section-label">Planned · {planned.length}</div>
        {planned.length === 0 ? <EmptyState icon="sparkles" title="Nothing planned yet" /> : (
          <div className="stack" style={{ marginTop: 'var(--space-2)' }}>
            {planned.map(a => (
              <div key={a.id} className="row-between" style={{ borderBottom: '1px solid var(--sand)', padding: '8px 0' }}>
                <div>
                  <div style={{ fontWeight: 700 }}>{a.title}</div>
                  <div className="muted" style={{ fontSize: 12 }}>{a.category}{a.activity_date && ` · ${a.activity_date}`}</div>
                  {a.notes && <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>{a.notes}</div>}
                  {goals.length > 0 && (
                    <div style={{ marginTop: 4 }}>
                      {linkingGoalFor === a.id ? (
                        <select style={{ fontSize: 11 }} autoFocus value={a.goal_id || ''}
                          onChange={e => handleLinkGoal(a, e.target.value)} onBlur={() => setLinkingGoalFor(null)}>
                          <option value="">Not linked</option>
                          {goals.map(g => <option key={g.id} value={g.id}>{truncateGoalTitle(g.title)}</option>)}
                        </select>
                      ) : (
                        <button className="sub-tab" style={{ fontSize: 11 }} onClick={() => setLinkingGoalFor(a.id)}>
                          {a.goals?.title ? <><Target size={11} style={{ verticalAlign: 'middle', marginRight: 3 }} />{truncateGoalTitle(a.goals.title)}</> : '+ Link goal'}
                        </button>
                      )}
                    </div>
                  )}
                </div>
                <div className="row" style={{ gap: 'var(--space-2)' }}>
                  <Button size="sm" variant="ghost" onClick={() => handleComplete(a)}>Mark done</Button>
                  <Button size="sm" variant="text" onClick={() => handleDelete(a)}>Remove</Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {completed.length > 0 && (
        <Card>
          <div className="section-label">Completed · {completed.length}</div>
          <div className="stack" style={{ marginTop: 'var(--space-2)' }}>
            {completed.map(a => (
              <div key={a.id} className="row-between" style={{ padding: '4px 0' }}>
                <span className="muted" style={{ fontSize: 13 }}>{a.title} · {a.category}{a.goals?.title && <> · <Target size={11} style={{ verticalAlign: 'middle' }} /> {truncateGoalTitle(a.goals.title)}</>}</span>
                <span className="muted" style={{ fontSize: 11 }}>{a.activity_date}</span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

// ============================================================
// LIBRARY — CTAs, Scripts, Prompts, and Playbooks (Flows) in one
// searchable place. Lookup data, not reading material.
// ============================================================
function LibraryTab() {
  const [subTab, setSubTab] = useState('ctas');
  const [syncing, setSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState(null);
  const [syncVersion, setSyncVersion] = useState(0);
  useEffect(() => { seedLibraryIfEmpty(); }, []);

  async function handleSync() {
    setSyncing(true);
    setSyncStatus(null);
    try {
      const result = await syncLibraryGaps();
      setSyncStatus(result.added === 0 ? "You're fully caught up — nothing new to add." : `Added ${result.added} new entr${result.added === 1 ? 'y' : 'ies'} from the manual.`);
      setSyncVersion(v => v + 1);
    } catch (err) {
      setSyncStatus(`Couldn't sync: ${err.message || err}`);
    }
    setSyncing(false);
  }

  return (
    <div>
      <div className="row-between" style={{ marginBottom: 'var(--space-3)', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
        <div className="row" style={{ gap: 4 }}>
          {['ctas', 'scripts', 'prompts', 'playbooks'].map(t => (
            <button key={t} className={`sub-tab ${subTab === t ? 'active' : ''}`} onClick={() => setSubTab(t)}>{t.charAt(0).toUpperCase() + t.slice(1)}</button>
          ))}
        </div>
        <Button size="sm" variant="ghost" onClick={handleSync} disabled={syncing}>
          {syncing ? 'Syncing…' : 'Sync latest from manual'}
        </Button>
      </div>
      {syncStatus && <div className="muted" style={{ fontSize: 12, marginBottom: 'var(--space-3)' }}>{syncStatus}</div>}
      {subTab === 'ctas' && <CtaLibrary key={syncVersion} />}
      {subTab === 'scripts' && <ScriptLibrary key={syncVersion} />}
      {subTab === 'prompts' && <PromptLibrary key={syncVersion} />}
      {subTab === 'playbooks' && <FlowsTab />}
    </div>
  );
}

function CtaLibrary() {
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState('');
  const [copiedId, setCopiedId] = useState(null);

  async function refresh() { setItems(await listCtas(search)); }
  useEffect(() => { refresh(); }, [search]);

  function copy(item) {
    navigator.clipboard?.writeText(item.cta_text);
    setCopiedId(item.id);
    setTimeout(() => setCopiedId(null), 1200);
  }

  return (
    <Card>
      <input placeholder="Search CTAs..." value={search} onChange={e => setSearch(e.target.value)} style={{ width: '100%', marginBottom: 12 }} />
      <div className="stack">
        {items.map(c => (
          <div key={c.id} className="row-between" style={{ padding: '8px 0', borderBottom: '1px solid var(--sand)' }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 13 }}>{c.cta_text}</div>
              <div className="muted" style={{ fontSize: 11 }}>{c.audience} · {c.stage}{c.page ? ` · ${c.page}` : ''}</div>
            </div>
            <Button size="sm" variant="ghost" onClick={() => copy(c)}>{copiedId === c.id ? <>Copied <Check size={13} style={{ verticalAlign: 'middle' }} /></> : 'Copy'}</Button>
          </div>
        ))}
      </div>
    </Card>
  );
}

function ScriptLibrary() {
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState('');
  const [copiedId, setCopiedId] = useState(null);

  async function refresh() { setItems(await listScripts(search)); }
  useEffect(() => { refresh(); }, [search]);

  function copy(item) {
    navigator.clipboard?.writeText(item.script_text);
    setCopiedId(item.id);
    setTimeout(() => setCopiedId(null), 1200);
  }

  return (
    <Card>
      <input placeholder="Search scripts..." value={search} onChange={e => setSearch(e.target.value)} style={{ width: '100%', marginBottom: 12 }} />
      <div className="stack">
        {items.map(s => (
          <details key={s.id} open={!!search} style={{ padding: '6px 0', borderBottom: '1px solid var(--sand)' }}>
            <summary style={{ cursor: 'pointer', fontWeight: 700, fontSize: 13 }}>{s.section} — {s.situation}</summary>
            <p className="muted" style={{ fontSize: 13, marginTop: 4 }}>{s.script_text}</p>
            <Button size="sm" variant="ghost" onClick={() => copy(s)}>{copiedId === s.id ? <>Copied <Check size={13} style={{ verticalAlign: 'middle' }} /></> : 'Copy'}</Button>
          </details>
        ))}
      </div>
    </Card>
  );
}

function PromptLibrary() {
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState('');
  const [copiedId, setCopiedId] = useState(null);

  async function refresh() { setItems(await listPrompts(search)); }
  useEffect(() => { refresh(); }, [search]);

  function copy(item) {
    navigator.clipboard?.writeText(item.prompt_text);
    setCopiedId(item.id);
    setTimeout(() => setCopiedId(null), 1200);
  }

  return (
    <Card>
      <input placeholder="Search prompts..." value={search} onChange={e => setSearch(e.target.value)} style={{ width: '100%', marginBottom: 12 }} />
      <div className="stack">
        {items.map(p => (
          <details key={p.id} open={!!search} style={{ padding: '6px 0', borderBottom: '1px solid var(--sand)' }}>
            <summary style={{ cursor: 'pointer', fontWeight: 700, fontSize: 13 }}>{p.code ? `${p.code} — ` : ''}{p.title}</summary>
            <div className="muted" style={{ fontSize: 11 }}>{p.category} · {p.use_for}</div>
            <p style={{ fontSize: 13, marginTop: 4, whiteSpace: 'pre-wrap' }}>{p.prompt_text}</p>
            <Button size="sm" variant="ghost" onClick={() => copy(p)}>{copiedId === p.id ? <>Copied <Check size={13} style={{ verticalAlign: 'middle' }} /></> : 'Copy'}</Button>
          </details>
        ))}
      </div>
    </Card>
  );
}

// ============================================================
// CLIENTS — Transaction Review Log, alive instead of a static
// template. Logging a closing schedules the 30/90/365 touches and
// captures the content idea automatically.
// ============================================================
function ClientsTab() {
  const [transactions, setTransactions] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({
    contact_id: '', buyer_or_seller: 'Buyer', property_area: '', closing_date: '', referral_source: '',
    timeline_notes: '', biggest_objection: '', unexpected_question: '', what_almost_went_wrong: '',
    lesson_learned: '', system_to_update: '', content_idea_added: false, added_to_past_client_plan: true,
    testimonial_requested: true, photos_collected: false, referral_opportunity_noted: '',
  });

  async function refresh() {
    const [t, c] = await Promise.all([listTransactions(), listContacts('Active Client')]);
    setTransactions(t);
    setContacts(c);
  }
  useEffect(() => { refresh(); }, []);

  function handleSelectContact(contactId) {
    const contact = contacts.find(c => c.id === contactId);
    setForm(prev => ({
      ...prev,
      contact_id: contactId,
      // Both already exist on the CRM record — no reason to ask twice.
      buyer_or_seller: contact?.buyer_seller && contact.buyer_seller !== 'Both' ? contact.buyer_seller : prev.buyer_or_seller,
      property_area: contact?.location_interest || prev.property_area,
    }));
  }

  async function handleAdd() {
    if (!form.contact_id || !form.closing_date) return;
    const contact = contacts.find(c => c.id === form.contact_id);
    await addTransaction({ ...form, contacts_name: contact?.name });
    setForm({
      contact_id: '', buyer_or_seller: 'Buyer', property_area: '', closing_date: '', referral_source: '',
      timeline_notes: '', biggest_objection: '', unexpected_question: '', what_almost_went_wrong: '',
      lesson_learned: '', system_to_update: '', content_idea_added: false, added_to_past_client_plan: true,
      testimonial_requested: true, photos_collected: false, referral_opportunity_noted: '',
    });
    setAdding(false);
    refresh();
  }

  return (
    <div className="stack" style={{ gap: 'var(--space-4)' }}>
      <Card>
        <div className="row-between">
          <div className="section-label">Log a closing</div>
          <Button size="sm" variant="ghost" onClick={() => setAdding(!adding)}>{adding ? 'Cancel' : '+ New closing'}</Button>
        </div>
        {adding && (
          <div className="stack" style={{ marginTop: 'var(--space-3)' }}>
            <div className="row" style={{ flexWrap: 'wrap' }}>
              <select value={form.contact_id} onChange={e => handleSelectContact(e.target.value)}>
                <option value="">Select client...</option>
                {contacts.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <select value={form.buyer_or_seller} onChange={e => setForm({ ...form, buyer_or_seller: e.target.value })}>
                <option>Buyer</option><option>Seller</option>
              </select>
              <input placeholder="Property / area" value={form.property_area} onChange={e => setForm({ ...form, property_area: e.target.value })} />
              <input type="date" value={form.closing_date} onChange={e => setForm({ ...form, closing_date: e.target.value })} />
              <input placeholder="Referral source" value={form.referral_source} onChange={e => setForm({ ...form, referral_source: e.target.value })} />
            </div>

            <div className="muted" style={{ fontSize: 11, marginTop: 'var(--space-2)', textTransform: 'uppercase' }}>What happened</div>
            <div className="row" style={{ flexWrap: 'wrap' }}>
              <input placeholder="Timeline (start to close)" value={form.timeline_notes} onChange={e => setForm({ ...form, timeline_notes: e.target.value })} style={{ flex: 1, minWidth: 200 }} />
              <input placeholder="Biggest objection or concern" value={form.biggest_objection} onChange={e => setForm({ ...form, biggest_objection: e.target.value })} style={{ flex: 1, minWidth: 200 }} />
            </div>
            <div className="row" style={{ flexWrap: 'wrap' }}>
              <input placeholder="Unexpected question" value={form.unexpected_question} onChange={e => setForm({ ...form, unexpected_question: e.target.value })} style={{ flex: 1, minWidth: 200 }} />
              <input placeholder="What almost went wrong" value={form.what_almost_went_wrong} onChange={e => setForm({ ...form, what_almost_went_wrong: e.target.value })} style={{ flex: 1, minWidth: 200 }} />
            </div>

            <div className="muted" style={{ fontSize: 11, marginTop: 'var(--space-2)', textTransform: 'uppercase' }}>Lessons</div>
            <textarea placeholder="Lesson learned — what could've been explained earlier, or a content idea from this transaction" value={form.lesson_learned} onChange={e => setForm({ ...form, lesson_learned: e.target.value })} style={{ minHeight: 60 }} />
            <input placeholder="Which system should this update? (e.g. Consultation SOP)" value={form.system_to_update} onChange={e => setForm({ ...form, system_to_update: e.target.value })} />
            <input placeholder="Referral opportunity — who they might introduce" value={form.referral_opportunity_noted} onChange={e => setForm({ ...form, referral_opportunity_noted: e.target.value })} />

            <div className="muted" style={{ fontSize: 11, marginTop: 'var(--space-2)', textTransform: 'uppercase' }}>What this transaction creates</div>
            <div className="row" style={{ flexWrap: 'wrap', gap: 'var(--space-3)' }}>
              <Checkbox checked={form.added_to_past_client_plan} onChange={v => setForm({ ...form, added_to_past_client_plan: v })} label="Schedule 30/90/365-day touches" />
              <Checkbox checked={form.content_idea_added} onChange={v => setForm({ ...form, content_idea_added: v })} label="Send lesson to Inbox as content idea" />
              <Checkbox checked={form.testimonial_requested} onChange={v => setForm({ ...form, testimonial_requested: v })} label="Testimonial requested" />
              <Checkbox checked={form.photos_collected} onChange={v => setForm({ ...form, photos_collected: v })} label="Photos collected (with permission)" />
            </div>
            <div><Button size="sm" onClick={handleAdd}>Save closing</Button></div>
          </div>
        )}
      </Card>

      {transactions.length === 0 ? <EmptyState icon="star" title="No closings logged yet" /> : transactions.map(t => (
        <Card key={t.id}>
          <div className="row-between">
            <div style={{ fontWeight: 700 }}>{t.contacts?.name || 'Unknown client'} · {t.property_area}</div>
            <span className="muted" style={{ fontSize: 12 }}>{t.closing_date}</span>
          </div>
          {t.lesson_learned && <div className="muted" style={{ fontSize: 13, marginTop: 4 }}>{t.lesson_learned}</div>}
          {t.system_to_update && <div className="faint" style={{ fontSize: 12, marginTop: 2 }}>Updates: {t.system_to_update}</div>}
        </Card>
      ))}
    </div>
  );
}

// ============================================================
// FLOWS (Playbooks) — unchanged, already the right pattern.
// ============================================================
function FlowsTab() {
  return (
    <div className="stack">
      {Object.entries(FLOWS).map(([key, flow]) => (
        <Card key={key}>
          <div className="row-between">
            <div>
              <div style={{ fontWeight: 700 }}>{flow.label}</div>
              <div className="muted" style={{ fontSize: 12 }}>{flow.description}</div>
            </div>
            <Link to={`/business/flows/${key}`}><Button size="sm">Start</Button></Link>
          </div>
        </Card>
      ))}
    </div>
  );
}

// ============================================================
// ROADMAP — unchanged from the last pass (links + sub-tasks already built).
// ============================================================
const LINK_OPTIONS = [
  { label: 'Business → Pipeline', value: '/business/pipeline' },
  { label: 'Business → Relationships', value: '/business/relationships' },
  { label: 'Business → Content', value: '/business/content' },
  { label: 'Business → Library', value: '/business/library' },
  { label: 'Business → Clients', value: '/business/clients' },
  { label: 'Plan → Goals & Projects', value: '/plan/goals' },
];

function RoadmapTab() {
  const [items, setItems] = useState([]);
  const [expanded, setExpanded] = useState(null);
  const [phases, setPhases] = useState(['Foundation', 'Growth', 'Expansion']);
  useEffect(() => {
    syncRoadmapStatuses().then(load);
    getCategoryList('roadmap_phases').then(setPhases);
  }, []);

  async function load() {
    const { data: { user } } = await supabase.auth.getUser();
    const { data } = await supabase.from('roadmap_items').select('*').eq('user_id', user.id).order('sort_order');
    setItems(data || []);
  }

  return (
    <div className="stack">
      {phases.map(phase => (
        <Card key={phase}>
          <div className="section-label">{phase}</div>
          <div className="stack" style={{ marginTop: 'var(--space-2)' }}>
            {items.filter(i => i.phase === phase).map(i => (
              <RoadmapRow key={i.id} item={i} expanded={expanded === i.id} onToggleExpand={() => setExpanded(expanded === i.id ? null : i.id)} onLinked={load} />
            ))}
          </div>
        </Card>
      ))}
    </div>
  );
}

/** "Build CRM: contact categories, lead sources, pipeline stages" ->
 *  { parent: "Build CRM", subs: ["contact categories", "lead sources", "pipeline stages"] }.
 *  A best-guess parse, never applied automatically — always shown as an
 *  editable preview first, since a colon in a title doesn't always mean
 *  "these are sub-tasks" and this touches real content, not just code. */
function parseCompoundTitle(title) {
  const colonIndex = title.indexOf(':');
  if (colonIndex === -1) return null;
  const parent = title.slice(0, colonIndex).trim();
  const rest = title.slice(colonIndex + 1).trim();
  const subs = rest.split(',').map(s => s.trim()).filter(Boolean);
  if (!parent || subs.length === 0) return null;
  return { parent, subs };
}

function RoadmapRow({ item, expanded, onToggleExpand, onLinked }) {
  const [subtasks, setSubtasks] = useState([]);
  const [newSubtask, setNewSubtask] = useState('');
  const [pickingLink, setPickingLink] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState('');
  const [splitPreview, setSplitPreview] = useState(null);
  const [celebrating, setCelebrating] = useState(false);

  useEffect(() => { if (expanded) listMilestones({ roadmapId: item.id }).then(setSubtasks); }, [expanded, item.id]);

  async function handleAddSubtask() {
    if (!newSubtask.trim()) return;
    await addMilestone({ roadmap_item_id: item.id, title: newSubtask.trim(), sort_order: subtasks.length });
    setNewSubtask('');
    setSubtasks(await listMilestones({ roadmapId: item.id }));
  }

  async function handleToggleSubtask(subtaskId, value) {
    await toggleMilestone(subtaskId, value);
    setSubtasks(await listMilestones({ roadmapId: item.id }));
    const justCompleted = await syncRoadmapItemFromSubtasks(item.id);
    onLinked(); // refresh the parent list so the header status (Done) shows immediately
    if (justCompleted) {
      setCelebrating(true);
      setTimeout(() => { setCelebrating(false); onToggleExpand(); }, 1500);
    }
  }

  function startEditSubtask(s) {
    setEditingId(s.id);
    setEditText(s.title);
  }

  async function saveEditSubtask(id) {
    if (!editText.trim()) return;
    await updateMilestone(id, editText.trim());
    setEditingId(null);
    setSubtasks(await listMilestones({ roadmapId: item.id }));
  }

  async function handleDeleteSubtask(id) {
    await deleteMilestone(id);
    setSubtasks(await listMilestones({ roadmapId: item.id }));
  }

  async function handleSetLink(url) {
    await updateRoadmapLink(item.id, url);
    setPickingLink(false);
    onLinked();
  }

  async function handleStartThisWeek() {
    await setRoadmapItemInProgress(item.id);
    onLinked();
  }

  async function handleSetStatus(status) {
    await setRoadmapItemStatus(item.id, status);
    onLinked();
  }

  async function handleResetAuto() {
    await resetRoadmapItemToAutomatic(item.id);
    onLinked();
  }

  function openSplitPreview() {
    const parsed = parseCompoundTitle(item.title);
    if (parsed) setSplitPreview(parsed);
  }

  function updateSplitSub(index, value) {
    setSplitPreview(prev => ({ ...prev, subs: prev.subs.map((s, i) => (i === index ? value : s)) }));
  }

  function removeSplitSub(index) {
    setSplitPreview(prev => ({ ...prev, subs: prev.subs.filter((_, i) => i !== index) }));
  }

  async function confirmSplit() {
    if (!splitPreview.parent.trim() || splitPreview.subs.length === 0) return;
    await updateRoadmapTitle(item.id, splitPreview.parent.trim());
    for (let i = 0; i < splitPreview.subs.length; i++) {
      if (splitPreview.subs[i].trim()) {
        await addMilestone({ roadmap_item_id: item.id, title: splitPreview.subs[i].trim(), sort_order: i });
      }
    }
    setSplitPreview(null);
    setSubtasks(await listMilestones({ roadmapId: item.id }));
    onLinked(); // refreshes the parent list so the shortened title shows immediately
  }

  const doneCount = subtasks.filter(s => s.completed).length;

  return (
    <div className="planner-block">
      <div className="row-between">
        <div style={{ cursor: 'pointer', flex: 1 }} onClick={onToggleExpand}>
          <span>{item.week_number ? `Wk ${item.week_number} — ` : ''}{item.title}</span>
          {item.date_range && <span className="muted" style={{ fontSize: 11 }}> · {item.date_range}</span>}
          {subtasks.length > 0 && <span className="muted" style={{ fontSize: 11 }}> · {doneCount}/{subtasks.length} sub-tasks</span>}
        </div>
        <div className="row" style={{ gap: 'var(--space-2)', alignItems: 'center' }}>
          {item.link_to && <Link to={item.link_to}><Button size="sm" variant="ghost">Open →</Button></Link>}
          {item.status !== 'In Progress' && item.status !== 'Done' && (
            <Button size="sm" variant="ghost" onClick={e => { e.stopPropagation(); handleStartThisWeek(); }}>▶ Start this week</Button>
          )}
          <span className="muted" style={{ fontSize: 11 }}>{item.status}{item.status_manual && ' (manual)'}</span>
        </div>
      </div>

      {expanded && celebrating && (
        <div className="completion-celebration">
          {['🎉', '✨', '🎊', '⭐', '🎉'].map((emoji, i) => (
            <span key={i} className="confetti-particle" style={{ left: `${20 + i * 15}%`, '--drift': `${(i - 2) * 30}px`, animationDelay: `${i * 60}ms` }}>{emoji}</span>
          ))}
          Completed!
        </div>
      )}
      {expanded && !celebrating && (
        <div style={{ marginTop: 'var(--space-3)' }} onClick={e => e.stopPropagation()}>
          {!item.link_to && !pickingLink && <Button size="sm" variant="text" onClick={() => setPickingLink(true)}>+ Link this to a page</Button>}
          {pickingLink && (
            <div className="row" style={{ flexWrap: 'wrap', gap: 'var(--space-2)' }}>
              {LINK_OPTIONS.map(opt => <Button key={opt.value} size="sm" variant="ghost" onClick={() => handleSetLink(opt.value)}>{opt.label}</Button>)}
            </div>
          )}
          {item.link_to && <Button size="sm" variant="text" onClick={() => setPickingLink(true)}>Change link</Button>}

          <div className="row" style={{ marginTop: 'var(--space-2)', alignItems: 'center', gap: 'var(--space-2)' }}>
            <span className="muted" style={{ fontSize: 12 }}>Status:</span>
            <select value={item.status} onChange={e => handleSetStatus(e.target.value)}>
              <option value="Not Started">Not Started</option>
              <option value="In Progress">In Progress</option>
              <option value="Done">Done</option>
            </select>
            {item.status_manual && <Button size="sm" variant="text" onClick={handleResetAuto}>Reset to automatic</Button>}
          </div>

          {subtasks.length === 0 && !splitPreview && parseCompoundTitle(item.title) && (
            <div style={{ marginTop: 'var(--space-2)' }}>
              <Button size="sm" variant="text" onClick={openSplitPreview}><Split size={13} style={{ verticalAlign: 'middle', marginRight: 4 }} />Split into sub-tasks</Button>
            </div>
          )}

          {splitPreview && (
            <div style={{ marginTop: 'var(--space-3)', padding: 'var(--space-3)', background: 'var(--cream)', borderRadius: 'var(--radius-sm)' }}>
              <div className="muted" style={{ fontSize: 11, marginBottom: 6 }}>Review before saving — nothing's changed yet.</div>
              <label className="stack" style={{ gap: 2 }}>
                <span style={{ fontSize: 11 }}>Item title</span>
                <input value={splitPreview.parent} onChange={e => setSplitPreview({ ...splitPreview, parent: e.target.value })} />
              </label>
              <div className="stack" style={{ marginTop: 'var(--space-2)', gap: 4 }}>
                <span style={{ fontSize: 11 }}>Sub-tasks</span>
                {splitPreview.subs.map((s, i) => (
                  <div key={i} className="row" style={{ gap: 'var(--space-2)' }}>
                    <input value={s} onChange={e => updateSplitSub(i, e.target.value)} style={{ flex: 1 }} />
                    <Button size="sm" variant="text" onClick={() => removeSplitSub(i)}>×</Button>
                  </div>
                ))}
              </div>
              <div className="row" style={{ marginTop: 'var(--space-3)', gap: 'var(--space-2)' }}>
                <Button size="sm" onClick={confirmSplit}>Save split</Button>
                <Button size="sm" variant="text" onClick={() => setSplitPreview(null)}>Cancel</Button>
              </div>
            </div>
          )}

          <div className="stack" style={{ marginTop: 'var(--space-3)' }}>
            {subtasks.map(s => (
              editingId === s.id ? (
                <div key={s.id} className="row" style={{ gap: 'var(--space-2)', flexWrap: 'wrap' }}>
                  <input
                    autoFocus
                    value={editText}
                    onChange={e => setEditText(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && saveEditSubtask(s.id)}
                    style={{ flex: 1, minWidth: 120 }}
                  />
                  <Button size="sm" variant="ghost" onClick={() => saveEditSubtask(s.id)}>Save</Button>
                  <Button size="sm" variant="text" onClick={() => setEditingId(null)}>Cancel</Button>
                </div>
              ) : (
                <div key={s.id} className="row-between">
                  <Checkbox checked={s.completed} onChange={v => handleToggleSubtask(s.id, v)} label={s.title} />
                  <div className="row" style={{ gap: 'var(--space-1)' }}>
                    <Button size="sm" variant="text" onClick={() => startEditSubtask(s)}>Edit</Button>
                    <Button size="sm" variant="text" onClick={() => handleDeleteSubtask(s.id)}>Delete</Button>
                  </div>
                </div>
              )
            ))}
          </div>
          <div className="row" style={{ marginTop: 'var(--space-2)' }}>
            <input placeholder="Break this into a sub-task..." value={newSubtask} onChange={e => setNewSubtask(e.target.value)} />
            <Button size="sm" variant="ghost" onClick={handleAddSubtask}>+ Add</Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// REPORTS — Bundle 3. Three "zoom out" views: CEO Dashboard (monthly
// snapshot), Annual Campaign Calendar (static, quarter-highlighted),
// System Status Index (16-folder master index, status-editable).
// ============================================================
function ReportsTab() {
  const [subTab, setSubTab] = useState('ceo');
  return (
    <div>
      <div className="row" style={{ marginBottom: 'var(--space-4)', gap: 4 }}>
        {[['ceo', 'CEO Dashboard'], ['calendar', 'Campaign Calendar'], ['status', 'System Status']].map(([key, label]) => (
          <button key={key} className={`sub-tab ${subTab === key ? 'active' : ''}`} onClick={() => setSubTab(key)}>{label}</button>
        ))}
      </div>
      {subTab === 'ceo' && <CeoDashboardView />}
      {subTab === 'calendar' && <CampaignCalendarView />}
      {subTab === 'status' && <SystemStatusView />}
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
        <p className="muted" style={{ fontSize: 11, marginTop: 4 }}>Active leads, active clients, closings, and flagship content pre-fill from real data — everything else is a manual snapshot, same as the paper version.</p>
        <div className="row" style={{ flexWrap: 'wrap', gap: 'var(--space-3)', marginTop: 'var(--space-2)' }}>
          <div><div className="muted" style={{ fontSize: 11 }}>Active leads</div><div style={{ fontWeight: 700, fontSize: 18 }}>{form.active_leads ?? 0}</div></div>
          <div><div className="muted" style={{ fontSize: 11 }}>Active clients</div><div style={{ fontWeight: 700, fontSize: 18 }}>{form.active_clients ?? 0}</div></div>
          <div><div className="muted" style={{ fontSize: 11 }}>Closings this month</div><div style={{ fontWeight: 700, fontSize: 18 }}>{form.closings_this_month ?? 0}</div></div>
          <div><div className="muted" style={{ fontSize: 11 }}>Flagship content published</div><div style={{ fontWeight: 700, fontSize: 18 }}>{form.flagship_content_published ?? 0}</div></div>
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
      <p className="muted" style={{ fontSize: 12 }}>
        Not a content calendar — a focus calendar. Same four quarters every year; only revisit this at the annual review.
      </p>
      {ANNUAL_CAMPAIGN_CALENDAR.map((q, i) => (
        <Card key={q.quarter} style={i === nowQ ? { borderColor: 'var(--sage)', borderWidth: 2, borderStyle: 'solid' } : undefined}>
          <div className="row-between">
            <div style={{ fontWeight: 700 }}>{q.quarter} · {q.months} — {q.theme}</div>
            {i === nowQ && <span className="muted" style={{ fontSize: 11, color: 'var(--sage)' }}>● Current quarter</span>}
          </div>
          <div style={{ fontSize: 13, marginTop: 'var(--space-2)' }}><strong>Audience:</strong> {q.audience}</div>
          <div style={{ fontSize: 13, marginTop: 4 }}><strong>Why now:</strong> {q.why_now}</div>
          <div style={{ fontSize: 13, marginTop: 4 }}><strong>Focus:</strong> {q.focus}</div>
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
      <p className="muted" style={{ fontSize: 12 }}>
        Master index for the 16-folder operating system. The system is frozen — status changes only, no rewrites, no new systems.
      </p>
      <div className="row" style={{ flexWrap: 'wrap', gap: 8 }}>
        {Object.entries(STATUS_LEGEND).map(([key, s]) => (
          <div key={key} className="muted" style={{ fontSize: 11 }}>{s.symbol} {s.label} — {s.description}</div>
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
            <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>{f.note}</div>
          </Card>
        ))}
      </div>
      <Card>
        <div className="section-label">Not now — do-not-build list</div>
        <div className="stack" style={{ marginTop: 'var(--space-2)', gap: 4 }}>
          {DO_NOT_BUILD_LIST.map((item, i) => <div key={i} style={{ fontSize: 13 }}>• {item}</div>)}
        </div>
      </Card>
    </div>
  );
}
// ============================================================
// FUNNELS — Bundle 5 / System 04C. Lead magnets as real entities, the
// two nurture sequences as reference, and a live per-lead tracker
// (the manual's own "start with a spreadsheet" recommendation, just
// live) that the dashboard stats are computed from.
// ============================================================
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
              <div key={i} style={{ fontSize: 13 }}><strong>{i + 1}. {s.element}</strong> — {s.standard}</div>
            ))}
          </div>
        )}
      </Card>

      {magnets.map(m => (
        <Card key={m.id}>
          <div className="row-between" onClick={() => setExpandedId(expandedId === m.id ? null : m.id)} style={{ cursor: 'pointer' }}>
            <div>
              <div style={{ fontWeight: 700 }}>{m.name}</div>
              <div className="muted" style={{ fontSize: 12 }}>{m.funnel} · {m.build_phase}</div>
            </div>
            <select value={m.status} onClick={e => e.stopPropagation()} onChange={e => handleStatusChange(m.id, e.target.value)}>
              <option value="planned">Planned</option>
              <option value="building">Building</option>
              <option value="live">Live</option>
            </select>
          </div>
          {expandedId === m.id && (
            <div style={{ marginTop: 'var(--space-3)' }}>
              <div style={{ fontSize: 13 }}><strong>Audience:</strong> {m.audience}</div>
              <div style={{ fontSize: 13, marginTop: 4 }}><strong>Solves:</strong> {m.primary_problem}</div>
              <div style={{ fontSize: 13, marginTop: 4 }}><strong>Next step:</strong> {m.next_step}</div>
              <div className="muted" style={{ fontSize: 11, marginTop: 'var(--space-2)', textTransform: 'uppercase' }}>What's inside</div>
              <div className="stack" style={{ marginTop: 4, gap: 2 }}>
                {(m.whats_inside || []).map((bullet, i) => <div key={i} style={{ fontSize: 13 }}>• {bullet}</div>)}
              </div>
              {NURTURE_SEQUENCES[m.funnel] && (
                <>
                  <div className="muted" style={{ fontSize: 11, marginTop: 'var(--space-3)', textTransform: 'uppercase' }}>5-email nurture sequence</div>
                  <div className="stack" style={{ marginTop: 4, gap: 2 }}>
                    {NURTURE_SEQUENCES[m.funnel].map((email, i) => <div key={i} style={{ fontSize: 13 }}>{i + 1}. {email}</div>)}
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
            <div key={category} style={{ fontSize: 13 }}><strong>{category}:</strong> {ctas.join(' · ')}</div>
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
            <div><div className="muted" style={{ fontSize: 11 }}>Downloads</div><div style={{ fontWeight: 700, fontSize: 18 }}>{stats.downloads}</div></div>
            <div><div className="muted" style={{ fontSize: 11 }}>In sequence</div><div style={{ fontWeight: 700, fontSize: 18 }}>{stats.inProgress}</div></div>
            <div><div className="muted" style={{ fontSize: 11 }}>Replied</div><div style={{ fontWeight: 700, fontSize: 18 }}>{stats.replied}</div></div>
            <div><div className="muted" style={{ fontSize: 11 }}>Booked</div><div style={{ fontWeight: 700, fontSize: 18 }}>{stats.booked}</div></div>
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
              <div className="muted" style={{ fontSize: 12 }}>{row.lead_magnets?.name} · started {row.date_started}</div>
            </div>
            <button className="row-remove-btn" onClick={() => deleteNurtureTracking(row.id).then(refresh)}>×</button>
          </div>
          <div className="row" style={{ marginTop: 'var(--space-2)', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
            <span className="muted" style={{ fontSize: 11 }}>Email sent:</span>
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
