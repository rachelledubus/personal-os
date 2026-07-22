import React, { useEffect, useState } from 'react';
import Card from '../../components/ui/Card.jsx';
import Button from '../../components/ui/Button.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import ProgressBar from '../../components/ui/ProgressBar.jsx';
import ImageUploadField from '../../components/ui/ImageUploadField.jsx';
import {
  seedGuardiansIfEmpty, listGuardians, getXpProgressWithinLevel, getFullHistory, getAchievementProgress,
} from '../../services/guardians.js';
import {
  CATEGORY_LISTS, getCategoryList, setCategoryList,
  FEATURE_FLAGS, getAllFeatureFlags, setFeatureFlag,
  getCustomAiInstructions, setCustomAiInstructions,
  getSleepTargets, setSleepTargets,
} from '../../services/settings.js';
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

  async function refresh() { setSlots(await listAssetSlots()); }
  useEffect(() => { refresh(); }, []);

  async function handleAssetChange(slotKey, newUrl) {
    await setAssetSlot(slotKey, newUrl);
    refresh();
  }

  const grouped = {};
  slots.forEach(s => { (grouped[s.category] ||= []).push(s); });

  return (
    <div className="stack" style={{ gap: 'var(--space-4)' }}>
      <p className="muted" style={{ fontSize: 12 }}>
        Upload your own image, or paste a link to one you've already got hosted somewhere (Google Drive
        share link, Imgur, etc.). Leave unset to use the built-in illustrated scene. Banners work best
        around 1600×440px, landscape.
      </p>
      {Object.entries(grouped).map(([category, items]) => (
        <div key={category}>
          <div className="section-label" style={{ marginBottom: 'var(--space-2)' }}>{category}</div>
          <div className="stack" style={{ gap: 'var(--space-2)' }}>
            {items.map(slot => (
              <Card key={slot.key}>
                <div style={{ fontWeight: 700, fontSize: 13 }}>{slot.label}</div>
                <div className="muted" style={{ fontSize: 11, marginBottom: 'var(--space-2)' }}>{slot.usedIn}</div>
                <ImageUploadField
                  value={slot.image_url}
                  onChange={url => handleAssetChange(slot.key, url)}
                  folder={slot.key}
                  previewStyle={
                    category === 'Banners'
                      ? { width: 160, height: 44, borderRadius: 4, objectFit: 'cover' }
                      : { width: 48, height: 48, borderRadius: '50%', objectFit: 'cover' }
                  }
                />
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
  const [guardians, setGuardians] = useState(null);
  const [achievements, setAchievements] = useState(null);
  const [expandedHistoryId, setExpandedHistoryId] = useState(null);
  const [fullHistory, setFullHistory] = useState(null);

  async function refresh() {
    setFlags(await getAllFeatureFlags());
    setSleepTargetsState(await getSleepTargets());
    await seedGuardiansIfEmpty();
    setGuardians(await listGuardians());
    setAchievements(await getAchievementProgress());
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

  async function handleToggleHistory(guardian) {
    if (expandedHistoryId === guardian.id) {
      setExpandedHistoryId(null);
      return;
    }
    setExpandedHistoryId(guardian.id);
    setFullHistory(await getFullHistory(guardian.id));
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

    <Card>
      <div className="section-label">Guardian progress</div>
      <p className="muted" style={{ fontSize: 12 }}>
        Real accomplishments earn XP — tasks, goals, habits, workouts, chores, maintenance, business
        interactions, published content, and closed transactions all count. No visuals or personalities
        built yet on purpose — this is a plain progress readout, not the finished Guardian experience.
      </p>
      {guardians === null ? null : (
        <div className="stack" style={{ marginTop: 'var(--space-3)', gap: 'var(--space-3)' }}>
          {guardians.map(g => (
            <div key={g.id}>
              <div className="row-between" style={{ fontSize: 13 }}>
                <span style={{ fontWeight: 700 }}>{g.name}</span>
                <span className="muted">Level {g.level} · {g.growth_stage}</span>
              </div>
              <ProgressBar value={getXpProgressWithinLevel(g.experience_points)} max={100} tone="sage" />
              <div className="muted" style={{ fontSize: 11, marginTop: 2 }}>{g.experience_points} total XP</div>
              {g.recent_events?.[0]?.reaction && (
                <div style={{ fontSize: 12, marginTop: 4, color: 'var(--sage)' }}>{g.recent_events[0].reaction}</div>
              )}
              {(g.unlocked_features || []).includes('full_history') && (
                <>
                  <Button size="sm" variant="text" onClick={() => handleToggleHistory(g)} style={{ marginTop: 4, padding: 0 }}>
                    {expandedHistoryId === g.id ? 'Hide full history' : 'View full history ✨ unlocked at level 3'}
                  </Button>
                  {expandedHistoryId === g.id && fullHistory && (
                    <div className="stack" style={{ marginTop: 'var(--space-2)', gap: 2, maxHeight: 160, overflowY: 'auto' }}>
                      {fullHistory.length === 0 ? (
                        <span className="muted" style={{ fontSize: 11 }}>No history yet.</span>
                      ) : fullHistory.map(t => (
                        <div key={t.id} className="row-between" style={{ fontSize: 11 }}>
                          <span className="muted">{t.source_table}:{t.event_type}</span>
                          <span className="muted">+{t.amount} XP</span>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </Card>

    <Card>
      <div className="section-label">Achievements</div>
      <p className="muted" style={{ fontSize: 12 }}>
        A trophy case, not a to-do list — these track themselves as you use the app, nothing to manage here.
      </p>
      {achievements === null ? null : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 'var(--space-3)', marginTop: 'var(--space-3)' }}>
          {achievements.map(a => (
            <div
              key={a.key}
              className="stack"
              style={{
                alignItems: 'center', textAlign: 'center', gap: 4, padding: 'var(--space-3)',
                borderRadius: 'var(--radius-md)',
                background: a.earned ? 'var(--cream)' : 'transparent',
                border: a.earned ? '2px solid var(--accent)' : '2px solid transparent',
                opacity: a.earned ? 1 : 0.45,
              }}
              title={a.description}
            >
              <div style={{ fontSize: 28 }}>{a.icon}</div>
              <span style={{ fontSize: 12, fontWeight: 700 }}>{a.name}</span>
              <span className="muted" style={{ fontSize: 10 }}>{a.description}</span>
            </div>
          ))}
        </div>
      )}
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
