import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Card from '../../components/ui/Card.jsx';
import Button from '../../components/ui/Button.jsx';
import { listTimeBlocks, addTimeBlock, deleteTimeBlock } from '../../services/timeBlocks.js';
import { todayStr } from '../../utils/date.js';
import EmptyState from '../../components/ui/EmptyState.jsx';
import './PlannerPage.css';

export default function PlannerPage() {
  const [date, setDate] = useState(todayStr());
  const [blocks, setBlocks] = useState([]);
  const [form, setForm] = useState({ title: '', start_time: '', end_time: '', track: 'personal' });

  useEffect(() => { refresh(); }, [date]);

  async function refresh() {
    setBlocks(await listTimeBlocks(date));
  }

  async function handleAdd() {
    if (!form.title.trim()) return;
    await addTimeBlock({ ...form, block_date: date });
    setForm({ title: '', start_time: '', end_time: '', track: 'personal' });
    refresh();
  }

  return (
    <div>
      <div className="page-title">📅 Plan</div>

      <div className="row" style={{ marginBottom: 'var(--space-4)' }}>
        <Link to="/plan/meals"><Button variant="ghost" size="sm">Meal Planner</Button></Link>
      </div>

      <Card>
        <div className="row-between">
          <div className="section-label">Time blocks</div>
          <input type="date" value={date} onChange={e => setDate(e.target.value)} style={{ maxWidth: 160 }} />
        </div>

        <div className="stack" style={{ marginTop: 'var(--space-4)' }}>
          {blocks.length === 0 && <EmptyState icon="coffee" title="Nothing scheduled" subtitle="Add a block below, or let the Mission Engine guide today instead." />}
          {blocks.map(b => (
            <div key={b.id} className={`row-between planner-block track-${b.track}`}>
              <div>
                <div style={{ fontWeight: 700 }}>{b.title}</div>
                <div className="muted" style={{ fontSize: 12 }}>
                  {b.start_time ? `${b.start_time}${b.end_time ? ' – ' + b.end_time : ''}` : 'No time set'}
                  {b.tasks?.title && ' · linked task'}
                </div>
              </div>
              <button className="row-remove-btn" onClick={() => deleteTimeBlock(b.id).then(refresh)}>×</button>
            </div>
          ))}
        </div>

        {/* Mobile fix: this used to be 5 inputs in a single flex-wrap
            row, which wrapped unpredictably on narrow screens. Now a
            deliberate responsive grid — 3 columns desktop, stacked on
            mobile — via PlannerPage.css. */}
        <div className="planner-add-form">
          <input placeholder="Block title" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
          <input type="time" value={form.start_time} onChange={e => setForm({ ...form, start_time: e.target.value })} />
          <input type="time" value={form.end_time} onChange={e => setForm({ ...form, end_time: e.target.value })} />
          <select value={form.track} onChange={e => setForm({ ...form, track: e.target.value })}>
            <option value="personal">Personal</option>
            <option value="business">Business</option>
          </select>
          <Button onClick={handleAdd}>Add block</Button>
        </div>
      </Card>
    </div>
  );
}
