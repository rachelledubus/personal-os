import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, ArrowRight } from 'lucide-react';
import Card from '../../components/ui/Card.jsx';
import Button from '../../components/ui/Button.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import Banner from '../../components/ui/Banner.jsx';
import {
  listUnsorted, archiveCapture, requestSuggestion,
  resolveToTask, resolveToNote, resolveToContentIdea, resolveToContact, resolveToMaintenance, resolveToBuyerQuestion,
} from '../../services/capture.js';
import { searchContactsByName } from '../../services/contacts.js';
import './InboxPage.css';

// Where each resolution actually lands, and how to get there — this is
// what makes "where did it go" answerable instead of a mystery.
const RESOLVE_ACTIONS = [
  { key: 'task', label: 'Task', fn: resolveToTask, destLabel: 'Tasks', destLink: null,
    destNote: "Scheduled into today's plan automatically once it's due" },
  { key: 'note', label: 'Note / Research', fn: resolveToNote, destLabel: 'Library → Notes', destLink: '/library/notes' },
  { key: 'content', label: 'Content idea', fn: resolveToContentIdea, destLabel: 'Business → Content', destLink: '/business/content' },
  { key: 'buyer_question', label: 'Buyer question', fn: resolveToBuyerQuestion, destLabel: 'Business → Content', destLink: '/business/content' },
  { key: 'maintenance', label: 'Reminder', fn: resolveToMaintenance, destLabel: 'Grow → Maintenance', destLink: '/grow/maintenance' },
];

export default function InboxPage() {
  const [items, setItems] = useState(null);
  const [loadingId, setLoadingId] = useState(null);
  const [lastResolved, setLastResolved] = useState(null);
  const [contactPickerFor, setContactPickerFor] = useState(null);
  const [contactSearch, setContactSearch] = useState('');
  const [contactResults, setContactResults] = useState([]);

  async function refresh() {
    setItems(await listUnsorted());
  }

  useEffect(() => {
    refresh();
    const handler = () => refresh();
    window.addEventListener('capture:added', handler);
    return () => window.removeEventListener('capture:added', handler);
  }, []);

  useEffect(() => {
    if (contactSearch.length >= 2) searchContactsByName(contactSearch).then(setContactResults);
    else setContactResults([]);
  }, [contactSearch]);

  async function handleSuggest(item) {
    setLoadingId(item.id);
    const suggestion = await requestSuggestion(item);
    setLoadingId(null);
    if (suggestion) {
      setItems(prev => prev.map(i => (i.id === item.id ? {
        ...i,
        suggested_type: suggestion.type,
        suggested_category: suggestion.category,
        suggested_system: suggestion.system,
        suggestion_reasoning: suggestion.reasoning,
      } : i)));
    }
  }

  async function handleResolve(item, action) {
    const record = await action.fn(item);
    const destLink = typeof action.destLink === 'function' ? action.destLink(record) : action.destLink;
    setLastResolved({ text: item.raw_text, destLabel: action.destLabel, destLink, destNote: action.destNote });
    refresh();
  }

  async function handleResolveToExistingContact(item, contact) {
    await resolveToContact(item, {}, contact.id);
    setLastResolved({ text: item.raw_text, destLabel: `${contact.name} (Pipeline)`, destLink: '/business/pipeline', destNote: 'Added to their notes, follow-up set for 7 days out' });
    setContactPickerFor(null);
    setContactSearch('');
    refresh();
  }

  async function handleResolveToNewContact(item) {
    await resolveToContact(item);
    setLastResolved({ text: item.raw_text, destLabel: 'Business → Pipeline', destLink: '/business/pipeline', destNote: 'Created as a new contact' });
    setContactPickerFor(null);
    refresh();
  }

  async function handleArchive(item) {
    await archiveCapture(item.id);
    refresh();
  }

  return (
    <div>
      <Banner slotKey="inbox_banner" scene="inbox" />
      <div className="page-title">📥 Inbox</div>
      <p className="muted" style={{ marginBottom: 'var(--space-4)' }}>
        Everything you've captured, unsorted. Organize each into its real home — or archive it.
      </p>

      {lastResolved && (
        <Card className="inbox-resolved-banner">
          <div className="row-between">
            <div style={{ fontSize: 13 }}>
              "{lastResolved.text}" → moved to <strong>{lastResolved.destLabel}</strong>
              {lastResolved.destNote && <span className="muted"> — {lastResolved.destNote}</span>}
            </div>
            <div className="row" style={{ gap: 'var(--space-2)' }}>
              {lastResolved.destLink && (
                <Link to={lastResolved.destLink}>
                  <Button size="sm" variant="ghost">Go there <ArrowRight size={13} /></Button>
                </Link>
              )}
              <Button size="sm" variant="text" onClick={() => setLastResolved(null)}>Dismiss</Button>
            </div>
          </div>
        </Card>
      )}

      {items === null ? null : items.length === 0 ? (
        <EmptyState icon="sparkles" title="Inbox zero" subtitle="Nothing waiting to be sorted." />
      ) : (
        <div className="stack" style={{ gap: 'var(--space-4)' }}>
          {items.map(item => (
            <Card key={item.id} className="inbox-item">
              <div className="inbox-item-text">{item.raw_text}</div>

              {item.suggested_type && (
                <div className="inbox-suggestion">
                  <Sparkles size={13} />
                  <span>
                    Suggested: <strong>{item.suggested_category || item.suggested_type}</strong>
                    {item.suggested_system && ` · ${item.suggested_system}`}
                    {item.suggestion_reasoning && ` — ${item.suggestion_reasoning}`}
                  </span>
                </div>
              )}

              <div className="row" style={{ marginTop: 'var(--space-3)', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
                {RESOLVE_ACTIONS.map(action => (
                  <Button key={action.key} size="sm" variant="ghost" onClick={() => handleResolve(item, action)}>
                    → {action.label}
                  </Button>
                ))}
                <Button size="sm" variant="ghost" onClick={() => setContactPickerFor(contactPickerFor === item.id ? null : item.id)}>
                  → Relationship / Opportunity
                </Button>
              </div>

              {/* Relationship memory (Area 6) — "Jessica mentioned coffee"
                  attaches to the real Jessica instead of only ever
                  creating a new contact. */}
              {contactPickerFor === item.id && (
                <div className="inbox-suggestion" style={{ marginTop: 'var(--space-2)' }}>
                  <input placeholder="Search an existing contact by name..." value={contactSearch}
                    onChange={e => setContactSearch(e.target.value)} style={{ width: '100%' }} />
                  {contactResults.length > 0 && (
                    <div className="stack" style={{ marginTop: 'var(--space-2)' }}>
                      {contactResults.map(c => (
                        <div key={c.id} className="row-between" style={{ fontSize: 13, padding: '4px 0', cursor: 'pointer' }} onClick={() => handleResolveToExistingContact(item, c)}>
                          <span>{c.name}</span>
                          <span className="muted" style={{ fontSize: 11 }}>{c.category} · attach note here</span>
                        </div>
                      ))}
                    </div>
                  )}
                  <div style={{ marginTop: 'var(--space-2)' }}>
                    <Button size="sm" variant="text" onClick={() => handleResolveToNewContact(item)}>+ No match — create a new contact instead</Button>
                  </div>
                </div>
              )}

              <div className="row-between" style={{ marginTop: 'var(--space-3)' }}>
                <Button size="sm" variant="text" onClick={() => handleSuggest(item)} disabled={loadingId === item.id}>
                  {loadingId === item.id ? 'Thinking…' : '✨ Suggest'}
                </Button>
                <Button size="sm" variant="text" onClick={() => handleArchive(item)}>Archive</Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
