import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Check } from 'lucide-react';
import Card from '../../components/ui/Card.jsx';
import Button from '../../components/ui/Button.jsx';
import SubTabNav from '../../components/nav/SubTabNav.jsx';
import { seedLibraryIfEmpty, listCtas, listScripts, listPrompts, addCta, addScript, addPrompt, syncLibraryGaps, refreshScriptVoice } from '../../services/library.js';
import { FLOWS } from '../../services/flows.js';
import { CITY_PROFILES, BUYER_INTELLIGENCE_TOPICS, LOCAL_EXPERTISE_CATEGORIES, DECISION_FRAMEWORK } from '../../services/localKnowledge.js';

// ============================================================
// LIBRARY — CTAs, Scripts, Prompts, and Playbooks (Flows) in one
// searchable place. Lookup data, not reading material.
// ============================================================
export default
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

  async function handleRefreshVoice() {
    setSyncing(true);
    setSyncStatus(null);
    try {
      const result = await refreshScriptVoice();
      setSyncStatus(result.updated === 0 ? 'Nothing to update \u2014 those scripts may not be synced yet, or are already up to date.' : `Updated ${result.updated} script${result.updated === 1 ? '' : 's'} to the real voice version.`);
      setSyncVersion(v => v + 1);
    } catch (err) {
      setSyncStatus(`Couldn't refresh: ${err.message || err}`);
    }
    setSyncing(false);
  }

  return (
    <div>
      <div className="row-between" style={{ marginBottom: 'var(--space-3)', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
        <div style={{ minWidth: 260 }}>
          <SubTabNav
            tabs={['ctas', 'scripts', 'prompts', 'playbooks', 'knowledge'].map(t => ({ key: t, label: t === 'knowledge' ? 'Local Knowledge' : t.charAt(0).toUpperCase() + t.slice(1) }))}
            active={subTab}
            onChange={setSubTab}
          />
        </div>
        <Button size="sm" variant="ghost" onClick={handleSync} disabled={syncing}>
          {syncing ? 'Syncing…' : 'Sync latest from manual'}
        </Button>
        <Button size="sm" variant="text" onClick={handleRefreshVoice} disabled={syncing}>
          Refresh script voice
        </Button>
      </div>
      {syncStatus && <div className="muted" style={{ fontSize: 'var(--text-caption)', marginBottom: 'var(--space-3)' }}>{syncStatus}</div>}
      {subTab === 'ctas' && <CtaLibrary key={syncVersion} />}
      {subTab === 'scripts' && <ScriptLibrary key={syncVersion} />}
      {subTab === 'prompts' && <PromptLibrary key={syncVersion} />}
      {subTab === 'playbooks' && <FlowsTab />}
      {subTab === 'knowledge' && <LocalKnowledgeView />}
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
              <div style={{ fontWeight: 700, fontSize: 'var(--text-small)' }}>{c.cta_text}</div>
              <div className="muted" style={{ fontSize: 'var(--text-micro)' }}>{c.audience} · {c.stage}{c.page ? ` · ${c.page}` : ''}</div>
            </div>
            <Button size="sm" variant="ghost" onClick={() => copy(c)}>{copiedId === c.id ? <>Copied <Check size={13} style={{ verticalAlign: 'middle' }} /></> : 'Copy'}</Button>
          </div>
        ))}
      </div>
    </Card>
  );
}

// Classifies each script's `section` into one of 4 top-level
// categories for filtering — was a single flat list of 25 sections,
// which is exactly why Troubleshooting/Triggers were easy to forget
// about entirely.
function categoryFor(section) {
  if (section.startsWith('Troubleshooting')) return 'Troubleshooting';
  if (section.startsWith('Trigger')) return 'Triggers';
  if (section === 'Decision Rules') return 'Decision Rules';
  return 'Conversation Scripts';
}
const SCRIPT_CATEGORIES = ['Conversation Scripts', 'Decision Rules', 'Troubleshooting', 'Triggers'];

function ScriptLibrary() {
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState('');
  const [copiedId, setCopiedId] = useState(null);
  const [category, setCategory] = useState('Conversation Scripts');

  async function refresh() { setItems(await listScripts(search)); }
  useEffect(() => { refresh(); }, [search]);

  function copy(item) {
    navigator.clipboard?.writeText(item.script_text);
    setCopiedId(item.id);
    setTimeout(() => setCopiedId(null), 1200);
  }

  const filtered = items.filter(s => search || categoryFor(s.section) === category);

  return (
    <Card>
      <input placeholder="Search scripts..." value={search} onChange={e => setSearch(e.target.value)} style={{ width: '100%', marginBottom: 12 }} />
      {!search && (
        <div className="row" style={{ gap: 4, marginBottom: 'var(--space-3)', flexWrap: 'wrap' }}>
          {SCRIPT_CATEGORIES.map(c => (
            <button key={c} className={`sub-tab ${category === c ? 'active' : ''}`} onClick={() => setCategory(c)}>{c}</button>
          ))}
        </div>
      )}
      <div className="stack">
        {filtered.length === 0 && <div className="muted" style={{ fontSize: 'var(--text-caption)' }}>Nothing in this category yet.</div>}
        {filtered.map(s => (
          <details key={s.id} open={!!search} style={{ padding: '6px 0', borderBottom: '1px solid var(--sand)' }}>
            <summary style={{ cursor: 'pointer', fontWeight: 700, fontSize: 'var(--text-small)' }}>{s.section} — {s.situation}</summary>
            <p className="muted" style={{ fontSize: 'var(--text-small)', marginTop: 4 }}>{s.script_text}</p>
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
            <summary style={{ cursor: 'pointer', fontWeight: 700, fontSize: 'var(--text-small)' }}>{p.code ? `${p.code} — ` : ''}{p.title}</summary>
            <div className="muted" style={{ fontSize: 'var(--text-micro)' }}>{p.category} · {p.use_for}</div>
            <p style={{ fontSize: 'var(--text-small)', marginTop: 4, whiteSpace: 'pre-wrap' }}>{p.prompt_text}</p>
            <Button size="sm" variant="ghost" onClick={() => copy(p)}>{copiedId === p.id ? <>Copied <Check size={13} style={{ verticalAlign: 'middle' }} /></> : 'Copy'}</Button>
          </details>
        ))}
      </div>
    </Card>
  );
}

function FlowsTab() {
  return (
    <div className="stack">
      {Object.entries(FLOWS).map(([key, flow]) => (
        <Card key={key}>
          <div className="row-between">
            <div>
              <div style={{ fontWeight: 700 }}>{flow.label}</div>
              <div className="muted" style={{ fontSize: 'var(--text-caption)' }}>{flow.description}</div>
            </div>
            <Link to={`/business/flows/${key}`}><Button size="sm">Start</Button></Link>
          </div>
        </Card>
      ))}
    </div>
  );
}

// ============================================================
// LOCAL KNOWLEDGE — System 02. Reference content, same treatment as
// the Comfort Ladder/Relationship Energy Scale — fixed manual
// content this powers consultations and content creation with, not
// something edited in-app.
// ============================================================
function LocalKnowledgeView() {
  const [expandedCity, setExpandedCity] = useState(null);

  return (
    <div className="stack" style={{ gap: 'var(--space-4)' }}>
      <Card>
        <div className="section-label">Decision framework</div>
        <p style={{ fontSize: 'var(--text-small)', marginTop: 4 }}>{DECISION_FRAMEWORK}</p>
      </Card>

      {CITY_PROFILES.map(c => (
        <Card key={c.city}>
          <div className="row-between" onClick={() => setExpandedCity(expandedCity === c.city ? null : c.city)} style={{ cursor: 'pointer' }}>
            <div>
              <div style={{ fontWeight: 700 }}>{c.city}</div>
              <div className="muted" style={{ fontSize: 'var(--text-caption)' }}>{c.mainStrength} · trade-off: {c.tradeOff}</div>
            </div>
          </div>
          {expandedCity === c.city && (
            <div className="stack" style={{ marginTop: 'var(--space-3)', gap: 6 }}>
              <div style={{ fontSize: 'var(--text-small)' }}><strong>Identity:</strong> {c.identity}</div>
              <div style={{ fontSize: 'var(--text-small)' }}><strong>Best fit:</strong> {c.bestFit}</div>
              <div style={{ fontSize: 'var(--text-small)' }}><strong>Housing:</strong> {c.housing}</div>
              <div style={{ fontSize: 'var(--text-small)' }}><strong>Buyer considerations:</strong> {c.buyerConsiderations}</div>
              <div style={{ fontSize: 'var(--text-small)', fontStyle: 'italic', color: 'var(--sage)' }}>"{c.honestLine}"</div>
              <div className="muted" style={{ fontSize: 'var(--text-micro)', marginTop: 4, textTransform: 'uppercase' }}>Priority neighborhoods</div>
              <div className="stack" style={{ gap: 2 }}>
                {c.neighborhoods.map((n, i) => <div key={i} style={{ fontSize: 'var(--text-caption)' }}>• {n}</div>)}
              </div>
            </div>
          )}
        </Card>
      ))}

      <Card>
        <div className="section-label">Buyer intelligence topics</div>
        <div className="stack" style={{ marginTop: 'var(--space-2)', gap: 6 }}>
          {BUYER_INTELLIGENCE_TOPICS.map(t => (
            <div key={t.topic} style={{ fontSize: 'var(--text-small)' }}><strong>{t.topic}:</strong> <span className="muted">{t.cover}</span></div>
          ))}
        </div>
      </Card>

      <Card>
        <div className="section-label">Local expertise categories</div>
        <div className="stack" style={{ marginTop: 'var(--space-2)', gap: 6 }}>
          {LOCAL_EXPERTISE_CATEGORIES.map(cat => (
            <div key={cat.code} style={{ fontSize: 'var(--text-small)' }}><strong>{cat.code} — {cat.name}:</strong> <span className="muted">{cat.understanding}</span></div>
          ))}
        </div>
      </Card>
    </div>
  );
}
