import React, { useEffect, useMemo, useState } from 'react';
import { ArrowUpRight, BookOpen, CheckCircle2, ChevronDown, ChevronRight, Circle, ExternalLink, Flag, Link2, Save, Target } from 'lucide-react';
import { CAREER_GATES, CAREER_SKILLS } from './careerSkillsData.js';
import { getPreference, setPreference } from '../../services/preferences.js';
import './CareerReadiness.css';

const PREF_CATEGORY = 'career_readiness';
const PREF_KEY = 'proof_tracker_v1';
const EMPTY_PROGRESS = { skills: {}, actions: {} };
const statusChoices = ['Not started', 'Learning', 'Practicing'];

function validEvidenceUrl(value) {
  if (!value) return false;
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

function savedSkill(progress, skill) {
  const stored = progress.skills?.[skill.id] || {};
  return {
    status: stored.status || skill.initialStatus || 'Not started',
    evidenceUrl: stored.evidenceUrl || '',
    verified: Boolean(stored.verified),
    notes: stored.notes || '',
  };
}

function isProven(progress, skill) {
  const item = savedSkill(progress, skill);
  return item.verified && validEvidenceUrl(item.evidenceUrl);
}

function proofSummary(progress, gate) {
  const requirements = CAREER_SKILLS.filter((skill) => skill.gate === gate.id);
  const complete = requirements.filter((skill) => isProven(progress, skill)).length;
  return { complete, total: requirements.length, ready: complete === requirements.length };
}

export default function CareerReadiness() {
  const [progress, setProgress] = useState(EMPTY_PROGRESS);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const [selectedGate, setSelectedGate] = useState(1);
  const [expandedSkill, setExpandedSkill] = useState('');
  const [draft, setDraft] = useState(null);
  const [showCompleted, setShowCompleted] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const value = await getPreference(PREF_CATEGORY, PREF_KEY, EMPTY_PROGRESS);
        if (!active) return;
        const stored = value && typeof value === 'object' ? value : EMPTY_PROGRESS;
        const normalized = {
          skills: stored.skills && typeof stored.skills === 'object' ? stored.skills : {},
          actions: stored.actions && typeof stored.actions === 'object' ? stored.actions : {},
        };
        setProgress(normalized);
        const firstPending = CAREER_GATES.find((gate) => !proofSummary(normalized, gate).ready);
        setSelectedGate(firstPending?.id || 1);
      } catch (error) {
        if (active) setLoadError('Could not load your tracker. Try reopening this tab.');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, []);

  const currentGate = CAREER_GATES.find((gate) => gate.id === selectedGate) || CAREER_GATES[0];
  const summary = useMemo(() => proofSummary(progress, currentGate), [progress, currentGate]);
  const allVerified = CAREER_SKILLS.filter((skill) => isProven(progress, skill)).length;
  const gateSkills = CAREER_SKILLS.filter((skill) => skill.gate === selectedGate);
  const visibleSkills = showCompleted ? gateSkills : gateSkills.filter((skill) => !isProven(progress, skill));

  function openSkill(skill) {
    if (expandedSkill === skill.id) {
      setExpandedSkill('');
      setDraft(null);
      setMessage('');
      return;
    }
    setExpandedSkill(skill.id);
    setDraft(savedSkill(progress, skill));
    setMessage('');
  }

  async function saveSkill(skill) {
    if (!draft || saving) return;
    if (draft.verified && !validEvidenceUrl(draft.evidenceUrl.trim())) {
      setMessage('Add a valid http(s) evidence link before checking Verified.');
      return;
    }
    if (draft.evidenceUrl.trim() && !validEvidenceUrl(draft.evidenceUrl.trim())) {
      setMessage('Evidence link must begin with https:// or http://.');
      return;
    }
    setSaving(true);
    setMessage('');
    const next = {
      ...progress,
      skills: {
        ...progress.skills,
        [skill.id]: {
          status: draft.verified ? 'Verified' : draft.status,
          evidenceUrl: draft.evidenceUrl.trim(),
          verified: draft.verified,
          notes: draft.notes.trim(),
          updatedAt: new Date().toISOString(),
        },
      },
    };
    try {
      await setPreference(PREF_CATEGORY, PREF_KEY, next);
      setProgress(next);
      setExpandedSkill('');
      setDraft(null);
      setMessage('Saved. Your evidence is available on your other devices.');
    } catch {
      setMessage('Could not save. Your previous proof is unchanged. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  async function toggleAction(gate) {
    if (saving) return;
    setSaving(true);
    setMessage('');
    const taken = Boolean(progress.actions?.[gate.id]);
    const next = {
      ...progress,
      actions: {
        ...progress.actions,
        [gate.id]: taken ? null : new Date().toISOString(),
      },
    };
    try {
      await setPreference(PREF_CATEGORY, PREF_KEY, next);
      setProgress(next);
      setMessage(taken ? 'Milestone action reopened.' : 'Action recorded. You followed through!');
    } catch {
      setMessage('Could not save the milestone action. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p className="career-muted">Loading your career tracker…</p>;
  if (loadError) return <div className="career-alert" role="alert">{loadError}</div>;

  return (
    <section className="career-tracker" aria-label="Career readiness tracker">
      <div className="career-hero">
        <div className="career-hero-heading">
          <span className="career-hero-icon"><Target size={25} /></span>
          <div>
            <div className="career-eyebrow">Your path to software consulting</div>
            <h2>Proof before doubt.</h2>
            <p>Complete the evidence. When a milestone says ready, take the action—no extra courses required.</p>
          </div>
        </div>
        <div className="career-overall"><strong>{allVerified} / {CAREER_SKILLS.length}</strong><span>skills proven</span></div>
      </div>

      <div className="career-stages" aria-label="Select a career milestone">
        {CAREER_GATES.map((gate) => {
          const result = proofSummary(progress, gate);
          const isSelected = selectedGate === gate.id;
          const actionTaken = Boolean(progress.actions?.[gate.id]);
          return (
            <button type="button" key={gate.id} aria-pressed={isSelected}
              className={'career-stage ' + (isSelected ? 'selected' : '')}
              onClick={() => { setSelectedGate(gate.id); setExpandedSkill(''); setDraft(null); setMessage(''); setShowCompleted(false); }}>
              <span className="career-stage-top"><span>0{gate.id}</span>{actionTaken ? <CheckCircle2 size={17} aria-label="Action taken" /> : result.ready ? <Flag size={17} aria-label="Ready" /> : <Circle size={15} aria-hidden="true" />}</span>
              <strong>{gate.title}</strong>
              <span className="career-stage-bottom">{result.complete} of {result.total} proven</span>
              <span className="career-progress-track"><span style={{ width: (result.complete / result.total * 100) + '%' }} /></span>
            </button>
          );
        })}
      </div>

      <div className="career-focus-card">
        <div className="career-focus-heading">
          <div>
            <div className="career-eyebrow">Milestone {currentGate.id} · Current checkpoint</div>
            <h3>{currentGate.title}</h3>
          </div>
          <span className={'career-ready-pill ' + (summary.ready ? 'ready' : '')}>
            {summary.ready ? 'Ready — take action' : (summary.complete + '/' + summary.total + ' proven')}
          </span>
        </div>
        <p className="career-focus-copy">{summary.ready ? 'You have met your evidence threshold. Do not add another prerequisite.' : 'Only these evidence requirements count toward this milestone. Keep learning through WGU rather than adding another curriculum.'}</p>
        <div className="career-action-box">
          <div className="career-action-label">{summary.ready ? 'Do this now' : 'Action unlocked by evidence'}</div>
          <p>{currentGate.action}</p>
          <div className="career-action-footer">
            <span>{currentGate.deadline}</span>
            <button type="button" className={progress.actions?.[currentGate.id] ? 'career-action-done' : 'career-action-button'} disabled={saving}
              onClick={() => toggleAction(currentGate)}>
              {progress.actions?.[currentGate.id] ? <><CheckCircle2 size={15} /> Action recorded · Undo</> : <>Mark action taken <ArrowUpRight size={15} /></>}
            </button>
          </div>
        </div>
      </div>

      <div className="career-skills-header">
        <div>
          <h3>Skills and proof</h3>
          <p>{summary.total - summary.complete} requirement{summary.total - summary.complete === 1 ? '' : 's'} left in this milestone</p>
        </div>
        <label className="career-show-done"><input type="checkbox" checked={showCompleted} onChange={(event) => setShowCompleted(event.target.checked)} /> Show proven skills</label>
      </div>

      {message && <p role="status" className="career-message">{message}</p>}

      {visibleSkills.length === 0 ? (
        <div className="career-completed-empty">
          <CheckCircle2 size={26} />
          <strong>All proof collected for this milestone.</strong>
          <p>Take the action above. You can show completed skills with the toggle.</p>
        </div>
      ) : (
        <div className="career-skills-list">
          {visibleSkills.map((skill) => {
            const proven = isProven(progress, skill);
            const current = savedSkill(progress, skill);
            const expanded = expandedSkill === skill.id;
            return (
              <article className={'career-skill ' + (proven ? 'proven' : '')} key={skill.id}>
                <button type="button" className="career-skill-toggle" aria-expanded={expanded} onClick={() => openSkill(skill)}>
                  <span className="career-proof-icon">{proven ? <CheckCircle2 size={20} /> : <Circle size={20} />}</span>
                  <span className="career-skill-label">
                    <strong>{skill.name}</strong>
                    <span>{skill.domain} <span aria-hidden="true">·</span> {proven ? 'Verified' : current.status}</span>
                  </span>
                  {expanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                </button>
                {expanded && draft && (
                  <div className="career-skill-details">
                    <div className="career-requirement"><strong>Proof required</strong><p>{skill.proof}</p></div>
                    <p className="career-next"><strong>Smallest next step:</strong> {skill.next}</p>
                    <p className="career-course"><BookOpen size={15} /> <span><strong>WGU alignment:</strong> {skill.course}</span></p>

                    <label className="career-field">Learning status
                      <select disabled={draft.verified} value={draft.verified ? 'Verified' : draft.status}
                        onChange={(event) => setDraft({ ...draft, status: event.target.value })}>
                        {statusChoices.map((status) => <option key={status}>{status}</option>)}
                        {draft.verified && <option>Verified</option>}
                      </select>
                    </label>
                    <label className="career-field">Evidence link (GitHub, live demo, private document)
                      <span className="career-input-wrap"><Link2 size={16} />
                        <input type="url" value={draft.evidenceUrl} placeholder="https://…"
                          onChange={(event) => setDraft({ ...draft, evidenceUrl: event.target.value })} />
                      </span>
                    </label>
                    <label className="career-field">Notes (optional)
                      <textarea rows={2} value={draft.notes} placeholder="What did you build, test, or learn?"
                        onChange={(event) => setDraft({ ...draft, notes: event.target.value })} />
                    </label>
                    <label className="career-verify">
                      <input type="checkbox" checked={draft.verified} onChange={(event) => setDraft({ ...draft, verified: event.target.checked })} />
                      <span><strong>I've checked the proof against the requirement.</strong><small>A checkbox without a valid evidence link never counts.</small></span>
                    </label>
                    <div className="career-edit-actions">
                      <button type="button" className="career-save" disabled={saving} onClick={() => saveSkill(skill)}><Save size={15} /> {saving ? 'Saving…' : 'Save progress'}</button>
                      <button type="button" className="career-cancel" onClick={() => { setExpandedSkill(''); setDraft(null); setMessage(''); }} disabled={saving}>Cancel</button>
                      {validEvidenceUrl(current.evidenceUrl) && <a href={current.evidenceUrl} target="_blank" rel="noopener noreferrer" className="career-open-evidence">View saved evidence <ExternalLink size={14}/></a>}
                    </div>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
      <p className="career-footnote">Progress saves to your signed-in portal account. Skills were copied from your Notion career database; editing here does not sync back to Notion. You may apply for roles before a gate is complete—these gates are anti-procrastination thresholds, not permission slips.</p>
    </section>
  );
}
