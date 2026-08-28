import React, { useEffect, useState } from 'react';
import Card from '../../components/ui/Card.jsx';
import Button from '../../components/ui/Button.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import Badge, { contactStatusTone } from '../../components/ui/Badge.jsx';
import { listContacts, addContact, inferDefaultTier, importExpiredWithdrawnLeads, repairExpiredWithdrawnLeadImport } from '../../services/contacts.js';
import { getCategoryList, setCategoryList } from '../../services/settings.js';
import ContactProfilePanel from '../../components/business/ContactProfilePanel.jsx';

// ============================================================
// PIPELINE — the CRM, once and only once. `pipeline_deals` and
// `contacts` described the same opportunities as two systems; this is
// the one, grouped by stage, with the fields the real spreadsheet has
// and AI-drafted follow-ups so a next action never sits empty because
// writing it felt like a chore.
// ============================================================
export default
function PipelineTab() {
  const [contacts, setContacts] = useState([]);
  const [categories, setCategories] = useState(['Lead']);
  const [stages, setStages] = useState([]);
  const [sources, setSources] = useState([]);
  const [timelines, setTimelines] = useState([]);
  const [adding, setAdding] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importStatus, setImportStatus] = useState(null);
  const [form, setForm] = useState({ name: '', category: 'Lead', organization: '', preferred_contact_method: 'text', lead_stage: '', source: '', timeline: '' });
  const [selectedId, setSelectedId] = useState(null);
  const [filter, setFilter] = useState('All');
  const [dncFilter, setDncFilter] = useState('All');
  const [saveError, setSaveError] = useState(null);

  async function refresh() {
    setContacts(await listContacts());
    setCategories(await getCategoryList('pipeline_categories'));
    setStages(await getCategoryList('lead_stages'));
    setSources(await getCategoryList('lead_sources'));
    setTimelines(await getCategoryList('contact_timelines'));
  }
  useEffect(() => { refresh(); }, []);

  async function handleImportExpiredWithdrawn() {
    setImporting(true);
    setImportStatus(null);
    try {
      // The "Expired/Withdrawn/Cancelled Listing" source option is
      // stored per-user once the list's been saved before, so the
      // code-level default alone won't reach an already-initialized
      // account.
      const currentSources = await getCategoryList('lead_sources');
      if (!currentSources.includes('Expired/Withdrawn/Cancelled Listing')) {
        await setCategoryList('lead_sources', [...currentSources, 'Expired/Withdrawn/Cancelled Listing']);
      }
      const result = await importExpiredWithdrawnLeads();
      setImportStatus(result.imported === 0
        ? `Nothing new \u2014 all ${result.total} were already imported.`
        : `Imported ${result.imported} new lead${result.imported === 1 ? '' : 's'}${result.skipped > 0 ? ` (${result.skipped} already imported, skipped)` : ''}.`);
      refresh();
    } catch (err) {
      setImportStatus(`Couldn't import: ${err.message || err}`);
    }
    setImporting(false);
  }

  async function handleRepairImport() {
    setImporting(true);
    setImportStatus(null);
    try {
      const result = await repairExpiredWithdrawnLeadImport();
      setImportStatus(`Removed ${result.duplicatesRemoved} duplicate${result.duplicatesRemoved === 1 ? '' : 's'}, filled in address/status on ${result.backfilled} lead${result.backfilled === 1 ? '' : 's'}.`);
      refresh();
    } catch (err) {
      setImportStatus(`Couldn't repair: ${err.message || err}`);
    }
    setImporting(false);
  }

  async function handleAdd() {
    if (!form.name.trim()) return;
    setSaveError(null);
    try {
      await addContact({ ...form, lead_stage: form.lead_stage || null, source: form.source || null, timeline: form.timeline || null, relationship_tier: inferDefaultTier(form.category) });
    } catch (err) {
      setSaveError(err.message || 'Something went wrong saving this contact.');
      return;
    }
    setForm({ name: '', category: 'Lead', organization: '', preferred_contact_method: 'text', lead_stage: '', source: '', timeline: '' });
    setAdding(false);
    refresh();
  }

  const filtered = (filter === 'All' ? contacts : contacts.filter(c => c.category === filter))
    .filter(c => dncFilter === 'All' || (dncFilter === 'Checked' ? !!c.dnc_checked : !c.dnc_checked));
  const byCategory = {};
  filtered.forEach(c => { (byCategory[c.category] ||= []).push(c); });

  return (
    <div className="stack" style={{ gap: 'var(--space-4)' }}>
      <Card>
        <div className="row-between">
          <div className="section-label">Import expired/withdrawn listing leads</div>
          <div className="row" style={{ gap: 4 }}>
            <Button size="sm" variant="text" onClick={handleRepairImport} disabled={importing}>Fix duplicates / fill in fields</Button>
            <Button size="sm" variant="ghost" onClick={handleImportExpiredWithdrawn} disabled={importing}>
              {importing ? 'Importing…' : 'Import 50 leads'}
            </Button>
          </div>
        </div>
        <p className="muted" style={{ fontSize: 'var(--text-caption)', marginTop: 4 }}>
          From your SW Broward handwritten notes (8/25/2026). None have owner contact info yet — each lands as a Lead with property details in notes, ready to fill in as you research owners via bcpa.net or MLS records.
        </p>
        {importStatus && <div className="muted" style={{ fontSize: 'var(--text-micro)', marginTop: 4 }}>{importStatus}</div>}
      </Card>

      <Card>
        <div className="row-between">
          <div className="section-label">Pipeline</div>
          <Button size="sm" variant="ghost" onClick={() => setAdding(!adding)}>{adding ? 'Cancel' : '+ Add contact'}</Button>
        </div>

        {adding && (
          <div className="row" style={{ marginTop: 'var(--space-3)', flexWrap: 'wrap' }}>
            <input placeholder="Name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
            <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <input placeholder="Organization (optional)" value={form.organization} onChange={e => setForm({ ...form, organization: e.target.value })} />
            <select value={form.preferred_contact_method} onChange={e => setForm({ ...form, preferred_contact_method: e.target.value })}>
              <option value="text">Prefers text</option>
              <option value="email">Prefers email</option>
              <option value="call_scheduled">Scheduled calls only</option>
            </select>
            {['Lead', 'Future Client'].includes(form.category) && (
              <select value={form.lead_stage} onChange={e => setForm({ ...form, lead_stage: e.target.value })}>
                <option value="">No stage set</option>
                {stages.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            )}
            {['Lead', 'Future Client'].includes(form.category) && (
              <select value={form.source} onChange={e => setForm({ ...form, source: e.target.value })}>
                <option value="">Source unknown</option>
                {sources.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            )}
            {['Lead', 'Future Client'].includes(form.category) && (
              <select value={form.timeline} onChange={e => setForm({ ...form, timeline: e.target.value })}>
                <option value="">Timeline unknown</option>
                {timelines.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            )}
            <Button size="sm" onClick={handleAdd}>Save</Button>
            {saveError && <div style={{ fontSize: 'var(--text-caption)', color: 'var(--danger)', width: '100%' }}>{saveError}</div>}
          </div>
        )}

        <div className="row" style={{ marginTop: 'var(--space-3)', flexWrap: 'wrap', gap: 4 }}>
          {['All', ...categories].map(c => (
            <button key={c} className={`sub-tab ${filter === c ? 'active' : ''}`} style={{ fontSize: 'var(--text-micro)' }} onClick={() => { setFilter(c); if (c !== 'Lead') setDncFilter('All'); }}>{c}</button>
          ))}
        </div>

        {filter === 'Lead' && (
          <div className="row" style={{ marginTop: 'var(--space-2)', flexWrap: 'wrap', gap: 4 }}>
            <span className="muted" style={{ fontSize: 'var(--text-micro)', alignSelf: 'center' }}>DNC:</span>
            {['All', 'Checked', 'Not checked'].map(d => (
              <button key={d} className={`sub-tab ${dncFilter === d ? 'active' : ''}`} style={{ fontSize: 'var(--text-micro)' }} onClick={() => setDncFilter(d)}>{d}</button>
            ))}
          </div>
        )}
      </Card>

      {Object.keys(byCategory).length === 0 ? <EmptyState icon="coffee" title="Nothing here yet" /> : (
        Object.entries(byCategory).map(([cat, list]) => (
          <Card key={cat}>
            <div className="section-label">{cat} · {list.length}</div>
            <div className="stack" style={{ marginTop: 'var(--space-2)' }}>
              {list.map(c => (
                <div key={c.id} className="row-between" style={{ borderBottom: '1px solid var(--sand)', padding: '8px 0', cursor: 'pointer' }} onClick={() => setSelectedId(c.id)}>
                  <div>
                    <div style={{ fontWeight: 700 }}>
                      {c.name}{c.organization && <span className="muted" style={{ fontWeight: 400 }}> · {c.organization}</span>}
                      {c.lead_stage && <span className="muted" style={{ fontWeight: 400 }}> · {c.lead_stage}</span>}
                    </div>
                    {c.listing_status && <div className="muted" style={{ fontSize: 'var(--text-micro)', fontWeight: 700 }}>{c.listing_status}</div>}
                    <div className="muted" style={{ fontSize: 'var(--text-caption)' }}>{c.next_action || 'No next action set'}</div>
                  </div>
                  <Badge tone={contactStatusTone(c.status)}>{c.status}</Badge>
                </div>
              ))}
            </div>
          </Card>
        ))
      )}

      <ContactProfilePanel contactId={selectedId} onClose={() => setSelectedId(null)} onUpdated={refresh} />
    </div>
  );
}
