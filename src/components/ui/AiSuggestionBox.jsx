import React from 'react';
import Button from './Button.jsx';

// ============================================================
// One component for the "AI is thinking / here's the result / AI
// isn't configured yet" pattern used everywhere an AI feature shows
// its output inline. Was about to be copy-pasted a third time
// (Pipeline follow-up drafts, Content repurposing) — now it's one
// component both use, and the next AI feature reuses it for free.
// ============================================================
export default function AiSuggestionBox({ loading, unavailable, envVar = 'GOOGLE_AI_API_KEY', children, onDismiss }) {
  if (loading) {
    return <div className="muted" style={{ fontSize: 12, marginTop: 'var(--space-2)' }}>Thinking…</div>;
  }
  if (unavailable) {
    return (
      <div className="muted" style={{ fontSize: 12, marginTop: 'var(--space-2)' }}>
        AI isn't set up yet (needs {envVar} on Netlify). Nothing broke — everything else still works.
      </div>
    );
  }
  return (
    <div className="inbox-suggestion" style={{ marginTop: 'var(--space-2)' }}>
      {children}
      {onDismiss && (
        <div style={{ marginTop: 'var(--space-2)' }}>
          <Button size="sm" variant="text" onClick={onDismiss}>Dismiss</Button>
        </div>
      )}
    </div>
  );
}
