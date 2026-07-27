import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Split } from 'lucide-react';
import Card from '../../components/ui/Card.jsx';
import Button from '../../components/ui/Button.jsx';
import Checkbox from '../../components/ui/Checkbox.jsx';
import { getCategoryList } from '../../services/settings.js';
import { listMilestones, addMilestone, toggleMilestone, updateMilestone, deleteMilestone, updateRoadmapLink, updateRoadmapTitle } from '../../services/goals.js';
import {
  syncRoadmapStatuses, listRoadmapItems, syncRoadmapItemFromSubtasks, setRoadmapItemInProgress,
  setRoadmapItemStatus, resetRoadmapItemToAutomatic,
} from '../../services/timeline.js';
import { listFutureIdeas, addFutureIdea, updateFutureIdea, deleteFutureIdea, promoteToRoadmap } from '../../services/futureRoadmap.js';

// ============================================================
// ROADMAP — unchanged from the last pass (links + sub-tasks already built).
// ============================================================
const LINK_OPTIONS = [
  { label: 'Business → Pipeline', value: '/business/pipeline' },
  { label: 'Business → Relationships', value: '/business/relationships' },
  { label: 'Business → Content', value: '/business/content' },
  { label: 'Business → Library', value: '/business/library' },
  { label: 'Business → Clients', value: '/business/clients' },
  { label: 'Plan → Goals & Projects', value: '/plan/goals' },
];

export default
function RoadmapTab() {
  const [items, setItems] = useState([]);
  const [expanded, setExpanded] = useState(null);
  const [phases, setPhases] = useState(['Foundation', 'Growth', 'Expansion']);
  const [ideas, setIdeas] = useState([]);
  const [addingIdea, setAddingIdea] = useState(false);
  const [ideaForm, setIdeaForm] = useState({ idea: '', why_deferred: '', effort: '', value: '' });

  useEffect(() => {
    syncRoadmapStatuses().then(load);
    getCategoryList('roadmap_phases').then(setPhases);
    listFutureIdeas().then(setIdeas);
  }, []);

  async function load() {
    setItems(await listRoadmapItems());
  }

  async function refreshIdeas() { setIdeas(await listFutureIdeas()); }

  async function handleAddIdea() {
    if (!ideaForm.idea.trim()) return;
    await addFutureIdea(ideaForm);
    setIdeaForm({ idea: '', why_deferred: '', effort: '', value: '' });
    setAddingIdea(false);
    refreshIdeas();
  }

  async function handlePromote(idea) {
    await promoteToRoadmap(idea, phases[0] || 'Foundation');
    refreshIdeas();
    load();
  }

  return (
    <div className="stack">
      <Card>
        <div className="row-between">
          <div className="section-label">Opportunity Inbox</div>
          <Button size="sm" variant="ghost" onClick={() => setAddingIdea(!addingIdea)}>{addingIdea ? 'Cancel' : '+ Capture an idea'}</Button>
        </div>
        <p className="muted" style={{ fontSize: 'var(--text-caption)' }}>
          Not everything belongs on the roadmap right now. Capture it here instead of losing it — promote to the roadmap when it's actually time.
        </p>
        {addingIdea && (
          <div className="stack" style={{ marginTop: 'var(--space-2)' }}>
            <textarea placeholder="The idea" value={ideaForm.idea} onChange={e => setIdeaForm({ ...ideaForm, idea: e.target.value })} style={{ minHeight: 44 }} />
            <input placeholder="Why deferred / not now (optional)" value={ideaForm.why_deferred} onChange={e => setIdeaForm({ ...ideaForm, why_deferred: e.target.value })} />
            <div className="row">
              <select value={ideaForm.effort} onChange={e => setIdeaForm({ ...ideaForm, effort: e.target.value })}>
                <option value="">Effort...</option>
                <option value="Low">Low effort</option>
                <option value="Medium">Medium effort</option>
                <option value="High">High effort</option>
              </select>
              <select value={ideaForm.value} onChange={e => setIdeaForm({ ...ideaForm, value: e.target.value })}>
                <option value="">Value...</option>
                <option value="Low">Low value</option>
                <option value="Medium">Medium value</option>
                <option value="High">High value</option>
              </select>
            </div>
            <div><Button size="sm" onClick={handleAddIdea}>Save</Button></div>
          </div>
        )}
        {ideas.length > 0 && (
          <div className="stack" style={{ marginTop: 'var(--space-3)' }}>
            {ideas.map(idea => (
              <div key={idea.id} className="row-between" style={{ padding: '8px 0', borderBottom: '1px solid var(--sand)' }}>
                <div>
                  <div style={{ fontSize: 'var(--text-small)' }}>{idea.idea}</div>
                  <div className="muted" style={{ fontSize: 'var(--text-micro)' }}>
                    {idea.effort && `${idea.effort} effort`}{idea.effort && idea.value && ' · '}{idea.value && `${idea.value} value`}
                    {idea.why_deferred && ` · ${idea.why_deferred}`}
                  </div>
                </div>
                <div className="row" style={{ gap: 4 }}>
                  <Button size="sm" variant="text" onClick={() => handlePromote(idea)}>Promote to roadmap</Button>
                  <button className="row-remove-btn" aria-label="Remove" onClick={() => deleteFutureIdea(idea.id).then(refreshIdeas)}>×</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {phases.map(phase => (
        <Card key={phase}>
          <div className="section-label">{phase}</div>
          <div className="stack" style={{ marginTop: 'var(--space-2)' }}>
            {items.filter(i => i.phase === phase).map(i => (
              <RoadmapRow key={i.id} item={i} expanded={expanded === i.id} onToggleExpand={() => setExpanded(expanded === i.id ? null : i.id)} onLinked={load} />
            ))}
          </div>
        </Card>
      ))}
    </div>
  );
}

/** "Build CRM: contact categories, lead sources, pipeline stages" ->
 *  { parent: "Build CRM", subs: ["contact categories", "lead sources", "pipeline stages"] }.
 *  A best-guess parse, never applied automatically — always shown as an
 *  editable preview first, since a colon in a title doesn't always mean
 *  "these are sub-tasks" and this touches real content, not just code. */
function parseCompoundTitle(title) {
  const colonIndex = title.indexOf(':');
  if (colonIndex === -1) return null;
  const parent = title.slice(0, colonIndex).trim();
  const rest = title.slice(colonIndex + 1).trim();
  const subs = rest.split(',').map(s => s.trim()).filter(Boolean);
  if (!parent || subs.length === 0) return null;
  return { parent, subs };
}

function RoadmapRow({ item, expanded, onToggleExpand, onLinked }) {
  const [subtasks, setSubtasks] = useState([]);
  const [newSubtask, setNewSubtask] = useState('');
  const [pickingLink, setPickingLink] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState('');
  const [splitPreview, setSplitPreview] = useState(null);
  const [celebrating, setCelebrating] = useState(false);

  useEffect(() => { if (expanded) listMilestones({ roadmapId: item.id }).then(setSubtasks); }, [expanded, item.id]);

  async function handleAddSubtask() {
    if (!newSubtask.trim()) return;
    await addMilestone({ roadmap_item_id: item.id, title: newSubtask.trim(), sort_order: subtasks.length });
    setNewSubtask('');
    setSubtasks(await listMilestones({ roadmapId: item.id }));
  }

  async function handleToggleSubtask(subtaskId, value) {
    await toggleMilestone(subtaskId, value);
    setSubtasks(await listMilestones({ roadmapId: item.id }));
    const justCompleted = await syncRoadmapItemFromSubtasks(item.id);
    onLinked(); // refresh the parent list so the header status (Done) shows immediately
    if (justCompleted) {
      setCelebrating(true);
      setTimeout(() => { setCelebrating(false); onToggleExpand(); }, 1500);
    }
  }

  function startEditSubtask(s) {
    setEditingId(s.id);
    setEditText(s.title);
  }

  async function saveEditSubtask(id) {
    if (!editText.trim()) return;
    await updateMilestone(id, editText.trim());
    setEditingId(null);
    setSubtasks(await listMilestones({ roadmapId: item.id }));
  }

  async function handleDeleteSubtask(id) {
    await deleteMilestone(id);
    setSubtasks(await listMilestones({ roadmapId: item.id }));
  }

  async function handleSetLink(url) {
    await updateRoadmapLink(item.id, url);
    setPickingLink(false);
    onLinked();
  }

  async function handleStartThisWeek() {
    await setRoadmapItemInProgress(item.id);
    onLinked();
  }

  async function handleSetStatus(status) {
    await setRoadmapItemStatus(item.id, status);
    onLinked();
  }

  async function handleResetAuto() {
    await resetRoadmapItemToAutomatic(item.id);
    onLinked();
  }

  function openSplitPreview() {
    const parsed = parseCompoundTitle(item.title);
    if (parsed) setSplitPreview(parsed);
  }

  function updateSplitSub(index, value) {
    setSplitPreview(prev => ({ ...prev, subs: prev.subs.map((s, i) => (i === index ? value : s)) }));
  }

  function removeSplitSub(index) {
    setSplitPreview(prev => ({ ...prev, subs: prev.subs.filter((_, i) => i !== index) }));
  }

  async function confirmSplit() {
    if (!splitPreview.parent.trim() || splitPreview.subs.length === 0) return;
    await updateRoadmapTitle(item.id, splitPreview.parent.trim());
    for (let i = 0; i < splitPreview.subs.length; i++) {
      if (splitPreview.subs[i].trim()) {
        await addMilestone({ roadmap_item_id: item.id, title: splitPreview.subs[i].trim(), sort_order: i });
      }
    }
    setSplitPreview(null);
    setSubtasks(await listMilestones({ roadmapId: item.id }));
    onLinked(); // refreshes the parent list so the shortened title shows immediately
  }

  const doneCount = subtasks.filter(s => s.completed).length;

  return (
    <div className="planner-block">
      <div className="row-between">
        <div style={{ cursor: 'pointer', flex: 1 }} onClick={onToggleExpand}>
          <span>{item.week_number ? `Wk ${item.week_number} — ` : ''}{item.title}</span>
          {item.date_range && <span className="muted" style={{ fontSize: 'var(--text-micro)' }}> · {item.date_range}</span>}
          {subtasks.length > 0 && <span className="muted" style={{ fontSize: 'var(--text-micro)' }}> · {doneCount}/{subtasks.length} sub-tasks</span>}
        </div>
        <div className="row" style={{ gap: 'var(--space-2)', alignItems: 'center' }}>
          {item.link_to && <Link to={item.link_to}><Button size="sm" variant="ghost">Open →</Button></Link>}
          {item.status !== 'In Progress' && item.status !== 'Done' && (
            <Button size="sm" variant="ghost" onClick={e => { e.stopPropagation(); handleStartThisWeek(); }}>▶ Start this week</Button>
          )}
          <span className="muted" style={{ fontSize: 'var(--text-micro)' }}>{item.status}{item.status_manual && ' (manual)'}</span>
        </div>
      </div>

      {expanded && celebrating && (
        <div className="completion-celebration">
          {['🎉', '✨', '🎊', '⭐', '🎉'].map((emoji, i) => (
            <span key={i} className="confetti-particle" style={{ left: `${20 + i * 15}%`, '--drift': `${(i - 2) * 30}px`, animationDelay: `${i * 60}ms` }}>{emoji}</span>
          ))}
          Completed!
        </div>
      )}
      {expanded && !celebrating && (
        <div style={{ marginTop: 'var(--space-3)' }} onClick={e => e.stopPropagation()}>
          {!item.link_to && !pickingLink && <Button size="sm" variant="text" onClick={() => setPickingLink(true)}>+ Link this to a page</Button>}
          {pickingLink && (
            <div className="row" style={{ flexWrap: 'wrap', gap: 'var(--space-2)' }}>
              {LINK_OPTIONS.map(opt => <Button key={opt.value} size="sm" variant="ghost" onClick={() => handleSetLink(opt.value)}>{opt.label}</Button>)}
            </div>
          )}
          {item.link_to && <Button size="sm" variant="text" onClick={() => setPickingLink(true)}>Change link</Button>}

          <div className="row" style={{ marginTop: 'var(--space-2)', alignItems: 'center', gap: 'var(--space-2)' }}>
            <span className="muted" style={{ fontSize: 'var(--text-caption)' }}>Status:</span>
            <select value={item.status} onChange={e => handleSetStatus(e.target.value)}>
              <option value="Not Started">Not Started</option>
              <option value="In Progress">In Progress</option>
              <option value="Done">Done</option>
            </select>
            {item.status_manual && <Button size="sm" variant="text" onClick={handleResetAuto}>Reset to automatic</Button>}
          </div>

          {subtasks.length === 0 && !splitPreview && parseCompoundTitle(item.title) && (
            <div style={{ marginTop: 'var(--space-2)' }}>
              <Button size="sm" variant="text" onClick={openSplitPreview}><Split size={13} style={{ verticalAlign: 'middle', marginRight: 4 }} />Split into sub-tasks</Button>
            </div>
          )}

          {splitPreview && (
            <div style={{ marginTop: 'var(--space-3)', padding: 'var(--space-3)', background: 'var(--cream)', borderRadius: 'var(--radius-sm)' }}>
              <div className="muted" style={{ fontSize: 'var(--text-micro)', marginBottom: 6 }}>Review before saving — nothing's changed yet.</div>
              <label className="stack" style={{ gap: 2 }}>
                <span style={{ fontSize: 'var(--text-micro)' }}>Item title</span>
                <input value={splitPreview.parent} onChange={e => setSplitPreview({ ...splitPreview, parent: e.target.value })} />
              </label>
              <div className="stack" style={{ marginTop: 'var(--space-2)', gap: 4 }}>
                <span style={{ fontSize: 'var(--text-micro)' }}>Sub-tasks</span>
                {splitPreview.subs.map((s, i) => (
                  <div key={i} className="row" style={{ gap: 'var(--space-2)' }}>
                    <input value={s} onChange={e => updateSplitSub(i, e.target.value)} style={{ flex: 1 }} />
                    <Button size="sm" variant="text" onClick={() => removeSplitSub(i)}>×</Button>
                  </div>
                ))}
              </div>
              <div className="row" style={{ marginTop: 'var(--space-3)', gap: 'var(--space-2)' }}>
                <Button size="sm" onClick={confirmSplit}>Save split</Button>
                <Button size="sm" variant="text" onClick={() => setSplitPreview(null)}>Cancel</Button>
              </div>
            </div>
          )}

          <div className="stack" style={{ marginTop: 'var(--space-3)' }}>
            {subtasks.map(s => (
              editingId === s.id ? (
                <div key={s.id} className="row" style={{ gap: 'var(--space-2)', flexWrap: 'wrap' }}>
                  <input
                    autoFocus
                    value={editText}
                    onChange={e => setEditText(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && saveEditSubtask(s.id)}
                    style={{ flex: 1, minWidth: 120 }}
                  />
                  <Button size="sm" variant="ghost" onClick={() => saveEditSubtask(s.id)}>Save</Button>
                  <Button size="sm" variant="text" onClick={() => setEditingId(null)}>Cancel</Button>
                </div>
              ) : (
                <div key={s.id} className="row-between">
                  <Checkbox checked={s.completed} onChange={v => handleToggleSubtask(s.id, v)} label={s.title} />
                  <div className="row" style={{ gap: 'var(--space-1)' }}>
                    <Button size="sm" variant="text" onClick={() => startEditSubtask(s)}>Edit</Button>
                    <Button size="sm" variant="text" onClick={() => handleDeleteSubtask(s.id)}>Delete</Button>
                  </div>
                </div>
              )
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
