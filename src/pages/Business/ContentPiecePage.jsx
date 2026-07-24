import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Card from '../../components/ui/Card.jsx';
import Button from '../../components/ui/Button.jsx';
import Checkbox from '../../components/ui/Checkbox.jsx';
import AiSuggestionBox from '../../components/ui/AiSuggestionBox.jsx';
import {
  getContentPiece, updateContentPiece, advanceStatus, initRepurposeSlots, markRepurposed,
  requestRepurposeDrafts, requestDraftExpansion, listContentTemplates, listContentIdeas,
} from '../../services/contentEngine.js';

const STATUS_FLOW = ['idea', 'drafting', 'published'];
const STATUS_LABEL = { idea: 'Idea', drafting: 'Drafting', published: 'Published' };
const STATUS_TONE = { idea: 'var(--ink-soft)', drafting: 'var(--gold)', published: 'var(--sage)' };

// A "page," not a form — one document per flagship piece, organized
// into blocks instead of one long inline-expand card. Editing is
// still edit-toggle-then-save (matches the rest of the app's
// pattern), not literal contentEditable, but the layout, spacing, and
// status-as-a-clickable-property are the Notion-page part of the ask.
export default function ContentPiecePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [piece, setPiece] = useState(null);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState('');
  const [editingBrief, setEditingBrief] = useState(false);
  const [briefForm, setBriefForm] = useState({});
  const [editingDraft, setEditingDraft] = useState(false);
  const [draftText, setDraftText] = useState('');
  const [expanding, setExpanding] = useState(false);
  const [aiResult, setAiResult] = useState(null);
  const [picking, setPicking] = useState(false);
  const [templates, setTemplates] = useState([]);
  const [ideas, setIdeas] = useState([]);
  const [repurposing, setRepurposing] = useState(false);
  const [repurposeDrafts, setRepurposeDrafts] = useState(null);

  async function refresh() {
    const p = await getContentPiece(id);
    setPiece(p);
    setTitleDraft(p.title);
    setBriefForm({
      buyer_question: p.buyer_question || '', audience: p.audience || '', funnel_stage: p.funnel_stage || 'Awareness',
      goal: p.goal || '', trade_off: p.trade_off || '', cta: p.cta || '',
    });
    setDraftText(p.draft_body || '');
  }
  useEffect(() => { refresh(); }, [id]);

  async function apply(fields) {
    await updateContentPiece(id, fields);
    await refresh();
  }

  async function handleSaveTitle() {
    if (!titleDraft.trim()) return;
    await apply({ title: titleDraft.trim() });
    setEditingTitle(false);
  }

  async function handleSaveBrief() {
    await apply(briefForm);
    setEditingBrief(false);
  }

  // Automation: writing a draft is what actually means "I'm working on
  // this" — so finishing one bumps idea -> drafting on its own instead
  // of requiring a separate status click.
  async function handleSaveDraft() {
    const fields = { draft_body: draftText };
    if (piece.status === 'idea' && draftText.trim()) fields.status = 'drafting';
    await apply(fields);
    setEditingDraft(false);
  }

  async function handleExpandWithAi() {
    setExpanding(true);
    const result = await requestDraftExpansion(piece);
    setExpanding(false);
    setAiResult(result || { unavailable: true });
  }

  function acceptAiDraft() {
    setDraftText(aiResult.draft);
    setEditingDraft(true);
    setAiResult(null);
  }

  async function handleToggleFactChecked(value) {
    await apply({ fact_checked: value });
  }

  async function handleCycleStatus() {
    const i = STATUS_FLOW.indexOf(piece.status);
    const next = STATUS_FLOW[(i + 1) % STATUS_FLOW.length];
    await advanceStatus(id, next);
    if (next === 'published') {
      await initRepurposeSlots(id);
      handleRepurpose(true);
    }
    refresh();
  }

  async function handleRepurpose(isFirstPass = false) {
    setRepurposing(true);
    const result = await requestRepurposeDrafts(piece);
    setRepurposing(false);
    setRepurposeDrafts(result || { unavailable: true });
  }

  async function handleMarkRepurposed(itemId) {
    await markRepurposed(itemId);
    refresh();
  }

  async function openPicker() {
    const [t, i] = await Promise.all([listContentTemplates(), listContentIdeas()]);
    setTemplates(t);
    setIdeas(i.filter(idea => idea.id !== id));
    setPicking(true);
  }

  function pullFromTemplate(t) {
    setBriefForm({ ...briefForm, goal: t.prompt_text, trade_off: briefForm.trade_off, audience: briefForm.audience || t.use_for || '' });
    setEditingBrief(true);
    setPicking(false);
  }

  function pullFromIdea(i) {
    setBriefForm({
      ...briefForm,
      buyer_question: i.buyer_question || briefForm.buyer_question,
      audience: i.audience || briefForm.audience,
      funnel_stage: i.funnel_stage || briefForm.funnel_stage,
    });
    setEditingBrief(true);
    setPicking(false);
  }

  if (!piece) return null;

  return (
    <div className="stack" style={{ gap: 'var(--space-5)', maxWidth: 720 }}>
      <Button size="sm" variant="text" onClick={() => navigate('/business/content')}>← Back to Content</Button>

      <Card>
        {/* ---------- Header: title + status as a clickable property ---------- */}
        <div className="row-between" style={{ alignItems: 'flex-start' }}>
          {editingTitle ? (
            <div className="row" style={{ flex: 1, gap: 'var(--space-2)' }}>
              <input value={titleDraft} onChange={e => setTitleDraft(e.target.value)} autoFocus
                onKeyDown={e => e.key === 'Enter' && handleSaveTitle()}
                style={{ fontSize: 'var(--text-title)', fontFamily: 'var(--font-display)', fontWeight: 800, flex: 1 }} />
              <Button size="sm" onClick={handleSaveTitle}>Save</Button>
            </div>
          ) : (
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-title)', fontWeight: 800, cursor: 'text' }}
              onClick={() => setEditingTitle(true)}>{piece.title}</h1>
          )}
          <button onClick={handleCycleStatus} style={{
            background: 'none', border: `1.5px solid ${STATUS_TONE[piece.status]}`, color: STATUS_TONE[piece.status],
            borderRadius: 'var(--radius-pill)', padding: '4px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer', flexShrink: 0,
          }}>
            {STATUS_LABEL[piece.status]} →
          </button>
        </div>

        {/* ---------- Brief block ---------- */}
        <div style={{ marginTop: 'var(--space-5)' }}>
          <div className="row-between">
            <div className="section-label">Brief</div>
            <div className="row" style={{ gap: 'var(--space-2)' }}>
              <Button size="sm" variant="text" onClick={openPicker}>📥 Pull from Library</Button>
              <Button size="sm" variant="text" onClick={() => setEditingBrief(!editingBrief)}>{editingBrief ? 'Cancel' : 'Edit'}</Button>
            </div>
          </div>

          {editingBrief ? (
            <div className="stack" style={{ marginTop: 'var(--space-2)' }}>
              <input placeholder="Buyer question this answers" value={briefForm.buyer_question}
                onChange={e => setBriefForm({ ...briefForm, buyer_question: e.target.value })} />
              <div className="row" style={{ gap: 'var(--space-2)' }}>
                <input placeholder="Audience" value={briefForm.audience} onChange={e => setBriefForm({ ...briefForm, audience: e.target.value })} />
                <select value={briefForm.funnel_stage} onChange={e => setBriefForm({ ...briefForm, funnel_stage: e.target.value })}>
                  <option>Awareness</option><option>Consideration</option><option>Decision</option>
                </select>
              </div>
              <input placeholder="Goal — what should the reader walk away with?" value={briefForm.goal}
                onChange={e => setBriefForm({ ...briefForm, goal: e.target.value })} />
              <input placeholder="Trade-off — the one honest thing to acknowledge" value={briefForm.trade_off}
                onChange={e => setBriefForm({ ...briefForm, trade_off: e.target.value })} />
              <input placeholder="CTA" value={briefForm.cta} onChange={e => setBriefForm({ ...briefForm, cta: e.target.value })} />
              <div><Button size="sm" onClick={handleSaveBrief}>Save brief</Button></div>
            </div>
          ) : (
            <div className="stack" style={{ marginTop: 'var(--space-2)', fontSize: 13, gap: 4 }}>
              {piece.buyer_question && <div><strong>Question:</strong> {piece.buyer_question}</div>}
              <div className="muted">{piece.audience || 'No audience set'} · {piece.funnel_stage}</div>
              {piece.goal && <div><strong>Goal:</strong> {piece.goal}</div>}
              {piece.trade_off && <div><strong>Trade-off:</strong> {piece.trade_off}</div>}
              {piece.cta && <div><strong>CTA:</strong> {piece.cta}</div>}
              {!piece.buyer_question && !piece.goal && !piece.trade_off && <span className="muted">No brief yet — pull from the library or write one.</span>}
            </div>
          )}

          {picking && (
            <div style={{ marginTop: 'var(--space-3)', padding: 'var(--space-3)', background: 'var(--cream)', borderRadius: 'var(--radius-sm)' }}>
              <div className="row-between">
                <span className="muted" style={{ fontSize: 11 }}>Pull brief fields from...</span>
                <Button size="sm" variant="text" onClick={() => setPicking(false)}>Close</Button>
              </div>
              {templates.length === 0 && ideas.length === 0 ? (
                <div className="muted" style={{ fontSize: 12, marginTop: 6 }}>
                  Nothing to pull from yet — add a prompt tagged "Content Template" in Business → Library, or leave other pieces sitting as ideas.
                </div>
              ) : (
                <div className="stack" style={{ marginTop: 'var(--space-2)', gap: 6 }}>
                  {templates.map(t => (
                    <button key={t.id} className="sub-tab" style={{ fontSize: 12, textAlign: 'left', width: '100%' }} onClick={() => pullFromTemplate(t)}>
                      📄 {t.title}
                    </button>
                  ))}
                  {ideas.map(i => (
                    <button key={i.id} className="sub-tab" style={{ fontSize: 12, textAlign: 'left', width: '100%' }} onClick={() => pullFromIdea(i)}>
                      💡 {i.title}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ---------- Draft block ---------- */}
        <div style={{ marginTop: 'var(--space-5)' }}>
          <div className="row-between">
            <div className="section-label">Draft</div>
            <div className="row" style={{ gap: 'var(--space-2)' }}>
              <Button size="sm" variant="text" onClick={handleExpandWithAi} disabled={expanding}>{expanding ? '…' : '✨ Expand with AI'}</Button>
              <Button size="sm" variant="text" onClick={() => setEditingDraft(!editingDraft)}>{editingDraft ? 'Cancel' : 'Edit'}</Button>
            </div>
          </div>

          {aiResult && (
            <AiSuggestionBox unavailable={aiResult.unavailable} onDismiss={() => setAiResult(null)}>
              {!aiResult.unavailable && (
                <>
                  <div style={{ fontSize: 13, whiteSpace: 'pre-wrap' }}>{aiResult.draft}</div>
                  <div style={{ marginTop: 'var(--space-2)' }}><Button size="sm" onClick={acceptAiDraft}>Use this draft</Button></div>
                </>
              )}
            </AiSuggestionBox>
          )}

          {editingDraft ? (
            <div className="stack" style={{ marginTop: 'var(--space-2)' }}>
              <textarea value={draftText} onChange={e => setDraftText(e.target.value)} style={{ minHeight: 220, width: '100%' }} />
              <div><Button size="sm" onClick={handleSaveDraft}>Save draft</Button></div>
            </div>
          ) : (
            <div style={{ marginTop: 'var(--space-2)', fontSize: 14, whiteSpace: 'pre-wrap' }}>
              {piece.draft_body || <span className="muted" style={{ fontSize: 13 }}>No draft written yet.</span>}
            </div>
          )}
        </div>

        {/* ---------- Quality check block ---------- */}
        <div style={{ marginTop: 'var(--space-5)' }}>
          <div className="section-label">Quality check</div>
          <div style={{ marginTop: 'var(--space-2)' }}>
            <Checkbox checked={piece.fact_checked} onChange={handleToggleFactChecked} label="Fact-checked" />
          </div>
          <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>
            Before publishing: numbers and claims verified · brand voice matches (warm, educational, never pushy) · one clear CTA
          </div>
        </div>
      </Card>

      {/* ---------- Repurpose block — only once published ---------- */}
      {piece.status === 'published' && (
        <Card>
          <div className="row-between">
            <div className="section-label">Repurpose</div>
            <Button size="sm" variant="ghost" onClick={() => handleRepurpose()} disabled={repurposing}>
              {repurposing ? 'Drafting…' : '✨ Regenerate drafts'}
            </Button>
          </div>
          <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>
            {(piece.content_repurpose_items || []).filter(r => r.published).length} / {(piece.content_repurpose_items || []).length} formats published
          </div>
          <div className="stack" style={{ marginTop: 'var(--space-2)' }}>
            {(piece.content_repurpose_items || []).map(item => (
              <div key={item.id} className="row-between" style={{ fontSize: 12 }}>
                <span className="muted" style={{ textTransform: 'uppercase' }}>{item.format.replace('_', ' ')}</span>
                {item.published ? <span style={{ color: 'var(--success)' }}>✓ Published</span> : (
                  <Button size="sm" variant="text" onClick={() => handleMarkRepurposed(item.id)}>Mark published</Button>
                )}
              </div>
            ))}
          </div>
          {repurposeDrafts && (
            <AiSuggestionBox unavailable={repurposeDrafts.unavailable}>
              <div className="stack" style={{ gap: 'var(--space-2)' }}>
                {Object.entries(repurposeDrafts).filter(([k]) => k !== 'unavailable').map(([format, text]) => (
                  <div key={format}>
                    <div className="muted" style={{ fontSize: 11, textTransform: 'uppercase' }}>{format.replace('_', ' ')}</div>
                    <div style={{ fontSize: 13 }}>{text}</div>
                  </div>
                ))}
              </div>
            </AiSuggestionBox>
          )}
        </Card>
      )}
    </div>
  );
}
