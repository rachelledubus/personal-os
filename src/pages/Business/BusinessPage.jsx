import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import Card from '../../components/ui/Card.jsx';
import Button from '../../components/ui/Button.jsx';
import Checkbox from '../../components/ui/Checkbox.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import { listContacts, listPipelineDeals } from '../../services/contacts.js';
import { supabase } from '../../lib/supabaseClient.js';
import { FLOWS } from '../../services/flows.js';
import { listMilestones, addMilestone, toggleMilestone, updateRoadmapLink } from '../../services/goals.js';

const TABS = ['contacts', 'pipeline', 'flows', 'roadmap'];

export default function BusinessPage() {
  const { tab = 'contacts' } = useParams();
  const navigate = useNavigate();

  return (
    <div>
      <div className="page-title">💼 Business</div>

      <div className="row" style={{ marginBottom: 'var(--space-4)', flexWrap: 'wrap' }}>
        {TABS.map(t => (
          <button key={t} className={`sub-tab ${tab === t ? 'active' : ''}`} onClick={() => navigate(`/business/${t}`)}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {tab === 'contacts' && <ContactsTab />}
      {tab === 'pipeline' && <PipelineTab />}
      {tab === 'flows' && <FlowsTab />}
      {tab === 'roadmap' && <RoadmapTab />}
    </div>
  );
}

function ContactsTab() {
  const [contacts, setContacts] = useState([]);
  useEffect(() => { listContacts().then(setContacts); }, []);

  return (
    <Card>
      <div className="row-between">
        <div className="section-label">Contacts</div>
        <Link to="/business/flows/new_lead_intake"><Button size="sm">+ New lead</Button></Link>
      </div>
      {contacts.length === 0 ? <EmptyState icon="coffee" title="No contacts yet" /> : (
        <div className="stack">
          {contacts.map(c => (
            <div key={c.id} className="row-between" style={{ padding: '8px 0', borderBottom: '1px solid var(--sand)' }}>
              <div>
                <div style={{ fontWeight: 700 }}>{c.name}</div>
                <div className="muted" style={{ fontSize: 12 }}>{c.category} · {c.next_action || 'No next action set'}</div>
              </div>
              <Link to={`/business/flows/consultation?contact=${c.id}`}>
                <Button size="sm" variant="ghost">Consultation</Button>
              </Link>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

function PipelineTab() {
  const [deals, setDeals] = useState([]);
  useEffect(() => { listPipelineDeals().then(setDeals); }, []);
  return (
    <Card>
      <div className="section-label">Pipeline</div>
      {deals.length === 0 ? <EmptyState icon="leaf" title="No deals yet" /> : (
        <div className="stack">
          {deals.map(d => (
            <div key={d.id} className="row-between" style={{ padding: '8px 0', borderBottom: '1px solid var(--sand)' }}>
              <span>{d.client_name}</span>
              <span className="muted" style={{ fontSize: 12 }}>{d.stage}</span>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

function FlowsTab() {
  return (
    <div className="stack">
      {Object.entries(FLOWS).map(([key, flow]) => (
        <Card key={key}>
          <div className="row-between">
            <div>
              <div style={{ fontWeight: 700 }}>{flow.label}</div>
              <div className="muted" style={{ fontSize: 12 }}>{flow.description}</div>
            </div>
            <Link to={`/business/flows/${key}`}><Button size="sm">Start</Button></Link>
          </div>
        </Card>
      ))}
    </div>
  );
}

// Common internal destinations a roadmap item might link to — kept as
// a short picklist so linking stays one click instead of typing a
// path from memory.
const LINK_OPTIONS = [
  { label: 'Business → Contacts', value: '/business/contacts' },
  { label: 'Business → Pipeline', value: '/business/pipeline' },
  { label: 'Business → Flows', value: '/business/flows' },
  { label: 'Plan → Goals & Projects', value: '/plan/goals' },
  { label: 'Library → Reference', value: '/library/reference' },
  { label: 'Library → Documents', value: '/library/documents' },
];

function RoadmapTab() {
  const [items, setItems] = useState([]);
  const [expanded, setExpanded] = useState(null);
  useEffect(() => { load(); }, []);

  async function load() {
    const { data: { user } } = await supabase.auth.getUser();
    const { data } = await supabase.from('roadmap_items').select('*').eq('user_id', user.id).order('sort_order');
    setItems(data || []);
  }

  const phases = ['Foundation', 'Growth', 'Expansion'];
  return (
    <div className="stack">
      {phases.map(phase => (
        <Card key={phase}>
          <div className="section-label">{phase}</div>
          <div className="stack" style={{ marginTop: 'var(--space-2)' }}>
            {items.filter(i => i.phase === phase).map(i => (
              <RoadmapRow
                key={i.id}
                item={i}
                expanded={expanded === i.id}
                onToggleExpand={() => setExpanded(expanded === i.id ? null : i.id)}
                onLinked={load}
              />
            ))}
          </div>
        </Card>
      ))}
    </div>
  );
}

function RoadmapRow({ item, expanded, onToggleExpand, onLinked }) {
  const [subtasks, setSubtasks] = useState([]);
  const [newSubtask, setNewSubtask] = useState('');
  const [pickingLink, setPickingLink] = useState(false);

  useEffect(() => {
    if (!expanded) return;
    listMilestones({ roadmapId: item.id }).then(setSubtasks);
  }, [expanded, item.id]);

  async function handleAddSubtask() {
    if (!newSubtask.trim()) return;
    await addMilestone({ roadmap_item_id: item.id, title: newSubtask.trim(), sort_order: subtasks.length });
    setNewSubtask('');
    setSubtasks(await listMilestones({ roadmapId: item.id }));
  }

  async function handleSetLink(url) {
    await updateRoadmapLink(item.id, url);
    setPickingLink(false);
    onLinked();
  }

  const doneCount = subtasks.filter(s => s.completed).length;

  return (
    <div className="planner-block">
      <div className="row-between">
        <div style={{ cursor: 'pointer', flex: 1 }} onClick={onToggleExpand}>
          <span>{item.title}</span>
          {subtasks.length > 0 && <span className="muted" style={{ fontSize: 11 }}> · {doneCount}/{subtasks.length} sub-tasks</span>}
        </div>
        <div className="row" style={{ gap: 'var(--space-2)' }}>
          {item.link_to && (
            <Link to={item.link_to}><Button size="sm" variant="ghost">Open →</Button></Link>
          )}
          <span className="muted" style={{ fontSize: 11 }}>{item.status}</span>
        </div>
      </div>

      {expanded && (
        <div style={{ marginTop: 'var(--space-3)' }} onClick={e => e.stopPropagation()}>
          {!item.link_to && !pickingLink && (
            <Button size="sm" variant="text" onClick={() => setPickingLink(true)}>+ Link this to a page</Button>
          )}
          {pickingLink && (
            <div className="row" style={{ flexWrap: 'wrap', gap: 'var(--space-2)' }}>
              {LINK_OPTIONS.map(opt => (
                <Button key={opt.value} size="sm" variant="ghost" onClick={() => handleSetLink(opt.value)}>{opt.label}</Button>
              ))}
            </div>
          )}
          {item.link_to && (
            <Button size="sm" variant="text" onClick={() => setPickingLink(true)}>Change link</Button>
          )}

          <div className="stack" style={{ marginTop: 'var(--space-3)' }}>
            {subtasks.map(s => (
              <Checkbox key={s.id} checked={s.completed}
                onChange={v => toggleMilestone(s.id, v).then(() => listMilestones({ roadmapId: item.id }).then(setSubtasks))}
                label={s.title} />
            ))}
          </div>
          <div className="row" style={{ marginTop: 'var(--space-2)' }}>
            <input placeholder="Break this into a sub-task..." value={newSubtask} onChange={e => setNewSubtask(e.target.value)} />
            <Button size="sm" variant="ghost" onClick={handleAddSubtask}>+ Add</Button>
          </div>
        </div>
      )}
    </div>
  );
}
