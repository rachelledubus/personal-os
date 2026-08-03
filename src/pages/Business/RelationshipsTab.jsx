import React, { useEffect, useState } from 'react';
import Card from '../../components/ui/Card.jsx';
import Button from '../../components/ui/Button.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import { listContacts, listByTier, autoTagUntieredContacts } from '../../services/contacts.js';
import ContactProfilePanel from '../../components/business/ContactProfilePanel.jsx';
import { RELATIONSHIP_ENERGY_SCALE, DAILY_CONVERSATION_ROUTINE } from '../../services/library.js';

// ============================================================
// RELATIONSHIPS — replaces what would have been three separate pages
// (Sphere / Community / Professional Network). Same contact list,
// same one CRM, filtered by tier — because that's all those three
// systems ever actually were.
// ============================================================
const TIERS = [
  { key: 'Tier 1 - Core', label: 'Tier 1 — Core', cadence: 'Monthly touch' },
  { key: 'Tier 2 - Developing', label: 'Tier 2 — Developing', cadence: 'Every 60-90 days' },
  { key: 'Tier 3 - Strategic', label: 'Tier 3 — Strategic (Professional)', cadence: 'Quarterly' },
];

export default
function RelationshipsTab() {
  const [byTier, setByTier] = useState({});
  const [untiered, setUntiered] = useState([]);
  const [tagging, setTagging] = useState(false);
  const [showRoutine, setShowRoutine] = useState(false);
  const [selectedId, setSelectedId] = useState(null);

  async function refresh() {
    const [t1, t2, t3, all] = await Promise.all([
      listByTier('Tier 1 - Core'), listByTier('Tier 2 - Developing'), listByTier('Tier 3 - Strategic'), listContacts(),
    ]);
    setByTier({ 'Tier 1 - Core': t1, 'Tier 2 - Developing': t2, 'Tier 3 - Strategic': t3 });
    setUntiered(all.filter(c => !c.relationship_tier && ['Sphere', 'Partner', 'Agent Referral'].includes(c.category)));
  }
  useEffect(() => { refresh(); }, []);

  async function handleAutoTag() {
    setTagging(true);
    await autoTagUntieredContacts();
    setTagging(false);
    refresh();
  }

  return (
    <div className="stack" style={{ gap: 'var(--space-4)' }}>
      <Card>
        <div className="row-between">
          <div className="section-label">Daily conversation routine</div>
          <Button size="sm" variant="text" onClick={() => setShowRoutine(!showRoutine)}>{showRoutine ? 'Hide' : 'Show'}</Button>
        </div>
        {showRoutine && (
          <div className="stack" style={{ marginTop: 'var(--space-2)', gap: 10 }}>
            <div className="stack" style={{ gap: 4 }}>
              {DAILY_CONVERSATION_ROUTINE.map(v => (
                <div key={v.version} style={{ fontSize: 'var(--text-small)' }}>
                  <strong>{v.version} ({v.time}):</strong> <span className="muted">{v.includes}</span>
                </div>
              ))}
            </div>
            <div className="muted" style={{ fontSize: 'var(--text-micro)', textTransform: 'uppercase', marginTop: 4 }}>Relationship energy scale</div>
            {RELATIONSHIP_ENERGY_SCALE.map(l => (
              <div key={l.level} style={{ fontSize: 'var(--text-small)' }}>
                <strong>{l.level}:</strong> <span className="muted">{l.actions} — {l.goal}</span>
              </div>
            ))}
          </div>
        )}
      </Card>

      {untiered.length > 0 && (
        <Card className="track-personal">
          <div className="row-between">
            <div style={{ fontSize: 'var(--text-small)' }}>{untiered.length} contact{untiered.length === 1 ? '' : 's'} without a relationship tier — Sphere defaults to Tier 2, Partner/Agent Referral default to Tier 3.</div>
            <Button size="sm" onClick={handleAutoTag} disabled={tagging}>{tagging ? 'Tagging…' : 'Auto-tag all'}</Button>
          </div>
        </Card>
      )}

      {TIERS.map((t, i) => (
        <Card key={t.key}>
          <div className="row-between">
            <div className="section-label">{t.label}</div>
            <span className="muted" style={{ fontSize: 'var(--text-micro)' }}>{t.cadence}</span>
          </div>
          {(byTier[t.key] || []).length === 0 ? <EmptyState icon="sparkles" title="Nobody tagged to this tier yet" /> : (
            <div className="stack" style={{ marginTop: 'var(--space-2)' }}>
              {byTier[t.key].map(c => (
                <div key={c.id} className="row-between" style={{ fontSize: 'var(--text-small)', cursor: 'pointer', padding: '4px 0', borderBottom: '1px solid var(--sand)' }}
                  onClick={() => setSelectedId(c.id)}>
                  <span>{c.name}</span>
                  <span className="muted" style={{ fontSize: 'var(--text-micro)' }}>{c.last_contact_date ? `Last: ${c.last_contact_date}` : 'No contact logged'}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      ))}

      <ContactProfilePanel contactId={selectedId} onClose={() => setSelectedId(null)} onUpdated={refresh} />
    </div>
  );
}
