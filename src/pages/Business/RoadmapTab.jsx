import React, { useEffect, useState } from 'react';
import Card from '../../components/ui/Card.jsx';
import Button from '../../components/ui/Button.jsx';
import Checkbox from '../../components/ui/Checkbox.jsx';
import ProgressBar from '../../components/ui/ProgressBar.jsx';
import { listFutureIdeas, addFutureIdea, deleteFutureIdea, promoteToRoadmap, scoreOpportunityIdea } from '../../services/futureRoadmap.js';
import { getWebsiteBuildProgress, markSiteBuildComplete, buildNewRoadmap, PHASE1_DIAGNOSIS, PHASE1_EXIT_CRITERIA } from '../../services/websiteBuildImport.js';
import { toggleMilestone, deleteMilestone } from '../../services/goals.js';

// ============================================================
// ROADMAP — rebuilt. This used to show the Realtor OS software's own
// build phases (Foundation/Growth/Expansion) alongside the
// Opportunity Inbox, but that software tracking isn't something
// actionable day to day for the person running the actual business —
// it's really the developer's own tracking. This page is now your
// real business/website progress instead, pulled directly from the
// Website Build project (Plan > Goals & Projects), so there's one
// real source of truth instead of two things both called "Roadmap."
// ============================================================
export default function RoadmapTab() {
  const [progress, setProgress] = useState(null);
  const [expandedPhase, setExpandedPhase] = useState(null);
  const [ideas, setIdeas] = useState([]);
  const [addingIdea, setAddingIdea] = useState(false);
  const [ideaForm, setIdeaForm] = useState({ idea: '', why_deferred: '', effort: '', value: '' });
  const [markingComplete, setMarkingComplete] = useState(false);
  const [buildingRoadmap, setBuildingRoadmap] = useState(false);
  const [roadmapStatus, setRoadmapStatus] = useState(null);
  const [hideCompleted, setHideCompleted] = useState(false);
  const [showCriteria, setShowCriteria] = useState(false);

  useEffect(() => { load(); listFutureIdeas().then(setIdeas); }, []);

  async function load() {
    const p = await getWebsiteBuildProgress();
    setProgress(p);
    if (p && !expandedPhase) {
      const firstIncomplete = p.phases.find(ph => ph.doneCount < ph.total);
      if (firstIncomplete) setExpandedPhase(firstIncomplete.key);
    }
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
    await promoteToRoadmap(idea, 'Business');
    refreshIdeas();
  }

  async function handleToggleMilestone(id, value) {
    await toggleMilestone(id, value);
    load();
  }

  async function handleDeleteMilestone(id, label) {
    const confirmed = window.confirm(`Delete "${label}"? This can't be undone.`);
    if (!confirmed) return;
    await deleteMilestone(id);
    load();
  }

  async function handleMarkSiteComplete() {
    const confirmed = window.confirm("This marks every M1-M4 milestone (the actual site-build work) as complete, since you've confirmed the website itself is done. M5 (Canva batch, blog post, etc.) is left as-is. Continue?");
    if (!confirmed) return;
    setMarkingComplete(true);
    await markSiteBuildComplete();
    setMarkingComplete(false);
    load();
  }

  async function handleBuildNewRoadmap() {
    const confirmed = window.confirm("This replaces the previous roadmap with the real Implementation Roadmap Update (Aug 3, 2026): 3 gate criteria, then 3 real windows \u2014 30 days (reactivate CRM + weekly review), 60 days (referral asset, community, intelligence content), and 90 days (gated \u2014 stays locked until the gate criteria are met). 17 items total. Nothing already completed gets touched. Build it?");
    if (!confirmed) return;
    setBuildingRoadmap(true);
    try {
      const result = await buildNewRoadmap();
      setRoadmapStatus(result.created === false ? result.reason : `Retired ${result.retired} old item${result.retired === 1 ? '' : 's'}, added ${result.added} new one${result.added === 1 ? '' : 's'}.`);
      load();
    } catch (err) {
      setRoadmapStatus(`Couldn't build: ${err.message || err}`);
    }
    setBuildingRoadmap(false);
  }

  const nextMilestone = progress?.phases.flatMap(ph => ph.items).find(m => !m.completed);
  const topOpportunity = [...ideas].sort((a, b) => scoreOpportunityIdea(b) - scoreOpportunityIdea(a))[0];

  return (
    <div className="stack">
      <Card style={{ borderLeft: '4px solid var(--clay)' }}>
        <div className="section-label">Current diagnosis</div>
        <p style={{ fontSize: 'var(--text-small)', marginTop: 4 }}>{PHASE1_DIAGNOSIS}</p>
        <div className="row" style={{ marginTop: 'var(--space-2)', gap: 4 }}>
          <Button size="sm" variant="text" onClick={() => setShowCriteria(!showCriteria)}>{showCriteria ? 'Hide' : 'Show'} Phase 1 exit criteria</Button>
        </div>
        {showCriteria && (
          <div className="stack" style={{ marginTop: 'var(--space-2)', gap: 4 }}>
            {PHASE1_EXIT_CRITERIA.map(c => (
              <div key={c.label} className="row-between" style={{ fontSize: 'var(--text-small)' }}>
                <span>{c.label}</span>
                <span className="muted" style={{ color: c.met === false ? 'var(--danger)' : c.met === null ? 'var(--clay)' : 'var(--sage)' }}>{c.status}</span>
              </div>
            ))}
          </div>
        )}
      </Card>

      {(nextMilestone || topOpportunity) && (
        <Card style={{ border: '1px solid var(--gold)' }}>
          <div className="section-label">Build this next</div>
          {nextMilestone && (
            <div style={{ marginTop: 'var(--space-2)', fontSize: 'var(--text-small)' }}>
              <strong>On the website build:</strong> {nextMilestone.label}
              <div className="muted" style={{ fontSize: 'var(--text-micro)' }}>Next in line — earliest unfinished milestone</div>
            </div>
          )}
          {topOpportunity && (
            <div style={{ marginTop: 'var(--space-2)', fontSize: 'var(--text-small)' }}>
              <strong>Best opportunity, if you want to deviate:</strong> {topOpportunity.idea}
              <div className="muted" style={{ fontSize: 'var(--text-micro)' }}>
                {topOpportunity.value || 'Unrated'} value, {topOpportunity.effort || 'unrated'} effort — the highest-value, lowest-effort idea waiting in the inbox
              </div>
            </div>
          )}
        </Card>
      )}

      <Card>
        <div className="row-between">
          <div className="section-label">Opportunity Inbox</div>
          <Button size="sm" variant="ghost" onClick={() => setAddingIdea(!addingIdea)}>{addingIdea ? 'Cancel' : '+ Capture an idea'}</Button>
        </div>
        <p className="muted" style={{ fontSize: 'var(--text-caption)' }}>
          Not everything belongs on the build list right now. Capture it here instead of losing it — promote when it's actually time.
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
                  <Button size="sm" variant="text" onClick={() => handlePromote(idea)}>Promote</Button>
                  <button className="row-remove-btn" aria-label="Remove" onClick={() => deleteFutureIdea(idea.id).then(refreshIdeas)}>×</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {!progress ? (
        <Card><div className="muted">Loading your website build progress...</div></Card>
      ) : progress.phases.length === 0 ? (
        <Card>
          <div className="muted">No Website Build milestones found — import them from Plan → Goals & Projects first.</div>
        </Card>
      ) : (
        <>
          <Card>
            <div className="row-between">
              <div className="section-label">Website build status</div>
              <div className="row" style={{ gap: 'var(--space-2)' }}>
                <Button size="sm" variant="text" onClick={handleMarkSiteComplete} disabled={markingComplete}>
                  {markingComplete ? 'Updating…' : 'Mark site build complete (M1-M4)'}
                </Button>
                <Button size="sm" variant="ghost" onClick={handleBuildNewRoadmap} disabled={buildingRoadmap}>
                  {buildingRoadmap ? 'Building…' : 'Build the new roadmap'}
                </Button>
                <Button size="sm" variant="text" onClick={() => setHideCompleted(!hideCompleted)}>{hideCompleted ? 'Show' : 'Hide'} completed</Button>
              </div>
            </div>
            {roadmapStatus && <div className="muted" style={{ fontSize: 'var(--text-micro)', marginTop: 4 }}>{roadmapStatus}</div>}
          </Card>

          {progress.phases.filter(phase => !hideCompleted || phase.doneCount < phase.total).map(phase => (
            <Card key={phase.key} style={phase.locked ? { opacity: 0.5, background: 'var(--sand)' } : undefined}>
              <div className="row-between" style={{ cursor: 'pointer' }} onClick={() => setExpandedPhase(expandedPhase === phase.key ? null : phase.key)}>
                <div>
                  <div className="section-label">{phase.key}: {phase.name}{phase.locked && ' \ud83d\udd12'}</div>
                  <div className="muted" style={{ fontSize: 'var(--text-caption)' }}>{phase.doneCount}/{phase.total} done</div>
                </div>
              </div>
              {phase.locked && (
                <div className="muted" style={{ fontSize: 'var(--text-micro)', marginTop: 4 }}>Locked until the 3 gate criteria above are all met.</div>
              )}
              <ProgressBar value={phase.doneCount} max={phase.total} tone={phase.doneCount === phase.total ? 'sage' : 'sand'} />
              {expandedPhase === phase.key && (
                <div className="stack" style={{ marginTop: 'var(--space-3)' }} onClick={e => e.stopPropagation()}>
                  {phase.items.filter(m => !hideCompleted || !m.completed).map(m => (
                    <div key={m.id} className="row-between">
                      <Checkbox checked={m.completed} onChange={v => handleToggleMilestone(m.id, v)} label={m.label} disabled={phase.locked} />
                      <button className="row-remove-btn" aria-label="Remove" onClick={() => handleDeleteMilestone(m.id, m.label)}>×</button>
                    </div>
                  ))}
                  {hideCompleted && phase.items.every(m => m.completed) && (
                    <div className="muted" style={{ fontSize: 'var(--text-micro)' }}>Everything here is done — hidden.</div>
                  )}
                </div>
              )}
            </Card>
          ))}
        </>
      )}
    </div>
  );
}
