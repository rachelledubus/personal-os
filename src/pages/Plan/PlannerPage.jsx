import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Card from '../../components/ui/Card.jsx';
import Button from '../../components/ui/Button.jsx';
import { listTimeBlocks, addTimeBlock, deleteTimeBlock } from '../../services/timeBlocks.js';
import { todayStr } from '../../utils/date.js';
import EmptyState from '../../components/ui/EmptyState.jsx';
import Banner from '../../components/ui/Banner.jsx';
import ProjectsTab from './ProjectsTab.jsx';

const TABS = ['blocks', 'goals', 'meals'];
const TAB_LABELS = { blocks: 'Time Blocks', goals: 'Goals & Projects', meals: 'Meal Planner' };

export default function PlannerPage() {
  const { tab = 'blocks' } = useParams();
  const navigate = useNavigate();

  return (
    <div>
      <Banner slotKey="plan_banner" scene="plan" />
      <div className="page-title">📅 Plan</div>

      <div className="row" style={{ marginBottom: 'var(--space-4)', flexWrap: 'wrap' }}>
        {TABS.map(t => (
          <button
            key={t}
            className={`sub-tab ${tab === t ? 'active' : ''}`}
            onClick={() => t === 'meals' ? navigate('/plan/meals') : navigate(t === 'blocks' ? '/plan' : `/plan/${t}`)}
          >
            {TAB_LABELS[t]}
          </button>
        ))}
      </div>

      {tab === 'blocks' && <TimeBlocksTab />}
      {tab === 'goals' && <ProjectsTab />}
    </div>
  );
}

function TimeBlocksTab() {
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
    <Card>
      <div className="row-between">
        <div className="section-label">Time blocks</div>
        <input type="date" value={date} onChange={e => setDate(e.target.value)} />
      </div>

      <div className="stack" style={{ marginTop: 'var(--space-4)' }}>
        {blocks.length === 0 && <EmptyState icon="coffee" title="Nothing scheduled" subtitle="Add a block below, or let Today's schedule guide the day instead." />}
        {blocks.map(b => (
          <div key={b.id} className={`row-between planner-block track-${b.track}`}>
            <div>
              <div style={{ fontWeight: 700 }}>{b.title}</div>
              <div className="muted" style={{ fontSize: 12 }}>
                {b.start_time ? `${b.start_time}${b.end_time ? ' – ' + b.end_time : ''}` : 'No time set'}
                {b.tasks?.title && ' · linked task'}
                {b.auto_generated && ' · from Life Rhythm'}
              </div>
            </div>
            <button className="row-remove-btn" onClick={() => deleteTimeBlock(b.id).then(refresh)}>×</button>
          </div>
        ))}
      </div>

      <div className="row" style={{ marginTop: 'var(--space-4)', flexWrap: 'wrap' }}>
        <input placeholder="Block title" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
        <input type="time" value={form.start_time} onChange={e => setForm({ ...form, start_time: e.target.value })} />
        <input type="time" value={form.end_time} onChange={e => setForm({ ...form, end_time: e.target.value })} />
        <select value={form.track} onChange={e => setForm({ ...form, track: e.target.value })}>
          <option value="personal">Personal</option>
          <option value="business">Business</option>
        </select>
        <Button size="sm" onClick={handleAdd}>Add block</Button>
      </div>
    </Card>
  );
}
