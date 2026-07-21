import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Card from '../../components/ui/Card.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import { supabase } from '../../lib/supabaseClient.js';
import { listRecentDecisions } from '../../services/aiOperator.js';

const TABS = ['reference', 'documents', 'finances', 'notes', 'ai-log'];
const TAB_LABELS = { reference: 'Reference', documents: 'Documents', finances: 'Finances', notes: 'Notes', 'ai-log': 'AI Log' };

export default function LibraryPage() {
  const { tab = 'reference' } = useParams();
  const navigate = useNavigate();

  return (
    <div>
      <div className="page-title">📚 Library</div>
      <div className="row" style={{ marginBottom: 'var(--space-4)', flexWrap: 'wrap' }}>
        {TABS.map(t => (
          <button key={t} className={`sub-tab ${tab === t ? 'active' : ''}`} onClick={() => navigate(`/library/${t}`)}>
            {TAB_LABELS[t]}
          </button>
        ))}
      </div>

      {tab === 'reference' && <ReferenceTab />}
      {tab === 'documents' && <DocumentsTab />}
      {tab === 'finances' && <FinancesTab />}
      {tab === 'notes' && <NotesTab />}
      {tab === 'ai-log' && <AILogTab />}
    </div>
  );
}

function ReferenceTab() {
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data } = await supabase.from('reference_library').select('*').eq('user_id', user.id).order('category');
      setItems(data || []);
    })();
  }, []);

  const filtered = items.filter(i => !search || (i.title + i.body).toLowerCase().includes(search.toLowerCase()));

  return (
    <Card>
      <input placeholder="Search scripts, prompts, CTAs..." value={search} onChange={e => setSearch(e.target.value)} style={{ width: '100%', marginBottom: 12 }} />
      {filtered.length === 0 ? <EmptyState icon="leaf" title="No matches" /> : (
        <div className="stack">
          {filtered.slice(0, 30).map(i => (
            <details key={i.id}>
              <summary style={{ fontWeight: 700, cursor: 'pointer' }}>{i.title}</summary>
              <p className="muted" style={{ fontSize: 13, whiteSpace: 'pre-wrap' }}>{i.body}</p>
            </details>
          ))}
        </div>
      )}
    </Card>
  );
}

function DocumentsTab() {
  const [docs, setDocs] = useState([]);
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data } = await supabase.from('bos_documents').select('id, title, category, doc_number').eq('user_id', user.id);
      setDocs(data || []);
    })();
  }, []);
  return (
    <Card>
      <div className="section-label">Business manual</div>
      {docs.length === 0 ? <EmptyState icon="coffee" title="Nothing here yet" /> : (
        <div className="stack">
          {docs.map(d => (
            <div key={d.id} style={{ padding: '6px 0' }}>{d.doc_number ? `${d.doc_number} — ` : ''}{d.title}</div>
          ))}
        </div>
      )}
    </Card>
  );
}

function FinancesTab() {
  const [bills, setBills] = useState([]);
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data } = await supabase.from('bills').select('*').eq('user_id', user.id);
      setBills(data || []);
    })();
  }, []);
  const total = bills.reduce((s, b) => s + (Number(b.amount) || 0), 0);
  return (
    <Card>
      <div className="row-between">
        <div className="section-label">Bills</div>
        <div className="muted">${total.toFixed(0)}/mo</div>
      </div>
      {bills.length === 0 ? <EmptyState icon="leaf" title="No bills added yet" /> : (
        <div className="stack">
          {bills.map(b => (
            <div key={b.id} className="row-between" style={{ padding: '6px 0' }}>
              <span>{b.name}</span><span className="muted">${b.amount}</span>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

function NotesTab() {
  const [notes, setNotes] = useState([]);
  const [content, setContent] = useState('');

  async function load() {
    const { data: { user } } = await supabase.auth.getUser();
    const { data } = await supabase.from('notes').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
    setNotes(data || []);
  }
  useEffect(() => { load(); }, []);

  async function addNote() {
    if (!content.trim()) return;
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from('notes').insert({ user_id: user.id, content });
    setContent('');
    load();
  }

  return (
    <Card>
      <div className="section-label">Quick note</div>
      <div className="row">
        <textarea value={content} onChange={e => setContent(e.target.value)} style={{ flex: 1, minHeight: 60 }} />
      </div>
      <button className="btn btn-primary btn-sm" style={{ marginTop: 8 }} onClick={addNote}>Save</button>

      <div className="stack" style={{ marginTop: 'var(--space-5)' }}>
        {notes.map(n => <div key={n.id} className="muted" style={{ fontSize: 13, borderBottom: '1px solid var(--sand)', padding: '6px 0' }}>{n.content}</div>)}
      </div>
    </Card>
  );
}

// Every automated decision — a task assignment, a rollover, an
// applied AI replan — with what was proposed and how it was actually
// resolved. This is the literal "learns over time" data, made visible
// rather than left as an invisible table nobody ever looks at.
function AILogTab() {
  const [decisions, setDecisions] = useState(null);

  useEffect(() => { listRecentDecisions(30).then(setDecisions); }, []);

  const RESPONSE_LABEL = { accepted: '✓ Accepted', edited: '✎ Edited', rejected: '✕ Rejected', null: 'Pending' };

  return (
    <Card>
      <div className="section-label">Recent AI decisions</div>
      {decisions === null ? null : decisions.length === 0 ? (
        <EmptyState icon="sparkles" title="No decisions logged yet" subtitle="These accumulate as the schedule assigns tasks and you respond to them." />
      ) : (
        <div className="stack" style={{ marginTop: 'var(--space-3)' }}>
          {decisions.map(d => (
            <div key={d.id} style={{ padding: '8px 0', borderBottom: '1px solid var(--sand)' }}>
              <div className="row-between">
                <span className="muted" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5 }}>{d.decision_type.replace('_', ' ')}</span>
                <span className="muted" style={{ fontSize: 11 }}>{RESPONSE_LABEL[d.user_response]}</span>
              </div>
              <div style={{ fontSize: 13, marginTop: 2 }}>{d.reasoning}</div>
              <div className="muted" style={{ fontSize: 11, marginTop: 2 }}>{new Date(d.proposed_at).toLocaleString()}</div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
