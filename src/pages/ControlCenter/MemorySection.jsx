import React, { useEffect, useState } from 'react';
import { Check } from 'lucide-react';
import Card from '../../components/ui/Card.jsx';
import Button from '../../components/ui/Button.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import SubTabNav from '../../components/nav/SubTabNav.jsx';
import { listDevLog, listDecisions, addDecision, getSystemStatus, generateHandoff } from '../../services/devMemory.js';

const SUBTABS = [
  { key: 'changelog', label: 'Changelog' },
  { key: 'decisions', label: 'Decisions' },
  { key: 'status', label: 'Status' },
  { key: 'handoff', label: 'Handoff' },
];

export default function MemorySection() {
  const [subTab, setSubTab] = useState('changelog');
  const [devLog, setDevLog] = useState([]);
  const [decisions, setDecisions] = useState([]);
  const [status, setStatus] = useState(null);
  const [handoff, setHandoff] = useState('');
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  async function refresh() {
    const [d, dec, s] = await Promise.all([listDevLog(), listDecisions(), getSystemStatus()]);
    setDevLog(d); setDecisions(dec); setStatus(s);
  }
  useEffect(() => { refresh(); }, []);

  async function handleGenerateHandoff() {
    setGenerating(true);
    const doc = await generateHandoff();
    setGenerating(false);
    setHandoff(doc);
  }

  function copyHandoff() {
    navigator.clipboard?.writeText(handoff);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  }

  return (
    <div>
      <SubTabNav tabs={SUBTABS} active={subTab} onChange={setSubTab} />

      {subTab === 'changelog' && (
        <Card>
          <div className="section-label">Changelog</div>
          <p className="muted" style={{ fontSize: 'var(--text-micro)' }}>In-app changes log automatically. Code-level changes (from a Claude session) get added here by convention at the end of a session.</p>
          {devLog.length === 0 ? <EmptyState icon="sparkles" title="Nothing logged yet" /> : (
            <div className="stack" style={{ marginTop: 'var(--space-2)' }}>
              {devLog.map(d => (
                <div key={d.id} style={{ padding: '6px 0', borderBottom: '1px solid var(--sand)' }}>
                  <span className="muted" style={{ fontSize: 'var(--text-micro)', textTransform: 'uppercase' }}>{d.entry_type}</span>
                  <div style={{ fontSize: 'var(--text-small)' }}>{d.summary}</div>
                  {d.detail && <div className="muted" style={{ fontSize: 'var(--text-caption)' }}>{d.detail}</div>}
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {subTab === 'decisions' && <DecisionsPanel decisions={decisions} onAdded={refresh} />}

      {subTab === 'status' && status && (
        <Card>
          <div className="section-label">Live system status</div>
          <div className="stack" style={{ marginTop: 'var(--space-2)' }}>
            <div className="row-between" style={{ fontSize: 'var(--text-small)' }}><span>Contacts in Pipeline</span><span className="muted">{status.contacts}</span></div>
            <div className="row-between" style={{ fontSize: 'var(--text-small)' }}><span>Content pieces</span><span className="muted">{status.contentPieces}</span></div>
            <div className="row-between" style={{ fontSize: 'var(--text-small)' }}><span>Open tasks</span><span className="muted">{status.openTasks}</span></div>
            <div className="row-between" style={{ fontSize: 'var(--text-small)' }}><span>Backlog ideas</span><span className="muted">{status.backlogIdeas}</span></div>
            <div className="row-between" style={{ fontSize: 'var(--text-small)' }}><span>Closings logged</span><span className="muted">{status.closingsLogged}</span></div>
          </div>
        </Card>
      )}

      {subTab === 'handoff' && (
        <Card>
          <div className="section-label">Generate AI handoff</div>
          <p className="muted" style={{ fontSize: 'var(--text-caption)' }}>Builds a fresh continuation document from your live data — paste it into a new conversation to resume with context.</p>
          <Button size="sm" onClick={handleGenerateHandoff} disabled={generating} style={{ marginTop: 'var(--space-2)' }}>
            {generating ? 'Generating…' : 'Generate now'}
          </Button>
          {handoff && (
            <div style={{ marginTop: 'var(--space-3)' }}>
              <textarea readOnly value={handoff} style={{ width: '100%', minHeight: 240, fontSize: 'var(--text-caption)', fontFamily: 'monospace' }} />
              <Button size="sm" variant="ghost" onClick={copyHandoff} style={{ marginTop: 'var(--space-2)' }}>{copied ? <>Copied <Check size={14} style={{ verticalAlign: 'middle' }} /></> : 'Copy to clipboard'}</Button>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}

function DecisionsPanel({ decisions, onAdded }) {
  const [what, setWhat] = useState('');
  const [why, setWhy] = useState('');

  async function handleAdd() {
    if (!what.trim()) return;
    await addDecision(what.trim(), why.trim() || null);
    setWhat(''); setWhy('');
    onAdded();
  }

  return (
    <Card>
      <div className="section-label">Decisions</div>
      <p className="muted" style={{ fontSize: 'var(--text-micro)' }}>Record why a change was made, so the reasoning isn't lost.</p>
      <div className="stack" style={{ marginTop: 'var(--space-2)' }}>
        <input placeholder="What changed?" value={what} onChange={e => setWhat(e.target.value)} />
        <input placeholder="Why? (optional)" value={why} onChange={e => setWhy(e.target.value)} />
        <div><Button size="sm" onClick={handleAdd}>+ Record decision</Button></div>
      </div>
      <div className="stack" style={{ marginTop: 'var(--space-4)' }}>
        {decisions.map(d => (
          <div key={d.id} style={{ padding: '6px 0', borderBottom: '1px solid var(--sand)' }}>
            <div style={{ fontSize: 'var(--text-small)', fontWeight: 700 }}>{d.what_changed}</div>
            {d.why && <div className="muted" style={{ fontSize: 'var(--text-caption)' }}>{d.why}</div>}
          </div>
        ))}
      </div>
    </Card>
  );
}
