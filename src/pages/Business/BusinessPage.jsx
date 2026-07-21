import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import Card from '../../components/ui/Card.jsx';
import Button from '../../components/ui/Button.jsx';
import Checkbox from '../../components/ui/Checkbox.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import { supabase } from '../../lib/supabaseClient.js';
import { FLOWS } from '../../services/flows.js';
import { listMilestones, addMilestone, toggleMilestone, updateRoadmapLink } from '../../services/goals.js';
import {
  listContacts, listByTier, listOverdue, getDatabaseHealth, addContact, requestFollowUpDraft,
} from '../../services/contacts.js';
import { getTodayCheckin, toggleCheckinBox, getWeekCheckins, getWeeklyTargets, setWeeklyTargets, getWeeklyRunningTotals } from '../../services/dailyCheckin.js';
import { seedMasterTimelineIfEmpty, getThisWeekBuild } from '../../services/timeline.js';
import { listContentPieces, addContentPiece, advanceStatus, initRepurposeSlots, markRepurposed, requestRepurposeDrafts } from '../../services/contentEngine.js';
import { seedLibraryIfEmpty, listCtas, listScripts, listPrompts, addCta, addScript, addPrompt } from '../../services/library.js';
import { listTransactions, addTransaction } from '../../services/transactions.js';

const TABS = ['dashboard', 'pipeline', 'relationships', 'content', 'library', 'clients', 'roadmap'];
const TAB_LABELS = { dashboard: 'Dashboard', pipeline: 'Pipeline', relationships: 'Relationships', content: 'Content', library: 'Library', clients: 'Clients', roadmap: 'Roadmap' };

export default function BusinessPage() {
  const { tab = 'dashboard' } = useParams();
  const navigate = useNavigate();

  return (
    <div>
      <div className="page-title">💼 Business</div>

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
      {tab === 'library' && <LibraryTab />}
      {tab === 'clients' && <ClientsTab />}
      {tab === 'roadmap' && <RoadmapTab />}
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

  useEffect(() => { seedMasterTimelineIfEmpty().then(refresh); }, []);

  async function refresh() {
    const [c, wc, t, r, w, ov, h] = await Promise.all([
      getTodayCheckin(), getWeekCheckins(), getWeeklyTargets(), getWeeklyRunningTotals(),
      getThisWeekBuild(), listOverdue(), getDatabaseHealth(),
    ]);
    setCheckin(c); setWeekCheckins(wc); setTargets(t); setRunning(r);
    setThisWeekBuild(w); setOverdue(ov); setHealth(h);
    if (t) setTargetForm(t);
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

      {overdue.length > 0 && (
        <Card>
          <div className="section-label">Overdue follow-ups</div>
          <div className="stack" style={{ marginTop: 'var(--space-2)' }}>
            {overdue.map(c => (
              <Link key={c.id} to={`/business/pipeline`} className="row-between" style={{ fontSize: 13, padding: '4px 0' }}>
                <span>{c.name}</span><span className="muted">{c.next_action}</span>
              </Link>
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
const CATEGORIES = ['Lead', 'Future Client', 'Active Client', 'Past Client', 'Sphere', 'Partner', 'Agent Referral'];
const STATUS_TONE = { Overdue: 'var(--danger)', 'Due Soon': 'var(--gold)', 'On Track': 'var(--success)', 'No Next Action': 'var(--ink-faint)', 'No Date Set': 'var(--ink-faint)' };

function PipelineTab() {
  const [contacts, setContacts] = useState([]);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ name: '', category: 'Lead', organization: '', preferred_contact_method: 'text' });
  const [expandedId, setExpandedId] = useState(null);
  const [draft, setDraft] = useState(null);
  const [drafting, setDrafting] = useState(null);
  const [filter, setFilter] = useState('All');

  async function refresh() { setContacts(await listContacts()); }
  useEffect(() => { refresh(); }, []);

  async function handleAdd() {
    if (!form.name.trim()) return;
    await addContact(form);
    setForm({ name: '', category: 'Lead', organization: '', preferred_contact_method: 'text' });
    setAdding(false);
    refresh();
  }

  async function handleDraftFollowUp(contact) {
    setDrafting(contact.id);
    const result = await requestFollowUpDraft(contact);
    setDrafting(null);
    setDraft(result ? { contactId: contact.id, ...result } : { contactId: contact.id, unavailable: true });
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
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <input placeholder="Organization (optional)" value={form.organization} onChange={e => setForm({ ...form, organization: e.target.value })} />
            <select value={form.preferred_contact_method} onChange={e => setForm({ ...form, preferred_contact_method: e.target.value })}>
              <option value="text">Prefers text</option>
              <option value="email">Prefers email</option>
              <option value="call_scheduled">Scheduled calls only</option>
            </select>
            <Button size="sm" onClick={handleAdd}>Save</Button>
          </div>
        )}

        <div className="row" style={{ marginTop: 'var(--space-3)', flexWrap: 'wrap', gap: 4 }}>
          {['All', ...CATEGORIES].map(c => (
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
                <div key={c.id} style={{ borderBottom: '1px solid var(--sand)', padding: '8px 0' }}>
                  <div className="row-between" style={{ cursor: 'pointer' }} onClick={() => setExpandedId(expandedId === c.id ? null : c.id)}>
                    <div>
                      <div style={{ fontWeight: 700 }}>{c.name}{c.organization && <span className="muted" style={{ fontWeight: 400 }}> · {c.organization}</span>}</div>
                      <div className="muted" style={{ fontSize: 12 }}>{c.next_action || 'No next action set'}</div>
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 700, color: STATUS_TONE[c.status] }}>{c.status}</span>
                  </div>

                  {expandedId === c.id && (
                    <div style={{ marginTop: 'var(--space-3)' }} onClick={e => e.stopPropagation()}>
                      <div className="muted" style={{ fontSize: 12 }}>
                        {c.source && `Source: ${c.source} · `}{c.timeline && `Timeline: ${c.timeline} · `}Prefers {c.preferred_contact_method || 'text'}
                      </div>
                      {c.goals && <div style={{ fontSize: 13, marginTop: 4 }}><strong>Goals:</strong> {c.goals}</div>}
                      {c.concerns && <div style={{ fontSize: 13, marginTop: 4 }}><strong>Concerns:</strong> {c.concerns}</div>}
                      <div className="row" style={{ marginTop: 'var(--space-2)', gap: 'var(--space-2)' }}>
                        <Link to={`/business/flows/consultation?contact=${c.id}`}><Button size="sm" variant="ghost">Consultation</Button></Link>
                        <Button size="sm" variant="ghost" onClick={() => handleDraftFollowUp(c)} disabled={drafting === c.id}>
                          {drafting === c.id ? 'Drafting…' : '✨ Draft follow-up'}
                        </Button>
                      </div>
                      {draft?.contactId === c.id && (
                        <div className="inbox-suggestion" style={{ marginTop: 'var(--space-2)' }}>
                          {draft.unavailable ? (
                            <span>AI drafting isn't set up yet (needs GOOGLE_AI_API_KEY on Netlify).</span>
                          ) : (
                            <>
                              <div style={{ fontSize: 13 }}>{draft.message}</div>
                              <div className="muted" style={{ fontSize: 11, marginTop: 4 }}>{draft.channel} · {draft.reasoning}</div>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Card>
        ))
      )}
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

  async function refresh() {
    const [t1, t2, t3, all] = await Promise.all([
      listByTier('Tier 1 - Core'), listByTier('Tier 2 - Developing'), listByTier('Tier 3 - Strategic'), listContacts(),
    ]);
    setByTier({ 'Tier 1 - Core': t1, 'Tier 2 - Developing': t2, 'Tier 3 - Strategic': t3 });
    setUntiered(all.filter(c => !c.relationship_tier && ['Sphere', 'Partner', 'Agent Referral'].includes(c.category)));
  }
  useEffect(() => { refresh(); }, []);

  return (
    <div className="stack" style={{ gap: 'var(--space-4)' }}>
      {TIERS.map(t => (
        <Card key={t.key}>
          <div className="row-between">
            <div className="section-label">{t.label}</div>
            <span className="muted" style={{ fontSize: 11 }}>{t.cadence}</span>
          </div>
          {(byTier[t.key] || []).length === 0 ? <EmptyState icon="sparkles" title="Nobody tagged to this tier yet" /> : (
            <div className="stack" style={{ marginTop: 'var(--space-2)' }}>
              {byTier[t.key].map(c => (
                <div key={c.id} className="row-between" style={{ fontSize: 13, padding: '4px 0' }}>
                  <span>{c.name}</span>
                  <span className="muted" style={{ fontSize: 11 }}>{c.last_contact_date ? `Last: ${c.last_contact_date}` : 'No contact logged'}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      ))}

      {untiered.length > 0 && (
        <Card>
          <div className="section-label">Not yet tagged with a tier</div>
          <p className="muted" style={{ fontSize: 12 }}>Sphere/Partner contacts without a relationship tier — tag them from Pipeline to see them here.</p>
          <div className="stack" style={{ marginTop: 'var(--space-2)' }}>
            {untiered.map(c => <div key={c.id} style={{ fontSize: 13, padding: '2px 0' }}>{c.name} <span className="muted">({c.category})</span></div>)}
          </div>
        </Card>
      )}
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
  const [form, setForm] = useState({ title: '', buyer_question: '', audience: '', funnel_stage: 'Awareness' });
  const [expandedId, setExpandedId] = useState(null);
  const [drafts, setDrafts] = useState(null);
  const [draftingFor, setDraftingFor] = useState(null);

  async function refresh() { setPieces(await listContentPieces()); }
  useEffect(() => { refresh(); }, []);

  async function handleAdd() {
    if (!form.title.trim()) return;
    await addContentPiece(form);
    setForm({ title: '', buyer_question: '', audience: '', funnel_stage: 'Awareness' });
    setAdding(false);
    refresh();
  }

  async function handleAdvance(piece, status) {
    await advanceStatus(piece.id, status);
    if (status === 'published') await initRepurposeSlots(piece.id);
    refresh();
  }

  async function handleRepurpose(piece) {
    setDraftingFor(piece.id);
    const result = await requestRepurposeDrafts(piece);
    setDraftingFor(null);
    setDrafts(result ? { pieceId: piece.id, ...result } : { pieceId: piece.id, unavailable: true });
  }

  const STATUS_ORDER = ['idea', 'brief', 'draft', 'fact_check', 'published', 'repurposed'];
  const NEXT_STATUS = { idea: 'brief', brief: 'draft', draft: 'fact_check', fact_check: 'published' };

  return (
    <div className="stack" style={{ gap: 'var(--space-4)' }}>
      <Card>
        <div className="row-between">
          <div className="section-label">Content pipeline</div>
          <Button size="sm" variant="ghost" onClick={() => setAdding(!adding)}>{adding ? 'Cancel' : '+ New idea'}</Button>
        </div>
        {adding && (
          <div className="row" style={{ marginTop: 'var(--space-3)', flexWrap: 'wrap' }}>
            <input placeholder="Title" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
            <input placeholder="Buyer question this answers" value={form.buyer_question} onChange={e => setForm({ ...form, buyer_question: e.target.value })} />
            <input placeholder="Audience" value={form.audience} onChange={e => setForm({ ...form, audience: e.target.value })} />
            <select value={form.funnel_stage} onChange={e => setForm({ ...form, funnel_stage: e.target.value })}>
              <option>Awareness</option><option>Consideration</option><option>Decision</option>
            </select>
            <Button size="sm" onClick={handleAdd}>Add</Button>
          </div>
        )}
      </Card>

      {pieces.length === 0 ? <EmptyState icon="megaphone" title="No content in the pipeline yet" /> : pieces.map(p => (
        <Card key={p.id}>
          <div className="row-between" style={{ cursor: 'pointer' }} onClick={() => setExpandedId(expandedId === p.id ? null : p.id)}>
            <div>
              <div style={{ fontWeight: 700 }}>{p.title}</div>
              <div className="muted" style={{ fontSize: 12 }}>{p.audience} · {p.funnel_stage}</div>
            </div>
            <span className="muted" style={{ fontSize: 11, textTransform: 'uppercase' }}>{p.status.replace('_', ' ')}</span>
          </div>

          {expandedId === p.id && (
            <div style={{ marginTop: 'var(--space-3)' }} onClick={e => e.stopPropagation()}>
              {p.buyer_question && <div style={{ fontSize: 13 }}><strong>Question:</strong> {p.buyer_question}</div>}

              {NEXT_STATUS[p.status] && (
                <Button size="sm" style={{ marginTop: 'var(--space-2)' }} onClick={() => handleAdvance(p, NEXT_STATUS[p.status])}>
                  Move to {NEXT_STATUS[p.status].replace('_', ' ')} →
                </Button>
              )}

              {p.status === 'published' && (
                <div style={{ marginTop: 'var(--space-3)' }}>
                  <div className="row-between">
                    <span className="muted" style={{ fontSize: 12 }}>Repurposed: {(p.content_repurpose_items || []).filter(r => r.published).length} / {(p.content_repurpose_items || []).length}</span>
                    <Button size="sm" variant="ghost" onClick={() => handleRepurpose(p)} disabled={draftingFor === p.id}>
                      {draftingFor === p.id ? 'Drafting…' : '✨ AI: draft all formats'}
                    </Button>
                  </div>
                  {drafts?.pieceId === p.id && !drafts.unavailable && (
                    <div className="stack" style={{ marginTop: 'var(--space-2)', gap: 'var(--space-2)' }}>
                      {Object.entries(drafts).filter(([k]) => k !== 'pieceId').map(([format, text]) => (
                        <div key={format} className="inbox-suggestion">
                          <div className="muted" style={{ fontSize: 11, textTransform: 'uppercase' }}>{format.replace('_', ' ')}</div>
                          <div style={{ fontSize: 13 }}>{text}</div>
                        </div>
                      ))}
                    </div>
                  )}
                  {drafts?.pieceId === p.id && drafts.unavailable && (
                    <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>AI repurposing isn't set up yet (needs GOOGLE_AI_API_KEY on Netlify).</div>
                  )}
                </div>
              )}
            </div>
          )}
        </Card>
      ))}
    </div>
  );
}

// ============================================================
// LIBRARY — CTAs, Scripts, Prompts, and Playbooks (Flows) in one
// searchable place. Lookup data, not reading material.
// ============================================================
function LibraryTab() {
  const [subTab, setSubTab] = useState('ctas');
  useEffect(() => { seedLibraryIfEmpty(); }, []);

  return (
    <div>
      <div className="row" style={{ marginBottom: 'var(--space-4)', gap: 4 }}>
        {['ctas', 'scripts', 'prompts', 'playbooks'].map(t => (
          <button key={t} className={`sub-tab ${subTab === t ? 'active' : ''}`} onClick={() => setSubTab(t)}>{t.charAt(0).toUpperCase() + t.slice(1)}</button>
        ))}
      </div>
      {subTab === 'ctas' && <CtaLibrary />}
      {subTab === 'scripts' && <ScriptLibrary />}
      {subTab === 'prompts' && <PromptLibrary />}
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
            <Button size="sm" variant="ghost" onClick={() => copy(c)}>{copiedId === c.id ? 'Copied ✓' : 'Copy'}</Button>
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
          <details key={s.id} style={{ padding: '6px 0', borderBottom: '1px solid var(--sand)' }}>
            <summary style={{ cursor: 'pointer', fontWeight: 700, fontSize: 13 }}>{s.section} — {s.situation}</summary>
            <p className="muted" style={{ fontSize: 13, marginTop: 4 }}>{s.script_text}</p>
            <Button size="sm" variant="ghost" onClick={() => copy(s)}>{copiedId === s.id ? 'Copied ✓' : 'Copy'}</Button>
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
          <details key={p.id} style={{ padding: '6px 0', borderBottom: '1px solid var(--sand)' }}>
            <summary style={{ cursor: 'pointer', fontWeight: 700, fontSize: 13 }}>{p.code ? `${p.code} — ` : ''}{p.title}</summary>
            <div className="muted" style={{ fontSize: 11 }}>{p.category} · {p.use_for}</div>
            <p style={{ fontSize: 13, marginTop: 4, whiteSpace: 'pre-wrap' }}>{p.prompt_text}</p>
            <Button size="sm" variant="ghost" onClick={() => copy(p)}>{copiedId === p.id ? 'Copied ✓' : 'Copy'}</Button>
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
    contact_id: '', buyer_or_seller: 'Buyer', property_area: '', closing_date: '',
    lesson_learned: '', content_idea_added: false, added_to_past_client_plan: true, testimonial_requested: false,
  });

  async function refresh() {
    const [t, c] = await Promise.all([listTransactions(), listContacts('Active Client')]);
    setTransactions(t);
    setContacts(c);
  }
  useEffect(() => { refresh(); }, []);

  async function handleAdd() {
    if (!form.contact_id || !form.closing_date) return;
    const contact = contacts.find(c => c.id === form.contact_id);
    await addTransaction({ ...form, contacts_name: contact?.name });
    setForm({ contact_id: '', buyer_or_seller: 'Buyer', property_area: '', closing_date: '', lesson_learned: '', content_idea_added: false, added_to_past_client_plan: true, testimonial_requested: false });
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
              <select value={form.contact_id} onChange={e => setForm({ ...form, contact_id: e.target.value })}>
                <option value="">Select client...</option>
                {contacts.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <select value={form.buyer_or_seller} onChange={e => setForm({ ...form, buyer_or_seller: e.target.value })}>
                <option>Buyer</option><option>Seller</option>
              </select>
              <input placeholder="Property / area" value={form.property_area} onChange={e => setForm({ ...form, property_area: e.target.value })} />
              <input type="date" value={form.closing_date} onChange={e => setForm({ ...form, closing_date: e.target.value })} />
            </div>
            <textarea placeholder="Lesson learned — what could've been explained earlier, or a content idea from this transaction" value={form.lesson_learned} onChange={e => setForm({ ...form, lesson_learned: e.target.value })} style={{ minHeight: 60 }} />
            <div className="row" style={{ flexWrap: 'wrap', gap: 'var(--space-3)' }}>
              <Checkbox checked={form.added_to_past_client_plan} onChange={v => setForm({ ...form, added_to_past_client_plan: v })} label="Schedule 30/90/365-day touches" />
              <Checkbox checked={form.content_idea_added} onChange={v => setForm({ ...form, content_idea_added: v })} label="Send lesson to Inbox as content idea" />
              <Checkbox checked={form.testimonial_requested} onChange={v => setForm({ ...form, testimonial_requested: v })} label="Testimonial requested" />
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
  { label: 'Library → Documents', value: '/library/documents' },
];

function RoadmapTab() {
  const [items, setItems] = useState([]);
  const [expanded, setExpanded] = useState(null);
  useEffect(() => { load(); }, []);

  async function load() {
    const { data: { user } } = await supabase.auth.getUser();
    const { data } = await supabase.from('roadmap_items').select('*').eq('user_id', user.id).order('sort_order');
    setItems(data || []);
  }

  const phases = ['Foundation', 'Growth', 'Expansion'];
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

function RoadmapRow({ item, expanded, onToggleExpand, onLinked }) {
  const [subtasks, setSubtasks] = useState([]);
  const [newSubtask, setNewSubtask] = useState('');
  const [pickingLink, setPickingLink] = useState(false);

  useEffect(() => { if (expanded) listMilestones({ roadmapId: item.id }).then(setSubtasks); }, [expanded, item.id]);

  async function handleAddSubtask() {
    if (!newSubtask.trim()) return;
    await addMilestone({ roadmap_item_id: item.id, title: newSubtask.trim(), sort_order: subtasks.length });
    setNewSubtask('');
    setSubtasks(await listMilestones({ roadmapId: item.id }));
  }

  async function handleSetLink(url) {
    await updateRoadmapLink(item.id, url);
    setPickingLink(false);
    onLinked();
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
        <div className="row" style={{ gap: 'var(--space-2)' }}>
          {item.link_to && <Link to={item.link_to}><Button size="sm" variant="ghost">Open →</Button></Link>}
          <span className="muted" style={{ fontSize: 11 }}>{item.status}</span>
        </div>
      </div>

      {expanded && (
        <div style={{ marginTop: 'var(--space-3)' }} onClick={e => e.stopPropagation()}>
          {!item.link_to && !pickingLink && <Button size="sm" variant="text" onClick={() => setPickingLink(true)}>+ Link this to a page</Button>}
          {pickingLink && (
            <div className="row" style={{ flexWrap: 'wrap', gap: 'var(--space-2)' }}>
              {LINK_OPTIONS.map(opt => <Button key={opt.value} size="sm" variant="ghost" onClick={() => handleSetLink(opt.value)}>{opt.label}</Button>)}
            </div>
          )}
          {item.link_to && <Button size="sm" variant="text" onClick={() => setPickingLink(true)}>Change link</Button>}

          <div className="stack" style={{ marginTop: 'var(--space-3)' }}>
            {subtasks.map(s => (
              <Checkbox key={s.id} checked={s.completed} onChange={v => toggleMilestone(s.id, v).then(() => listMilestones({ roadmapId: item.id }).then(setSubtasks))} label={s.title} />
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
