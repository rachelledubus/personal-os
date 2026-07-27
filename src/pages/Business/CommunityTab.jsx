import React, { useEffect, useState } from 'react';
import Card from '../../components/ui/Card.jsx';
import Button from '../../components/ui/Button.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import {
  COMFORT_LADDER_LEVELS, COMMUNITY_CATEGORIES, listCommunityRelationships, addCommunityRelationship,
  updateCommunityRelationship, deleteCommunityRelationship, logEngagement,
} from '../../services/communityRelationships.js';

// ============================================================
// COMMUNITY — System 05C. Organizations and places, not people —
// deliberately separate from Relationships (Sphere/Professional
// Network), which are about individual contacts. A civic
// organization or a Facebook group isn't a "contact."
// ============================================================
export default function CommunityTab() {
  const [items, setItems] = useState([]);
  const [showLadder, setShowLadder] = useState(false);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ name: '', category: COMMUNITY_CATEGORIES[0], location: '', contact_person: '', website_social: '', how_connected: '', comfort_ladder_level: 1, notes: '' });

  async function refresh() { setItems(await listCommunityRelationships()); }
  useEffect(() => { refresh(); }, []);

  async function handleAdd() {
    if (!form.name.trim()) return;
    await addCommunityRelationship(form);
    setForm({ name: '', category: COMMUNITY_CATEGORIES[0], location: '', contact_person: '', website_social: '', how_connected: '', comfort_ladder_level: 1, notes: '' });
    setAdding(false);
    refresh();
  }

  async function handleLevelChange(item, level) {
    await updateCommunityRelationship(item.id, { comfort_ladder_level: level });
    refresh();
  }

  return (
    <div className="stack" style={{ gap: 'var(--space-4)' }}>
      <Card>
        <div className="row-between">
          <div className="section-label">The Community Comfort Ladder</div>
          <Button size="sm" variant="text" onClick={() => setShowLadder(!showLadder)}>{showLadder ? 'Hide' : 'Show'}</Button>
        </div>
        {showLadder && (
          <div className="stack" style={{ marginTop: 'var(--space-2)', gap: 4 }}>
            {COMFORT_LADDER_LEVELS.map(l => (
              <div key={l.level} style={{ fontSize: 'var(--text-small)' }}><strong>{l.level}. {l.label}</strong> — <span className="muted">{l.description}</span></div>
            ))}
          </div>
        )}
      </Card>

      <Card>
        <div className="row-between">
          <div className="section-label">Community relationships</div>
          <Button size="sm" variant="ghost" onClick={() => setAdding(!adding)}>{adding ? 'Cancel' : '+ Add'}</Button>
        </div>
        {adding && (
          <div className="stack" style={{ marginTop: 'var(--space-3)' }}>
            <input placeholder="Organization / group name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
            <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
              {COMMUNITY_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <input placeholder="Location" value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} />
            <input placeholder="Contact person (optional)" value={form.contact_person} onChange={e => setForm({ ...form, contact_person: e.target.value })} />
            <input placeholder="Website / social" value={form.website_social} onChange={e => setForm({ ...form, website_social: e.target.value })} />
            <input placeholder="How you connected" value={form.how_connected} onChange={e => setForm({ ...form, how_connected: e.target.value })} />
            <Button size="sm" onClick={handleAdd}>Add</Button>
          </div>
        )}

        {items.length === 0 ? <EmptyState icon="sparkles" title="No community relationships yet" subtitle="Choose depth over quantity — one primary commitment, one visibility channel, one service activity." /> : (
          <div className="stack" style={{ marginTop: 'var(--space-3)' }}>
            {items.map(item => (
              <div key={item.id} style={{ padding: '10px 0', borderBottom: '1px solid var(--sand)' }}>
                <div className="row-between">
                  <div>
                    <div style={{ fontWeight: 700 }}>{item.name}</div>
                    <div className="muted" style={{ fontSize: 'var(--text-caption)' }}>{item.category}{item.location ? ` · ${item.location}` : ''}</div>
                  </div>
                  <button className="row-remove-btn" aria-label="Remove" onClick={() => deleteCommunityRelationship(item.id).then(refresh)}>×</button>
                </div>
                <div className="row" style={{ marginTop: 6, gap: 'var(--space-2)', alignItems: 'center', flexWrap: 'wrap' }}>
                  <span className="muted" style={{ fontSize: 'var(--text-micro)' }}>Comfort level:</span>
                  <select value={item.comfort_ladder_level} onChange={e => handleLevelChange(item, Number(e.target.value))}>
                    {COMFORT_LADDER_LEVELS.map(l => <option key={l.level} value={l.level}>{l.level}. {l.label}</option>)}
                  </select>
                  <Button size="sm" variant="text" onClick={() => logEngagement(item.id).then(refresh)}>Log engagement today</Button>
                  {item.last_engaged_date && <span className="muted" style={{ fontSize: 'var(--text-micro)' }}>Last: {item.last_engaged_date}</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
