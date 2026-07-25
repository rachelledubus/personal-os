import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Check } from 'lucide-react';
import Card from '../../components/ui/Card.jsx';
import Button from '../../components/ui/Button.jsx';
import SubTabNav from '../../components/nav/SubTabNav.jsx';
import { seedLibraryIfEmpty, listCtas, listScripts, listPrompts, addCta, addScript, addPrompt, syncLibraryGaps } from '../../services/library.js';
import { FLOWS } from '../../services/flows.js';

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

  return (
    <div>
      <div className="row-between" style={{ marginBottom: 'var(--space-3)', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
        <div style={{ minWidth: 260 }}>
          <SubTabNav
            tabs={['ctas', 'scripts', 'prompts', 'playbooks'].map(t => ({ key: t, label: t.charAt(0).toUpperCase() + t.slice(1) }))}
            active={subTab}
            onChange={setSubTab}
          />
        </div>
        <Button size="sm" variant="ghost" onClick={handleSync} disabled={syncing}>
          {syncing ? 'Syncing…' : 'Sync latest from manual'}
        </Button>
      </div>
      {syncStatus && <div className="muted" style={{ fontSize: 'var(--text-caption)', marginBottom: 'var(--space-3)' }}>{syncStatus}</div>}
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
