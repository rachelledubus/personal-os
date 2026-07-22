import React, { useEffect, useState } from 'react';
import Card from '../../components/ui/Card.jsx';
import Button from '../../components/ui/Button.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import {
  CATEGORY_LISTS, getCategoryList, setCategoryList,
  FEATURE_FLAGS, getAllFeatureFlags, setFeatureFlag,
  getCustomAiInstructions, setCustomAiInstructions,
  getRunningChibiVariant, setRunningChibiVariant,
  getSleepTargets, setSleepTargets,
} from '../../services/settings.js';
import { CHIBI_VARIANTS, ChibiPreview } from '../../components/ui/RunningChibi.jsx';
import { listAssetSlots, setAssetSlot } from '../../services/assets.js';
import { getAutonomyLevel, setAutonomyLevel } from '../../services/aiOperator.js';
import { listDevLog, listDecisions, addDecision, getSystemStatus, generateHandoff } from '../../services/devMemory.js';
import { exportAllData, downloadAsFile } from '../../services/dataExport.js';

const SECTIONS = ['categories', 'appearance', 'features', 'ai', 'memory', 'data'];
const SECTION_LABELS = {
  categories: 'Categories', appearance: 'Appearance', features: 'Feature Toggles',
  ai: 'AI Settings', memory: 'Development Memory', data: 'Data',
};

export default function ControlCenterPage() {
  const [section, setSection] = useState('categories');

  return (
    <div>
      <div className="page-title">🛠️ Control Center</div>
      <p className="muted" style={{ marginBottom: 'var(--space-4)' }}>
        The backstage area — adjust your system yourself instead of asking for a code change.
      </p>
      <div className="row" style={{ marginBottom: 'var(--space-4)', flexWrap: 'wrap' }}>
        {SECTIONS.map(s => (
          <button key={s} className={`sub-tab ${section === s ? 'active' : ''}`} onClick={() => setSection(s)}>
            {SECTION_LABELS[s]}
          </button>
        ))}
      </div>

      {section === 'categories' && <CategoriesSection />}
      {section === 'appearance' && <AppearanceSection />}
      {section === 'features' && <FeaturesSection />}
      {section === 'ai' && <AiSection />}
      {section === 'memory' && <MemorySection />}
      {section === 'data' && <DataSection />}
    </div>
  );
}

function CategoriesSection() {
  const [lists, setLists] = useState({});
  const [newItem, setNewItem] = useState({});

  async function refresh() {
    const entries = await Promise.all(
      Object.keys(CATEGORY_LISTS).map(async key => [key, await getCategoryList(key)])
    );
    setLists(Object.fromEntries(entries));
  }
  useEffect(() => { refresh(); }, []);

  async function handleAdd(listKey) {
    const value = (newItem[listKey] || '').trim();
    if (!value) return;
    const updated = [...(lists[listKey] || []), value];
    await setCategoryList(listKey, updated);
    setNewItem({ ...newItem, [listKey]: '' });
    refresh();
  }

  async function handleRemove(listKey, item) {
    const updated = (lists[listKey] || []).filter(i => i !== item);
    await setCategoryList(listKey, updated);
    refresh();
  }

  return (
    <div className="stack" style={{ gap: 'var(--space-4)' }}>
      <p className="muted" style={{ fontSize: 12 }}>
        These lists back genuinely free-text fields — safe to add, rename (remove + re-add), or delete.
        A few things that look like "categories" elsewhere (capture types, relationship tiers, content status)
        are controlled vocabularies the app's logic depends on, and aren't editable here on purpose.
      </p>
      {Object.entries(CATEGORY_LISTS).map(([key, meta]) => (
        <Card key={key}>
          <div className="section-label">{meta.label}</div>
          <div className="row" style={{ flexWrap: 'wrap', gap: 6, marginTop: 'var(--space-2)' }}>
            {(lists[key] || []).map(item => (
              <span key={item} className="capture-type-chip active" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                {item}
                <button onClick={() => handleRemove(key, item)} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', padding: 0 }}>×</button>
              </span>
            ))}
          </div>
          <div className="row" style={{ marginTop: 'var(--space-3)' }}>
            <input placeholder="Add an option..." value={newItem[key] || ''} onChange={e => setNewItem({ ...newItem, [key]: e.target.value })}
              onKeyDown={e => e.key === 'Enter' && handleAdd(key)} />
            <Button size="sm" variant="ghost" onClick={() => handleAdd(key)}>+ Add</Button>
          </div>
        </Card>
      ))}
    </div>
  );
}

function AppearanceSection() {
  const [slots, setSlots] = useState([]);
  const [editing, setEditing] = useState(null);
  const [urlValue, setUrlValue] = useState('');
  const [chibiVariant, setChibiVariant] = useState('bunny');

  async function refresh() { setSlots(await listAssetSlots()); }
  useEffect(() => { refresh(); getRunningChibiVariant().then(setChibiVariant); }, []);

  async function handlePickChibi(variant) {
    setChibiVariant(variant);
    await setRunningChibiVariant(variant);
  }

  function startEdit(slot) {
    setEditing(slot.key);
    setUrlValue(slot.image_url || '');
  }

  async function save(slotKey) {
    await setAssetSlot(slotKey, urlValue.trim());
    setEditing(null);
    refresh();
  }

  const grouped = {};
  slots.forEach(s => { (grouped[s.category] ||= []).push(s); });

  return (
    <div className="stack" style={{ gap: 'var(--space-4)' }}>
      <Card>
        <div className="section-label">Running chibi</div>
        <p className="muted" style={{ fontSize: 12 }}>The little animal that scurries to a new corner when the window gets narrow.</p>
        <div className="row" style={{ gap: 'var(--space-4)', marginTop: 'var(--space-3)', flexWrap: 'wrap' }}>
          {CHIBI_VARIANTS.map(v => (
            <button
              key={v.key}
              onClick={() => handlePickChibi(v.key)}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                background: chibiVariant === v.key ? 'var(--cream)' : 'transparent',
                border: chibiVariant === v.key ? '2px solid var(--accent)' : '2px solid transparent',
                borderRadius: 'var(--radius-md)', padding: 8, cursor: 'pointer',
              }}
            >
              <div style={{ width: 64, height: 48, position: 'relative' }}>
                <svg viewBox="0 0 80 60" style={{ width: '100%', height: '100%' }}>
                  <ChibiPreview variant={v.key} />
                </svg>
              </div>
              <span style={{ fontSize: 11, fontWeight: chibiVariant === v.key ? 700 : 400 }}>{v.label}</span>
            </button>
          ))}
        </div>
      </Card>

      <p className="muted" style={{ fontSize: 12 }}>
        Paste a link to an image you've already got hosted somewhere (Google Drive share link, Imgur, etc.) to
        swap a decorative graphic. Leave blank to use the built-in illustrated scene. Banners work best around
        1600×440px, landscape.
      </p>
      {Object.entries(grouped).map(([category, items]) => (
        <div key={category}>
          <div className="section-label" style={{ marginBottom: 'var(--space-2)' }}>{category}</div>
          <div className="stack" style={{ gap: 'var(--space-2)' }}>
            {items.map(slot => (
              <Card key={slot.key}>
                <div className="row-between">
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 13 }}>{slot.label}</div>
                    <div className="muted" style={{ fontSize: 11 }}>{slot.usedIn}</div>
                  </div>
                  {slot.image_url && !editing && (
                    <img src={slot.image_url} alt="" style={
                      category === 'Banners'
                        ? { width: 80, height: 22, borderRadius: 4, objectFit: 'cover' }
                        : { width: 32, height: 32, borderRadius: '50%', objectFit: 'cover' }
                    } />
                  )}
                </div>
                {editing === slot.key ? (
                  <div className="row" style={{ marginTop: 'var(--space-2)' }}>
                    <input placeholder="Image URL" value={urlValue} onChange={e => setUrlValue(e.target.value)} style={{ flex: 1 }} />
                    <Button size="sm" onClick={() => save(slot.key)}>Save</Button>
                    <Button size="sm" variant="text" onClick={() => setEditing(null)}>Cancel</Button>
                  </div>
                ) : (
            <Button size="sm" variant="text" onClick={() => startEdit(slot)}>{slot.image_url ? 'Change image' : '+ Assign image'}</Button>
          )}
              </Card>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function FeaturesSection() {
  const [flags, setFlags] = useState({});
  const [sleepTargets, setSleepTargetsState] = useState({ bedtime: '22:30', wake_time: '06:00' });
  const [sleepSaved, setSleepSaved] = useState(false);

  async function refresh() {
    setFlags(await getAllFeatureFlags());
    setSleepTargetsState(await getSleepTargets());
  }
  useEffect(() => { refresh(); }, []);

  async function toggle(key, value) {
    setFlags(prev => ({ ...prev, [key]: value }));
    await setFeatureFlag(key, value);
  }

  async function handleSaveSleep() {
    await setSleepTargets(sleepTargets);
    setSleepSaved(true);
    setTimeout(() => setSleepSaved(false), 1200);
  }

  return (
    <div className="stack" style={{ gap: 'var(--space-4)' }}>
    <Card>
      <div className="section-label">Feature toggles</div>
      <div className="stack" style={{ marginTop: 'var(--space-3)' }}>
        {Object.entries(FEATURE_FLAGS).map(([key, meta]) => (
          <label key={key} className="row" style={{ gap: 'var(--space-3)' }}>
            <input type="checkbox" checked={flags[key] ?? meta.default} onChange={e => toggle(key, e.target.checked)} />
            <span style={{ fontSize: 13 }}>{meta.label}</span>
          </label>
        ))}
      </div>
      <p className="muted" style={{ fontSize: 11, marginTop: 'var(--space-3)' }}>
        Changes apply next time you load a page that reads them.
      </p>
    </Card>

    <Card>
      <div className="section-label">Sleep targets</div>
      <p className="muted" style={{ fontSize: 12 }}>
        Used by the PM routine countdown — your companion nudges you in the evening if starting your
        routine now would push you past this bedtime or under 8 hours of sleep.
      </p>
      <div className="row" style={{ gap: 'var(--space-4)', marginTop: 'var(--space-3)', flexWrap: 'wrap' }}>
        <label className="stack" style={{ gap: 4 }}>
          <span style={{ fontSize: 12 }}>Target bedtime</span>
          <input type="time" value={sleepTargets.bedtime}
            onChange={e => setSleepTargetsState({ ...sleepTargets, bedtime: e.target.value })} />
        </label>
        <label className="stack" style={{ gap: 4 }}>
          <span style={{ fontSize: 12 }}>Usual wake time</span>
          <input type="time" value={sleepTargets.wake_time}
            onChange={e => setSleepTargetsState({ ...sleepTargets, wake_time: e.target.value })} />
        </label>
        <Button size="sm" onClick={handleSaveSleep} style={{ alignSelf: 'flex-end' }}>
          {sleepSaved ? 'Saved ✓' : 'Save'}
        </Button>
      </div>
    </Card>
    </div>
  );
}

function AiSection() {
  const [instructions, setInstructions] = useState('');
  const [autonomy, setAutonomy] = useState('confirm');
  const [saved, setSaved] = useState(false);

  async function refresh() {
    setInstructions(await getCustomAiInstructions());
    setAutonomy(await getAutonomyLevel());
  }
  useEffect(() => { refresh(); }, []);

  async function handleSave() {
    await setCustomAiInstructions(instructions);
    setSaved(true);
    setTimeout(() => setSaved(false), 1200);
  }

  async function handleAutonomyChange(level) {
    setAutonomy(level);
    await setAutonomyLevel(level);
  }

  return (
    <div className="stack" style={{ gap: 'var(--space-4)' }}>
      <Card>
        <div className="section-label">Custom instructions for AI features</div>
        <p className="muted" style={{ fontSize: 12 }}>Applied to AI-drafted follow-ups and content repurposing, on top of the base brand voice rules.</p>
        <textarea value={instructions} onChange={e => setInstructions(e.target.value)} style={{ width: '100%', minHeight: 80, marginTop: 'var(--space-2)' }}
          placeholder="e.g. Keep messages under 100 words. Never mention pricing directly." />
        <Button size="sm" onClick={handleSave} style={{ marginTop: 'var(--space-2)' }}>{saved ? 'Saved ✓' : 'Save instructions'}</Button>
      </Card>

      <Card>
        <div className="section-label">AI autonomy</div>
        <p className="muted" style={{ fontSize: 12 }}>
          Currently every AI action proposes and waits for your confirmation. "Auto-apply" isn't wired to skip
          confirmation yet — this sets the preference for when that's built.
        </p>
        <select value={autonomy} onChange={e => handleAutonomyChange(e.target.value)} style={{ marginTop: 'var(--space-2)' }}>
          <option value="confirm">Always ask first (current behavior)</option>
          <option value="auto">Auto-apply when confident (not yet active)</option>
        </select>
      </Card>
    </div>
  );
}

function MemorySection() {
  const [subTab, setSubTab] = useState('changelog');
  const [devLog, setDevLog] = useState([]);
  const [decisions, setDecisions] = useState([]);
  const [status, setStatus] = useState(null);
  const [handoff, setHandoff] = useState('');
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  async function refresh() {
    const [d, dec, s] = await Promise.all([listDevLog(), listDecisions(), getSystemStatus()]);
    setDevLog(d); setDecisions(dec); setStatus(s);
  }
  useEffect(() => { refresh(); }, []);

  async function handleGenerateHandoff() {
    setGenerating(true);
    const doc = await generateHandoff();
    setGenerating(false);
    setHandoff(doc);
  }

  function copyHandoff() {
    navigator.clipboard?.writeText(handoff);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  }

  return (
    <div>
      <div className="row" style={{ marginBottom: 'var(--space-3)', gap: 4 }}>
        {['changelog', 'decisions', 'status', 'handoff'].map(t => (
          <button key={t} className={`sub-tab ${subTab === t ? 'active' : ''}`} onClick={() => setSubTab(t)}>{t.charAt(0).toUpperCase() + t.slice(1)}</button>
        ))}
      </div>

      {subTab === 'changelog' && (
        <Card>
          <div className="section-label">Changelog</div>
          <p className="muted" style={{ fontSize: 11 }}>In-app changes log automatically. Code-level changes (from a Claude session) get added here by convention at the end of a session.</p>
          {devLog.length === 0 ? <EmptyState icon="sparkles" title="Nothing logged yet" /> : (
            <div className="stack" style={{ marginTop: 'var(--space-2)' }}>
              {devLog.map(d => (
                <div key={d.id} style={{ padding: '6px 0', borderBottom: '1px solid var(--sand)' }}>
                  <span className="muted" style={{ fontSize: 11, textTransform: 'uppercase' }}>{d.entry_type}</span>
                  <div style={{ fontSize: 13 }}>{d.summary}</div>
                  {d.detail && <div className="muted" style={{ fontSize: 12 }}>{d.detail}</div>}
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {subTab === 'decisions' && <DecisionsPanel decisions={decisions} onAdded={refresh} />}

      {subTab === 'status' && status && (
        <Card>
          <div className="section-label">Live system status</div>
          <div className="stack" style={{ marginTop: 'var(--space-2)' }}>
            <div className="row-between" style={{ fontSize: 13 }}><span>Contacts in Pipeline</span><span className="muted">{status.contacts}</span></div>
            <div className="row-between" style={{ fontSize: 13 }}><span>Content pieces</span><span className="muted">{status.contentPieces}</span></div>
            <div className="row-between" style={{ fontSize: 13 }}><span>Open tasks</span><span className="muted">{status.openTasks}</span></div>
            <div className="row-between" style={{ fontSize: 13 }}><span>Backlog ideas</span><span className="muted">{status.backlogIdeas}</span></div>
            <div className="row-between" style={{ fontSize: 13 }}><span>Closings logged</span><span className="muted">{status.closingsLogged}</span></div>
          </div>
        </Card>
      )}

      {subTab === 'handoff' && (
        <Card>
          <div className="section-label">Generate AI handoff</div>
          <p className="muted" style={{ fontSize: 12 }}>Builds a fresh continuation document from your live data — paste it into a new conversation to resume with context.</p>
          <Button size="sm" onClick={handleGenerateHandoff} disabled={generating} style={{ marginTop: 'var(--space-2)' }}>
            {generating ? 'Generating…' : 'Generate now'}
          </Button>
          {handoff && (
            <div style={{ marginTop: 'var(--space-3)' }}>
              <textarea readOnly value={handoff} style={{ width: '100%', minHeight: 240, fontSize: 12, fontFamily: 'monospace' }} />
              <Button size="sm" variant="ghost" onClick={copyHandoff} style={{ marginTop: 'var(--space-2)' }}>{copied ? 'Copied ✓' : 'Copy to clipboard'}</Button>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}

function DecisionsPanel({ decisions, onAdded }) {
  const [what, setWhat] = useState('');
  const [why, setWhy] = useState('');

  async function handleAdd() {
    if (!what.trim()) return;
    await addDecision(what.trim(), why.trim() || null);
    setWhat(''); setWhy('');
    onAdded();
  }

  return (
    <Card>
      <div className="section-label">Decisions</div>
      <p className="muted" style={{ fontSize: 11 }}>Record why a change was made, so the reasoning isn't lost.</p>
      <div className="stack" style={{ marginTop: 'var(--space-2)' }}>
        <input placeholder="What changed?" value={what} onChange={e => setWhat(e.target.value)} />
        <input placeholder="Why? (optional)" value={why} onChange={e => setWhy(e.target.value)} />
        <div><Button size="sm" onClick={handleAdd}>+ Record decision</Button></div>
      </div>
      <div className="stack" style={{ marginTop: 'var(--space-4)' }}>
        {decisions.map(d => (
          <div key={d.id} style={{ padding: '6px 0', borderBottom: '1px solid var(--sand)' }}>
            <div style={{ fontSize: 13, fontWeight: 700 }}>{d.what_changed}</div>
            {d.why && <div className="muted" style={{ fontSize: 12 }}>{d.why}</div>}
          </div>
        ))}
      </div>
    </Card>
  );
}

function DataSection() {
  const [exporting, setExporting] = useState(false);

  async function handleExport() {
    setExporting(true);
    const bundle = await exportAllData();
    downloadAsFile(bundle, `personal-os-export-${new Date().toISOString().slice(0, 10)}.json`);
    setExporting(false);
  }

  return (
    <Card>
      <div className="section-label">Export your data</div>
      <p className="muted" style={{ fontSize: 12 }}>
        Downloads contacts, content, tasks, roadmap, library, backlog, maintenance, finance, and notes as one JSON file.
      </p>
      <Button size="sm" onClick={handleExport} disabled={exporting} style={{ marginTop: 'var(--space-2)' }}>
        {exporting ? 'Exporting…' : '⬇ Export all data'}
      </Button>
      <p className="muted" style={{ fontSize: 11, marginTop: 'var(--space-3)' }}>
        Import/restore isn't built yet — restoring data safely (without risking overwrites) needs its own careful
        pass rather than being rushed in here. Export is safe to use today.
      </p>
    </Card>
  );
}
