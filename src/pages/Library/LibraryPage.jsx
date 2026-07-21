import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Card from '../../components/ui/Card.jsx';
import Button from '../../components/ui/Button.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import MarkdownDoc from '../../components/ui/MarkdownDoc.jsx';
import { supabase } from '../../lib/supabaseClient.js';
import { listRecentDecisions } from '../../services/aiOperator.js';
import { listBacklogIdeas, addBacklogIdea, updateBacklogIdea, deleteBacklogIdea, formatBacklogAsPrompt, reorderBacklogIdeas } from '../../services/backlog.js';
import { getCategoryList } from '../../services/settings.js';
import Banner from '../../components/ui/Banner.jsx';

const TABS = ['reference', 'documents', 'notes', 'backlog', 'ai-log'];
const TAB_LABELS = { reference: 'Reference', documents: 'Documents', notes: 'Notes', backlog: 'Backlog', 'ai-log': 'AI Log' };

export default function LibraryPage() {
  const { tab = 'reference' } = useParams();
  const navigate = useNavigate();

  return (
    <div>
      <Banner slotKey="library_banner" scene="library" />
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
      {tab === 'notes' && <NotesTab />}
      {tab === 'backlog' && <BacklogTab />}
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
          subtitle="Your scripts/prompts/CTAs live in Business → Library instead — check there first." />
      </Card>
    );
  }

  const filtered = items.filter(i => !search || (i.title + i.body).toLowerCase().includes(search.toLowerCase()));

  return (
    <Card>
      <input placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} style={{ width: '100%', marginBottom: 12 }} />
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

// Pulls `body` and renders it as real markdown, with inline rename —
// a natural file-management action instead of needing to edit the
// database directly to fix a title.
function DocumentsTab() {
  const [docs, setDocs] = useState([]);
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState(null);
  const [renamingId, setRenamingId] = useState(null);
  const [renameValue, setRenameValue] = useState('');
  const docRefs = useRef({});

  async function refresh() {
    const { data: { user } } = await supabase.auth.getUser();
    const { data } = await supabase.from('bos_documents').select('*').eq('user_id', user.id).order('category');
    setDocs(data || []);
  }
  useEffect(() => { refresh(); }, []);

  const docNumberMap = {};
  docs.forEach(d => { if (d.doc_number) docNumberMap[d.doc_number] = d.id; });

  function jumpToDoc(target, isDocId = false) {
    const doc = isDocId ? docs.find(d => d.id === target) : docs.find(d => d.doc_number === target || d.link_to === target);
    if (!doc) return;
    setExpandedId(doc.id);
    setTimeout(() => docRefs.current[doc.id]?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
  }

  function startRename(doc, e) {
    e.stopPropagation();
    setRenamingId(doc.id);
    setRenameValue(doc.title);
  }

  async function saveRename(docId) {
    if (renameValue.trim()) {
      await supabase.from('bos_documents').update({ title: renameValue.trim() }).eq('id', docId);
    }
    setRenamingId(null);
    refresh();
  }

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
                <div key={d.id} ref={el => (docRefs.current[d.id] = el)}>
                  {renamingId === d.id ? (
                    <div className="row" style={{ padding: '4px 0' }}>
                      <input value={renameValue} onChange={e => setRenameValue(e.target.value)} autoFocus
                        onKeyDown={e => e.key === 'Enter' && saveRename(d.id)} style={{ flex: 1 }} />
                      <Button size="sm" onClick={() => saveRename(d.id)}>Save</Button>
                      <Button size="sm" variant="text" onClick={() => setRenamingId(null)}>Cancel</Button>
                    </div>
                  ) : (
                    <details open={expandedId === d.id} onToggle={e => e.target.open && setExpandedId(d.id)}>
                      <summary style={{ fontWeight: 700, cursor: 'pointer' }}>
                        <span className="row-between" style={{ display: 'inline-flex', width: 'calc(100% - 20px)' }}>
                          <span>{d.doc_number ? `${d.doc_number} — ` : ''}{d.title}</span>
                          <button className="row-remove-btn" style={{ fontSize: 12 }} onClick={e => startRename(d, e)} title="Rename">✎</button>
                        </span>
                      </summary>
                      {d.body ? (
                        <MarkdownDoc text={d.body} docNumberMap={docNumberMap} onJumpToDoc={jumpToDoc} />
                      ) : (
                        <p className="muted" style={{ fontSize: 13 }}>No content stored for this document.</p>
                      )}
                    </details>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </Card>
  );
}

// Real notes now — click one to open it for viewing and editing,
// instead of a static list next to an unrelated add box.
function NotesTab() {
  const [notes, setNotes] = useState([]);
  const [content, setContent] = useState('');
  const [openId, setOpenId] = useState(null);
  const [editText, setEditText] = useState('');

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

  function openNote(note) {
    setOpenId(note.id);
    setEditText(note.content);
  }

  async function saveNote(id) {
    await supabase.from('notes').update({ content: editText }).eq('id', id);
    setOpenId(null);
    load();
  }

  async function deleteNote(id) {
    await supabase.from('notes').delete().eq('id', id);
    setOpenId(null);
    load();
  }

  return (
    <Card>
      <div className="section-label">Quick note</div>
      <div className="row">
        <textarea value={content} onChange={e => setContent(e.target.value)} style={{ flex: 1, minHeight: 60 }} placeholder="Write a new note..." />
      </div>
      <button className="btn btn-primary btn-sm" style={{ marginTop: 8 }} onClick={addNote}>Save</button>

      <div className="stack" style={{ marginTop: 'var(--space-5)' }}>
        {notes.map(n => (
          <div key={n.id} style={{ borderBottom: '1px solid var(--sand)', padding: '6px 0' }}>
            {openId === n.id ? (
              <div>
                <textarea value={editText} onChange={e => setEditText(e.target.value)} style={{ width: '100%', minHeight: 70 }} autoFocus />
                <div className="row" style={{ marginTop: 4, gap: 'var(--space-2)' }}>
                  <Button size="sm" onClick={() => saveNote(n.id)}>Save</Button>
                  <Button size="sm" variant="text" onClick={() => setOpenId(null)}>Cancel</Button>
                  <Button size="sm" variant="text" onClick={() => deleteNote(n.id)}>Delete</Button>
                </div>
              </div>
            ) : (
              <div className="muted" style={{ fontSize: 13, cursor: 'pointer' }} onClick={() => openNote(n)}>
                {n.content}
              </div>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
}

// Future Improvements Workspace — a real backlog for the software
// itself, quick to add, editable, deletable, searchable, and
// one-click-copyable as a single prompt for a future dev session.
function BacklogTab() {
  const [ideas, setIdeas] = useState([]);
  const [search, setSearch] = useState('');
  const [newIdea, setNewIdea] = useState({ idea: '', category: '' });
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState('');
  const [copied, setCopied] = useState(false);
  const [suggestedCategories, setSuggestedCategories] = useState([]);

  async function refresh() { setIdeas(await listBacklogIdeas(search)); }
  useEffect(() => { refresh(); getCategoryList('backlog_categories').then(setSuggestedCategories); }, [search]);

  async function handleAdd() {
    if (!newIdea.idea.trim()) return;
    await addBacklogIdea(newIdea.idea.trim(), newIdea.category.trim() || null);
    setNewIdea({ idea: '', category: '' });
    refresh();
  }

  function startEdit(item) {
    setEditingId(item.id);
    setEditText(item.idea);
  }

  async function saveEdit(id) {
    await updateBacklogIdea(id, { idea: editText });
    setEditingId(null);
    refresh();
  }

  async function handleCopyAll() {
    const prompt = formatBacklogAsPrompt(ideas);
    navigator.clipboard?.writeText(prompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  const [dragId, setDragId] = useState(null);

  function handleDragStart(id) { setDragId(id); }

  function handleDragOverItem(e, targetId, categoryItems) {
    e.preventDefault();
    if (!dragId || dragId === targetId) return;
    const fromIdx = categoryItems.findIndex(i => i.id === dragId);
    const toIdx = categoryItems.findIndex(i => i.id === targetId);
    if (fromIdx === -1 || toIdx === -1) return;
    // live-reorder just this category's slice within the flat ideas array
    const reordered = [...categoryItems];
    const [moved] = reordered.splice(fromIdx, 1);
    reordered.splice(toIdx, 0, moved);
    setIdeas(prev => {
      const others = prev.filter(i => !categoryItems.some(c => c.id === i.id));
      return [...others, ...reordered].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
    });
  }

  async function handleDrop(categoryItems) {
    if (!dragId) return;
    setDragId(null);
    await reorderBacklogIdeas(categoryItems.map(i => i.id));
    refresh();
  }

  const byCategory = {};
  ideas.forEach(i => { (byCategory[i.category || 'Uncategorized'] ||= []).push(i); });

  return (
    <div className="stack" style={{ gap: 'var(--space-4)' }}>
      <Card>
        <div className="section-label">Add an idea</div>
        <div className="row" style={{ marginTop: 'var(--space-2)', flexWrap: 'wrap' }}>
          <input placeholder="What should the app do better?" value={newIdea.idea}
            onChange={e => setNewIdea({ ...newIdea, idea: e.target.value })}
            onKeyDown={e => e.key === 'Enter' && handleAdd()} style={{ flex: 1, minWidth: 200 }} />
          <input placeholder="Category (optional)" value={newIdea.category} list="backlog-category-suggestions"
            onChange={e => setNewIdea({ ...newIdea, category: e.target.value })} style={{ width: 160 }} />
          <datalist id="backlog-category-suggestions">
            {suggestedCategories.map(c => <option key={c} value={c} />)}
          </datalist>
          <Button size="sm" onClick={handleAdd}>+ Add</Button>
        </div>
      </Card>

      <div className="row-between">
        <input placeholder="Search backlog..." value={search} onChange={e => setSearch(e.target.value)} style={{ flex: 1, marginRight: 'var(--space-3)' }} />
        {ideas.length > 0 && (
          <Button size="sm" variant="ghost" onClick={handleCopyAll}>{copied ? 'Copied ✓' : '📋 Copy all as prompt'}</Button>
        )}
      </div>

      {ideas.length === 0 ? <EmptyState icon="lightbulb" title="Backlog is empty" subtitle="Ideas you capture here accumulate until you're ready to plan the next sprint." /> : (
        Object.entries(byCategory).map(([cat, items]) => (
          <Card key={cat}>
            <div className="section-label">{cat}</div>
            <div className="stack" style={{ marginTop: 'var(--space-2)' }}>
              {items.map(i => (
                <div key={i.id}
                  draggable={editingId !== i.id}
                  onDragStart={() => handleDragStart(i.id)}
                  onDragOver={e => handleDragOverItem(e, i.id, items)}
                  onDrop={() => handleDrop(items)}
                  onDragEnd={() => setDragId(null)}
                  style={{ padding: '6px 0', borderBottom: '1px solid var(--sand)', cursor: editingId === i.id ? 'default' : 'grab', opacity: dragId === i.id ? 0.4 : 1 }}
                >
                  {editingId === i.id ? (
                    <div className="row">
                      <input value={editText} onChange={e => setEditText(e.target.value)} autoFocus
                        onKeyDown={e => e.key === 'Enter' && saveEdit(i.id)} style={{ flex: 1 }} />
                      <Button size="sm" onClick={() => saveEdit(i.id)}>Save</Button>
                    </div>
                  ) : (
                    <div className="row-between">
                      <span style={{ fontSize: 13, cursor: 'pointer' }} onClick={() => startEdit(i)}>
                        <span className="muted" style={{ marginRight: 6 }}>⠿</span>{i.idea}
                      </span>
                      <button className="row-remove-btn" onClick={() => deleteBacklogIdea(i.id).then(refresh)}>×</button>
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
