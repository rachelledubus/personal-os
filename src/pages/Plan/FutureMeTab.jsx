import React, { useEffect, useState } from 'react';
import Card from '../../components/ui/Card.jsx';
import Button from '../../components/ui/Button.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import { todayStr } from '../../utils/date.js';
import { listFutureMeLetters, addFutureMeLetter, openFutureMeLetter, deleteFutureMeLetter } from '../../services/futureMe.js';

export default function FutureMeTab() {
  const [letters, setLetters] = useState([]);
  const [writing, setWriting] = useState(false);
  const [form, setForm] = useState({ title: '', content: '', reveal_date: '' });

  async function refresh() { setLetters(await listFutureMeLetters()); }
  useEffect(() => { refresh(); }, []);

  async function handleWrite() {
    if (!form.content.trim() || !form.reveal_date) return;
    await addFutureMeLetter(form);
    setForm({ title: '', content: '', reveal_date: '' });
    setWriting(false);
    refresh();
  }

  const today = todayStr();
  const ready = letters.filter(l => !l.opened && l.reveal_date <= today);
  const sealed = letters.filter(l => !l.opened && l.reveal_date > today);
  const opened = letters.filter(l => l.opened);

  return (
    <div className="stack" style={{ gap: 'var(--space-4)' }}>
      <Card>
        <div className="row-between">
          <div className="section-label">Write a letter to your future self</div>
          <Button size="sm" variant="ghost" onClick={() => setWriting(!writing)}>{writing ? 'Cancel' : '+ New letter'}</Button>
        </div>
        <p className="muted" style={{ fontSize: 'var(--text-caption)' }}>
          Sealed until the date you choose — write to whoever you'll be then, not who you are right now.
        </p>
        {writing && (
          <div className="stack" style={{ marginTop: 'var(--space-2)' }}>
            <input placeholder="Title (optional)" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
            <textarea placeholder="Dear future me..." value={form.content} onChange={e => setForm({ ...form, content: e.target.value })} style={{ minHeight: 160 }} />
            <label className="reset-field">
              <span>Reveal date</span>
              <input type="date" min={today} value={form.reveal_date} onChange={e => setForm({ ...form, reveal_date: e.target.value })} />
            </label>
            <div><Button size="sm" onClick={handleWrite}>Seal it</Button></div>
          </div>
        )}
      </Card>

      {ready.length > 0 && (
        <Card>
          <div className="section-label">Ready to open</div>
          <div className="stack" style={{ marginTop: 'var(--space-2)' }}>
            {ready.map(l => (
              <div key={l.id} style={{ padding: '10px 0', borderBottom: '1px solid var(--sand)' }}>
                <div className="row-between">
                  <div style={{ fontWeight: 700 }}>{l.title || 'Untitled letter'}</div>
                  <Button size="sm" onClick={() => openFutureMeLetter(l.id).then(refresh)}>Open it</Button>
                </div>
                <div className="muted" style={{ fontSize: 'var(--text-micro)' }}>Written {l.written_date} · sealed for {l.reveal_date}</div>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card>
        <div className="section-label">Still sealed</div>
        {sealed.length === 0 ? <EmptyState icon="sparkles" title="Nothing sealed right now" /> : (
          <div className="stack" style={{ marginTop: 'var(--space-2)' }}>
            {sealed.map(l => (
              <div key={l.id} className="row-between" style={{ padding: '8px 0', borderBottom: '1px solid var(--sand)' }}>
                <div>
                  <div style={{ fontWeight: 700 }}>{l.title || 'Untitled letter'}</div>
                  <div className="muted" style={{ fontSize: 'var(--text-micro)' }}>Opens {l.reveal_date}</div>
                </div>
                <button className="row-remove-btn" aria-label="Remove" onClick={() => deleteFutureMeLetter(l.id).then(refresh)}>×</button>
              </div>
            ))}
          </div>
        )}
      </Card>

      {opened.length > 0 && (
        <Card>
          <div className="section-label">Opened</div>
          <div className="stack" style={{ marginTop: 'var(--space-2)' }}>
            {opened.map(l => (
              <div key={l.id} style={{ padding: '10px 0', borderBottom: '1px solid var(--sand)' }}>
                <div style={{ fontWeight: 700 }}>{l.title || 'Untitled letter'}</div>
                <div className="muted" style={{ fontSize: 'var(--text-micro)', marginBottom: 4 }}>
                  Written {l.written_date} · opened {l.opened_at ? new Date(l.opened_at).toLocaleDateString() : ''}
                </div>
                <div style={{ fontSize: 'var(--text-small)', whiteSpace: 'pre-line' }}>{l.content}</div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
