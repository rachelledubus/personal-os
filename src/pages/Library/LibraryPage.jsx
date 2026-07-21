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

// reference_library doesn't currently exist as a table in Supabase —
// this degrades to an honest empty state instead of a silent crash
// until that's either created or this tab is merged into Documents.
function ReferenceTab() {
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState('');
  const [tableMissing, setTableMissing] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase.from('reference_library').select('*').eq('user_id', user.id).order('category');
      if (error) { setTableMissing(true); return; }
      setItems(data || []);
    })();
  }, []);

  if (tableMissing) {
    return (
      <Card>
        <EmptyState icon="leaf" title="Reference library isn't set up yet"
          subtitle="This tab needs a reference_library table that doesn't exist in your database yet. Your scripts/prompts/CTAs might already live in Documents below instead — check there first." />
      </Card>
    );
  }

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

// Now pulls `body` and renders it expandable — clicking a document
// shows its actual content instead of just a title in a static list.
function DocumentsTab() {
  const [docs, setDocs] = useState([]);
  const [search, setSearch] = useState('');
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data } = await supabase.from('bos_documents').select('*').eq('user_id', user.id).order('category');
      setDocs(data || []);
    })();
  }, []);

  const filtered = docs.filter(d => !search || (d.title + (d.body || '')).toLowerCase().includes(search.toLowerCase()));
  const byCategory = {};
  filtered.forEach(d => { (byCategory[d.category || 'Uncategorized'] ||= []).push(d); });

  return (
    <Card>
      <div className="section-label">Business manual</div>
      <input placeholder="Search documents..." value={search} onChange={e => setSearch(e.target.value)} style={{ width: '100%', margin: '8px 0 16px' }} />
      {filtered.length === 0 ? <EmptyState icon="coffee" title="Nothing here yet" /> : (
        Object.entries(byCategory).map(([cat, items]) => (
          <div key={cat} style={{ marginBottom: 'var(--space-4)' }}>
            <div className="muted" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>{cat}</div>
            <div className="stack">
              {items.map(d => (
                <details key={d.id}>
                  <summary style={{ fontWeight: 700, cursor: 'pointer' }}>
                    {d.doc_number ? `${d.doc_number} — ` : ''}{d.title}
                  </summary>
                  <p className="muted" style={{ fontSize: 13, whiteSpace: 'pre-wrap' }}>{d.body || 'No content stored for this document.'}</p>
                </details>
              ))}
            </div>
          </div>
        ))
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
      <p className="muted" style={{ fontSize: 12, marginTop: 4 }}>
        This is moving to Grow → Finance with more than just bills — see the next update.
      </p>
      {bills.length === 0 ? <EmptyState icon="leaf" title="No bills added yet" /> : (
        <div className="stack" style={{ marginTop: 'var(--space-3)' }}>
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
