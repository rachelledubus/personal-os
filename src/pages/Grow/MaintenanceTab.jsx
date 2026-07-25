import React, { useEffect, useState } from 'react';
import Card from '../../components/ui/Card.jsx';
import Button from '../../components/ui/Button.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import { todayStr } from '../../utils/date.js';
import { listMaintenanceItems, addMaintenanceItem, completeMaintenanceItem, getPatternSuggestions } from '../../services/maintenance.js';

export default function MaintenanceTab() {
  const [items, setItems] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [form, setForm] = useState({ title: '', area: 'home', interval_days: '', next_due_date: '' });

  async function refresh() {
    setItems(await listMaintenanceItems());
    setSuggestions(await getPatternSuggestions());
  }
  useEffect(() => { refresh(); }, []);

  async function handleAdd() {
    if (!form.title.trim()) return;
    await addMaintenanceItem({
      title: form.title.trim(),
      area: form.area,
      interval_days: form.interval_days ? Number(form.interval_days) : null,
      next_due_date: form.next_due_date || null,
    });
    setForm({ title: '', area: 'home', interval_days: '', next_due_date: '' });
    refresh();
  }

  const today = todayStr();

  return (
    <div className="stack" style={{ gap: 'var(--space-4)' }}>
      {suggestions.map((s, i) => (
        <Card key={i} className="track-personal">
          <div className="row-between">
            <div style={{ fontSize: 'var(--text-small)' }}>{s.suggestion}</div>
            <Button size="sm" variant="ghost" onClick={() => {
              addMaintenanceItem({ title: s.title, area: 'other', interval_days: 7 }).then(refresh);
            }}>Add reminder</Button>
          </div>
        </Card>
      ))}

      <Card>
        <div className="section-label">Maintenance & reminders</div>
        {items.length === 0 ? <EmptyState icon="leaf" title="Nothing tracked yet" /> : (
          <div className="stack" style={{ marginTop: 'var(--space-3)' }}>
            {items.map(i => (
              <div key={i.id} className="row-between" style={{ padding: '8px 0', borderBottom: '1px solid var(--sand)' }}>
                <div>
                  <div style={{ fontWeight: 700 }}>{i.title}</div>
                  <div className="muted" style={{ fontSize: 'var(--text-caption)' }}>
                    {i.area} {i.next_due_date && `· due ${i.next_due_date}`}
                    {i.next_due_date && i.next_due_date <= today && ' · due now'}
                  </div>
                </div>
                <Button size="sm" variant="ghost" onClick={() => completeMaintenanceItem(i.id).then(refresh)}>Done</Button>
              </div>
            ))}
          </div>
        )}

        <div className="row" style={{ marginTop: 'var(--space-4)', flexWrap: 'wrap' }}>
          <input placeholder="Title" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
          <select value={form.area} onChange={e => setForm({ ...form, area: e.target.value })}>
            <option value="home">Home</option>
            <option value="personal">Personal</option>
            <option value="health">Health</option>
            <option value="pet">Pet</option>
            <option value="vehicle">Vehicle</option>
            <option value="finance">Finance</option>
            <option value="other">Other</option>
          </select>
          <input type="date" value={form.next_due_date} onChange={e => setForm({ ...form, next_due_date: e.target.value })} />
          <input type="number" placeholder="Repeat every N days" value={form.interval_days} onChange={e => setForm({ ...form, interval_days: e.target.value })} style={{ width: 160 }} />
          <Button size="sm" onClick={handleAdd}>+ Add</Button>
        </div>
      </Card>
    </div>
  );
}
