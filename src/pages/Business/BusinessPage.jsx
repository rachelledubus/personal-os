import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import Card from '../../components/ui/Card.jsx';
import Button from '../../components/ui/Button.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import { listContacts, listPipelineDeals } from '../../services/contacts.js';
import { supabase } from '../../lib/supabaseClient.js';
import { FLOWS } from '../../services/flows.js';

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

function RoadmapTab() {
  const [items, setItems] = useState([]);
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data } = await supabase.from('roadmap_items').select('*').eq('user_id', user.id).order('sort_order');
      setItems(data || []);
    })();
  }, []);

  const phases = ['Foundation', 'Growth', 'Expansion'];
  return (
    <div className="stack">
      {phases.map(phase => (
        <Card key={phase}>
          <div className="section-label">{phase}</div>
          {items.filter(i => i.phase === phase).map(i => (
            <div key={i.id} className="row-between" style={{ padding: '6px 0' }}>
              <span>{i.title}</span>
              <span className="muted" style={{ fontSize: 11 }}>{i.status}</span>
            </div>
          ))}
        </Card>
      ))}
    </div>
  );
}
