import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Card from '../../components/ui/Card.jsx';
import Button from '../../components/ui/Button.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import { listContentPieces, addContentPiece } from '../../services/contentEngine.js';
import { getCategoryList } from '../../services/settings.js';
import { getAutonomyLevel } from '../../services/aiOperator.js';

// ============================================================
// CONTENT — the real Brief -> Repurpose pipeline (System 03), with AI
// drafting the 5 derivative formats instead of you writing each by hand.
// ============================================================
export default
function ContentTab() {
  const [pieces, setPieces] = useState([]);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ title: '', buyer_question: '', audience: '', pillar: '', content_type: '', funnel_stage: 'Awareness' });
  const [autonomy, setAutonomy] = useState('confirm');
  const [pillars, setPillars] = useState([]);
  const [audiences, setAudiences] = useState([]);
  const [contentTypes, setContentTypes] = useState([]);

  async function refresh() { setPieces(await listContentPieces()); }
  useEffect(() => {
    refresh();
    getAutonomyLevel().then(setAutonomy);
    getCategoryList('content_pillars').then(setPillars);
    getCategoryList('content_audiences').then(setAudiences);
    getCategoryList('content_types').then(setContentTypes);
  }, []);

  async function handleAdd() {
    if (!form.title.trim()) return;
    await addContentPiece(form);
    setForm({ title: '', buyer_question: '', audience: '', pillar: '', content_type: '', funnel_stage: 'Awareness' });
    setAdding(false);
    refresh();
  }

  const COLUMNS = [
    { key: 'idea', label: 'Idea' },
    { key: 'drafting', label: 'Drafting' },
    { key: 'published', label: 'Published' },
  ];

  return (
    <div className="stack" style={{ gap: 'var(--space-4)' }}>
      <Card>
        <div className="row-between">
          <div className="section-label">Content pipeline</div>
          <Button size="sm" variant="ghost" onClick={() => setAdding(!adding)}>{adding ? 'Cancel' : '+ New idea'}</Button>
        </div>
        {autonomy === 'auto' && <div className="muted" style={{ fontSize: 'var(--text-micro)', marginTop: 4 }}>✨ Auto-repurposing enabled — publishing marks all formats done automatically</div>}
        {adding && (
          <div className="row" style={{ marginTop: 'var(--space-3)', flexWrap: 'wrap' }}>
            <input placeholder="Title" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
            <input placeholder="Buyer question this answers" value={form.buyer_question} onChange={e => setForm({ ...form, buyer_question: e.target.value })} />
            <select value={form.audience} onChange={e => setForm({ ...form, audience: e.target.value })}>
              <option value="">No audience set</option>
              {audiences.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
            <select value={form.pillar} onChange={e => setForm({ ...form, pillar: e.target.value })}>
              <option value="">No pillar set</option>
              {pillars.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
            <select value={form.content_type} onChange={e => setForm({ ...form, content_type: e.target.value })}>
              <option value="">No content type set</option>
              {contentTypes.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <select value={form.funnel_stage} onChange={e => setForm({ ...form, funnel_stage: e.target.value })}>
              <option>Awareness</option><option>Consideration</option><option>Decision</option>
            </select>
            <Button size="sm" onClick={handleAdd}>Add</Button>
          </div>
        )}
      </Card>

      {pieces.length > 0 && pillars.length > 0 && (
        <Card>
          <div className="section-label" style={{ fontSize: 'var(--text-caption)' }}>Pillar coverage</div>
          <div className="row" style={{ flexWrap: 'wrap', gap: 8, marginTop: 'var(--space-2)' }}>
            {pillars.map(pillar => {
              const count = pieces.filter(p => p.pillar === pillar).length;
              return (
                <div key={pillar} className="muted" style={{ fontSize: 'var(--text-caption)', border: '1px solid var(--sand)', borderRadius: 'var(--radius-pill)', padding: '4px 10px' }}>
                  {pillar}: {count}
                </div>
              );
            })}
            {pieces.some(p => !p.pillar) && (
              <div className="muted" style={{ fontSize: 'var(--text-caption)', border: '1px dashed var(--sand)', borderRadius: 'var(--radius-pill)', padding: '4px 10px' }}>
                No pillar: {pieces.filter(p => !p.pillar).length}
              </div>
            )}
          </div>
        </Card>
      )}

      {pieces.length === 0 ? <EmptyState icon="megaphone" title="No content in the pipeline yet" /> : (
        <div className="row" style={{ alignItems: 'flex-start', gap: 'var(--space-3)', overflowX: 'auto' }}>
          {COLUMNS.map(col => {
            const items = pieces.filter(p => p.status === col.key);
            return (
              <div key={col.key} style={{ flex: '1 1 0', minWidth: 200 }}>
                <div className="muted" style={{ fontSize: 'var(--text-micro)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>
                  {col.label} · {items.length}
                </div>
                <div className="stack" style={{ gap: 'var(--space-2)' }}>
                  {items.map(p => (
                    <Link key={p.id} to={`/business/content/${p.id}`} style={{ textDecoration: 'none' }}>
                      <div className="planner-block track-business" style={{ cursor: 'pointer' }}>
                        <div style={{ fontWeight: 700, fontSize: 'var(--text-compact)' }}>{p.title}</div>
                        <div className="muted" style={{ fontSize: 'var(--text-caption)', marginTop: 2 }}>{p.audience || 'No audience set'}</div>
                        {p.pillar && <div className="faint" style={{ fontSize: 'var(--text-micro)' }}>{p.pillar}</div>}
                        {col.key === 'published' && (
                          <div className="muted" style={{ fontSize: 'var(--text-micro)', marginTop: 4 }}>
                            {(p.content_repurpose_items || []).filter(r => r.published).length}/{(p.content_repurpose_items || []).length} repurposed
                          </div>
                        )}
                      </div>
                    </Link>
                  ))}
                  {items.length === 0 && <div className="muted" style={{ fontSize: 'var(--text-caption)' }}>Nothing here</div>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
