import React, { useState } from 'react';
import { Sparkles } from 'lucide-react';
import Button from '../ui/Button.jsx';
import { requestReplan, applyReplan } from '../../services/aiOperator.js';
import './AskAIPanel.css';

export default function AskAIPanel({ onApplied }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [proposal, setProposal] = useState(null);
  const [loading, setLoading] = useState(false);
  const [unavailable, setUnavailable] = useState(false);

  async function handleAsk() {
    if (!text.trim()) return;
    setLoading(true);
    setUnavailable(false);
    const result = await requestReplan(text.trim());
    setLoading(false);
    if (!result) { setUnavailable(true); return; }
    setProposal(result);
  }

  async function handleApply() {
    await applyReplan(text.trim(), proposal);
    setProposal(null);
    setText('');
    setOpen(false);
    onApplied?.();
  }

  function handleDismiss() {
    setProposal(null);
  }

  return (
    <div className="ask-ai-panel">
      {!open ? (
        <Button size="sm" variant="ghost" onClick={() => setOpen(true)}>
          <Sparkles size={14} /> Ask AI to adjust today
        </Button>
      ) : (
        <div className="ask-ai-box">
          <textarea
            placeholder="e.g. I'm burnt out today, lighten things up"
            value={text}
            onChange={e => setText(e.target.value)}
          />
          <div className="row-between" style={{ marginTop: 'var(--space-2)' }}>
            <Button size="sm" variant="text" onClick={() => setOpen(false)}>Cancel</Button>
            <Button size="sm" onClick={handleAsk} disabled={loading || !text.trim()}>
              {loading ? 'Thinking…' : 'Ask'}
            </Button>
          </div>

          {unavailable && (
            <div className="muted" style={{ fontSize: 12, marginTop: 'var(--space-2)' }}>
              AI replanning isn't set up yet (needs GOOGLE_AI_API_KEY on Netlify). Nothing broke — try again once it's configured.
            </div>
          )}

          {proposal && (
            <div className="ask-ai-proposal">
              <div style={{ fontSize: 13 }}>{proposal.summary}</div>
              {(proposal.actions || []).length > 0 && (
                <ul className="ask-ai-actions">
                  {proposal.actions.map((a, i) => (
                    <li key={i}>{a.action}: {a.reason}</li>
                  ))}
                </ul>
              )}
              <div className="row" style={{ marginTop: 'var(--space-2)', gap: 'var(--space-2)' }}>
                <Button size="sm" onClick={handleApply}>Apply</Button>
                <Button size="sm" variant="text" onClick={handleDismiss}>Dismiss</Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
