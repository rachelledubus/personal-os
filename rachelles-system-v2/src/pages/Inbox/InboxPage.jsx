import React, { useEffect, useState } from 'react';
import { Sparkles } from 'lucide-react';
import Card from '../../components/ui/Card.jsx';
import Button from '../../components/ui/Button.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import {
  listUnsorted, archiveCapture, requestSuggestion,
  resolveToTask, resolveToNote, resolveToContentItem, resolveToContact, resolveToMaintenance,
} from '../../services/capture.js';
import './InboxPage.css';

const RESOLVE_ACTIONS = [
  { key: 'task', label: 'Task', fn: resolveToTask },
  { key: 'note', label: 'Note / Research', fn: resolveToNote },
  { key: 'content', label: 'Content idea', fn: resolveToContentItem },
  { key: 'contact', label: 'Opportunity', fn: resolveToContact },
  { key: 'maintenance', label: 'Reminder', fn: resolveToMaintenance },
];

export default function InboxPage() {
  const [items, setItems] = useState(null);
  const [loadingId, setLoadingId] = useState(null);

  async function refresh() {
    setItems(await listUnsorted());
  }

  useEffect(() => { refresh(); }, []);

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
    await action.fn(item);
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
