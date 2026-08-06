import React, { useEffect, useState } from 'react';
import Card from '../../components/ui/Card.jsx';
import Button from '../../components/ui/Button.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import ProgressBar from '../../components/ui/ProgressBar.jsx';
import {
  getDailyQueue, recordAnswer, logSession, listTopics, setTopicStatus,
  getTopicMastery, listSessions, seedPracticeIfEmpty, generateMoreProblems, addGeometryFoundations,
} from '../../services/practice.js';

const MISS_REASONS = [
  { key: 'arithmetic_slip', label: 'Arithmetic slip' },
  { key: 'forgot_method', label: 'Forgot the method' },
  { key: 'concept_gap', label: "Don't understand the concept" },
];

// ============================================================
// PRACTICE — pre-calc/calc study system. A small daily queue, not
// the whole bank; spaced repetition resurfaces misses automatically;
// tracks *why* something was missed, not just whether. Built from a
// real spec + a real seeded roadmap, not placeholder content.
// ============================================================
export default function PracticeTab() {
  const [view, setView] = useState('queue'); // queue | topics | progress
  const [queue, setQueue] = useState(null);
  const [current, setCurrent] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [pendingMiss, setPendingMiss] = useState(null); // problem id awaiting a miss-reason pick
  const [sessionCorrect, setSessionCorrect] = useState(0);
  const [sessionAttempted, setSessionAttempted] = useState(0);
  const [sessionTopics, setSessionTopics] = useState([]);
  const [topics, setTopics] = useState([]);
  const [mastery, setMastery] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [seedStatus, setSeedStatus] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [generating, setGenerating] = useState(null);

  async function loadQueue() {
    setQueue(await getDailyQueue());
    setCurrent(0);
    setShowAnswer(false);
  }

  async function loadAll() {
    setLoadError(null);
    try {
      await seedPracticeIfEmpty();
      await addGeometryFoundations();
      await loadQueue();
      setTopics(await listTopics());
      setMastery(await getTopicMastery());
      setSessions(await listSessions());
    } catch (err) {
      setLoadError(err.message || String(err));
    }
  }
  useEffect(() => { loadAll(); }, []);

  async function handleGrade(problem, isCorrect) {
    if (!isCorrect) {
      setPendingMiss(problem.id);
      return;
    }
    await finishGrading(problem, true, null);
  }

  async function finishGrading(problem, isCorrect, missReason) {
    await recordAnswer(problem.id, { userAnswer: null, isCorrect, missReason });
    setSessionAttempted(a => a + 1);
    if (isCorrect) setSessionCorrect(c => c + 1);
    setSessionTopics(t => Array.from(new Set([...t, problem.topic_id])));
    setPendingMiss(null);
    setShowAnswer(false);
    if (current + 1 >= queue.length) {
      await logSession(sessionAttempted + 1, sessionCorrect + (isCorrect ? 1 : 0), Array.from(new Set([...sessionTopics, problem.topic_id])));
      setMastery(await getTopicMastery());
      setSessions(await listSessions());
    }
    setCurrent(c => c + 1);
  }

  async function handleSetLearning(topicId) {
    await setTopicStatus(topicId, 'learning');
    setTopics(await listTopics());
    loadQueue();
  }

  async function handleGenerate(topic) {
    setGenerating(topic.id);
    try {
      const count = await generateMoreProblems(topic.id, topic.name, 'medium');
      setSeedStatus(`Added ${count} new problems to ${topic.name}.`);
    } catch (err) {
      setSeedStatus(`Couldn't generate: ${err.message}`);
    }
    setGenerating(null);
  }

  const problem = queue?.[current];
  const queueDone = queue && current >= queue.length;

  // Simple streak: consecutive days with a session, counting back from today.
  const streakDays = (() => {
    if (sessions.length === 0) return 0;
    const dates = new Set(sessions.map(s => s.session_date));
    let count = 0;
    const d = new Date();
    while (true) {
      const str = d.toISOString().slice(0, 10);
      if (!dates.has(str)) break;
      count += 1;
      d.setDate(d.getDate() - 1);
    }
    return count;
  })();

  return (
    <div className="stack">
      <div className="row" style={{ gap: 4 }}>
        {[['queue', 'Today'], ['topics', 'Topics'], ['progress', 'Progress']].map(([key, label]) => (
          <button key={key} className={`sub-tab ${view === key ? 'active' : ''}`} onClick={() => setView(key)}>{label}</button>
        ))}
      </div>

      {view === 'queue' && (
        <Card>
          <div className="row-between">
            <div className="section-label">Today's practice</div>
            {streakDays > 0 && <span className="muted" style={{ fontSize: 'var(--text-caption)' }}>{streakDays} day streak</span>}
          </div>
          {loadError ? (
            <div style={{ marginTop: 'var(--space-3)' }}>
              <div className="muted" style={{ fontSize: 'var(--text-small)', color: 'var(--danger)' }}>Couldn't load: {loadError}</div>
              <Button size="sm" variant="text" onClick={loadAll} style={{ marginTop: 8 }}>Try again</Button>
            </div>
          ) : queue === null ? (
            <div className="muted" style={{ marginTop: 'var(--space-3)' }}>Loading…</div>
          ) : queue.length === 0 ? (
            <EmptyState icon="sparkles" title="Nothing due today" />
          ) : queueDone ? (
            <div style={{ marginTop: 'var(--space-3)' }}>
              <div className="muted">All done for today — {sessionCorrect}/{sessionAttempted} correct.</div>
              <Button size="sm" variant="text" onClick={loadQueue} style={{ marginTop: 8 }}>Check for more</Button>
            </div>
          ) : (
            <div style={{ marginTop: 'var(--space-3)' }}>
              <div className="muted" style={{ fontSize: 'var(--text-micro)' }}>
                {problem.practice_topics?.name} · Problem {current + 1} of {queue.length}
              </div>
              <div style={{ fontSize: 'var(--text-small)', fontWeight: 700, marginTop: 8, whiteSpace: 'pre-wrap' }}>{problem.prompt}</div>

              {pendingMiss === problem.id ? (
                <div className="stack" style={{ marginTop: 'var(--space-3)', gap: 6 }}>
                  <div className="muted" style={{ fontSize: 'var(--text-caption)' }}>What went wrong?</div>
                  <div className="row" style={{ flexWrap: 'wrap', gap: 4 }}>
                    {MISS_REASONS.map(r => (
                      <button key={r.key} className="sub-tab" onClick={() => finishGrading(problem, false, r.key)}>{r.label}</button>
                    ))}
                  </div>
                </div>
              ) : (
                <>
                  {showAnswer ? (
                    <div className="stack" style={{ marginTop: 'var(--space-3)', gap: 8 }}>
                      <div className="muted" style={{ fontSize: 'var(--text-small)', whiteSpace: 'pre-wrap' }}>{problem.answer}</div>
                      <div className="row" style={{ gap: 8 }}>
                        <Button size="sm" variant="sage" onClick={() => handleGrade(problem, true)}>Got it right</Button>
                        <Button size="sm" variant="ghost" onClick={() => handleGrade(problem, false)}>Got it wrong</Button>
                      </div>
                    </div>
                  ) : (
                    <Button size="sm" variant="text" onClick={() => setShowAnswer(true)} style={{ marginTop: 12 }}>Show answer</Button>
                  )}
                </>
              )}
            </div>
          )}
        </Card>
      )}

      {view === 'topics' && (
        <Card>
          <div className="section-label">Roadmap</div>
          {seedStatus && <div className="muted" style={{ fontSize: 'var(--text-micro)', marginTop: 4 }}>{seedStatus}</div>}
          <div className="stack" style={{ marginTop: 'var(--space-3)', gap: 4 }}>
            {topics.map(t => (
              <div key={t.id} className="row-between" style={{ padding: '6px 0', borderBottom: '1px solid var(--sand)' }}>
                <div>
                  <div style={{ fontSize: 'var(--text-small)' }}>{t.name}</div>
                  <div className="muted" style={{ fontSize: 'var(--text-micro)' }}>{t.phase} · {t.status.replace('_', ' ')}</div>
                </div>
                <div className="row" style={{ gap: 4 }}>
                  {t.status !== 'learning' && <Button size="sm" variant="text" onClick={() => handleSetLearning(t.id)}>Set as current</Button>}
                  <Button size="sm" variant="text" onClick={() => handleGenerate(t)} disabled={generating === t.id}>
                    {generating === t.id ? 'Generating…' : 'Generate more'}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {view === 'progress' && (
        <>
          <Card>
            <div className="section-label">Mastery by topic</div>
            <div className="stack" style={{ marginTop: 'var(--space-3)', gap: 8 }}>
              {mastery.filter(m => m.attempted > 0).length === 0 ? (
                <EmptyState icon="star" title="Nothing attempted yet" />
              ) : mastery.filter(m => m.attempted > 0).map(m => (
                <div key={m.id}>
                  <div className="row-between" style={{ fontSize: 'var(--text-small)' }}>
                    <span>{m.name}</span>
                    <span className="muted">{m.mastery}% · {m.attempted} attempted</span>
                  </div>
                  <ProgressBar value={m.mastery} max={100} tone={m.mastery >= 80 ? 'sage' : m.mastery >= 50 ? 'clay' : 'danger'} />
                </div>
              ))}
            </div>
          </Card>
          <Card>
            <div className="section-label">Sessions (last 90 days)</div>
            <div className="row" style={{ flexWrap: 'wrap', gap: 3, marginTop: 'var(--space-3)' }}>
              {sessions.map(s => (
                <div key={s.id} title={`${s.session_date}: ${s.problems_correct}/${s.problems_attempted}`}
                  style={{
                    width: 14, height: 14, borderRadius: 3,
                    background: s.problems_attempted === 0 ? 'var(--sand)' : s.problems_correct / s.problems_attempted >= 0.7 ? 'var(--sage)' : 'var(--clay)',
                  }} />
              ))}
            </div>
            {sessions.length === 0 && <div className="muted" style={{ fontSize: 'var(--text-small)', marginTop: 8 }}>No sessions logged yet.</div>}
          </Card>
        </>
      )}
    </div>
  );
}
