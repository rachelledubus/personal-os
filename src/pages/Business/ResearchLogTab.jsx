import React, { useEffect, useState } from 'react';
import Card from '../../components/ui/Card.jsx';
import Button from '../../components/ui/Button.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import {
  OUTPUT_TYPE_LABELS, OUTPUT_TYPE_FIELDS, listResearchOutputs, addResearchOutput, deleteResearchOutput,
} from '../../services/researchOutputs.js';

// ============================================================
// RESEARCH LOG — System 06. Research without a saved output is
// exactly what the manual warns against ("creating reports nobody
// reads"). Three real output shapes, not a generic notes field.
// ============================================================
export default function ResearchLogTab() {
  const [outputType, setOutputType] = useState('intelligence_report');
  const [outputs, setOutputs] = useState([]);
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState({});

  async function refresh() { setOutputs(await listResearchOutputs(outputType)); }
  useEffect(() => { refresh(); setContent({}); }, [outputType]);

  async function handleAdd() {
    if (!title.trim()) return;
    await addResearchOutput(outputType, title.trim(), content);
    setTitle('');
    setContent({});
    setAdding(false);
    refresh();
  }

  return (
    <div className="stack" style={{ gap: 'var(--space-4)' }}>
      <div className="row" style={{ gap: 4 }}>
        {Object.entries(OUTPUT_TYPE_LABELS).map(([key, label]) => (
          <button key={key} className={`sub-tab ${outputType === key ? 'active' : ''}`} onClick={() => setOutputType(key)}>{label}</button>
        ))}
      </div>

      <Card>
        <div className="row-between">
          <div className="section-label">{OUTPUT_TYPE_LABELS[outputType]}</div>
          <Button size="sm" variant="ghost" onClick={() => setAdding(!adding)}>{adding ? 'Cancel' : '+ New'}</Button>
        </div>
        {adding && (
          <div className="stack" style={{ marginTop: 'var(--space-3)' }}>
            <input placeholder="Title" value={title} onChange={e => setTitle(e.target.value)} />
            {OUTPUT_TYPE_FIELDS[outputType].map(f => (
              <textarea
                key={f.key}
                placeholder={f.label}
                value={content[f.key] || ''}
                onChange={e => setContent({ ...content, [f.key]: e.target.value })}
                style={{ minHeight: 60 }}
              />
            ))}
            <div><Button size="sm" onClick={handleAdd}>Save</Button></div>
          </div>
        )}

        {outputs.length === 0 ? <EmptyState icon="sparkles" title="Nothing logged yet" /> : (
          <div className="stack" style={{ marginTop: 'var(--space-3)' }}>
            {outputs.map(o => (
              <div key={o.id} style={{ padding: '10px 0', borderBottom: '1px solid var(--sand)' }}>
                <div className="row-between">
                  <div style={{ fontWeight: 700 }}>{o.title}</div>
                  <button className="row-remove-btn" aria-label="Remove" onClick={() => deleteResearchOutput(o.id).then(refresh)}>×</button>
                </div>
                <div className="muted" style={{ fontSize: 'var(--text-micro)', marginBottom: 4 }}>{new Date(o.created_at).toLocaleDateString()}</div>
                {OUTPUT_TYPE_FIELDS[outputType].map(f => o.content?.[f.key] && (
                  <div key={f.key} style={{ fontSize: 'var(--text-small)', marginTop: 2 }}><strong>{f.label}:</strong> {o.content[f.key]}</div>
                ))}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
