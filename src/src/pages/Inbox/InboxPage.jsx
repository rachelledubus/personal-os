import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, ArrowRight } from 'lucide-react';
import Card from '../../components/ui/Card.jsx';
import Button from '../../components/ui/Button.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import {
  listUnsorted, archiveCapture, requestSuggestion,
  resolveToTask, resolveToNote, resolveToContentIdea, resolveToContact, resolveToMaintenance, resolveToBuyerQuestion,
} from '../../services/capture.js';
import './InboxPage.css';

// Where each resolution actually lands, and how to get there — this is
// what makes "where did it go" answerable instead of a mystery.
const RESOLVE_ACTIONS = [
  { key: 'task', label: 'Task', fn: resolveToTask, destLabel: 'Tasks', destLink: null,
    destNote: "Scheduled into today's plan automatically once it's due" },
  { key: 'note', label: 'Note / Research', fn: resolveToNote, destLabel: 'Library → Notes', destLink: '/library/notes' },
  { key: 'content', label: 'Content idea', fn: resolveToContentIdea, destLabel: 'Business → Content', destLink: '/business/content' },
  { key: 'buyer_question', label: 'Buyer question', fn: resolveToBuyerQuestion, destLabel: 'Business → Content', destLink: '/business/content' },
  { key: 'contact', label: 'Opportunity', fn: resolveToContact, destLabel: 'Business → Pipeline',
    destLink: '/business/pipeline' },
  { key: 'maintenance', label: 'Reminder', fn: resolveToMaintenance, destLabel: 'Grow → Maintenance', destLink: '/grow/maintenance' },
];

export default function InboxPage() {
  const [items, setItems] = useState(null);
  const [loadingId, setLoadingId] = useState(null);
  const [lastResolved, setLastResolved] = useState(null); // { text, destLabel, destLink }

  async function refresh() {
    setItems(await listUnsorted());
  }

  useEffect(() => {
    refresh();
    // Picks up anything captured from the floating button anywhere else
    // in the app, without needing a manual page refresh.
    const handler = () => refresh();
    window.addEventListener('capture:added', handler);
    return () => window.removeEventListener('capture:added', handler);
  }, []);

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

  async function handleArchive(item) {
    await archiveCapture(item.id);
    refresh();
  }

  return (
    <div>
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
              </div>

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
