import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { RotateCcw } from 'lucide-react';
import Card from '../../components/ui/Card.jsx';
import Button from '../../components/ui/Button.jsx';
import { useCapacityMode } from '../../components/layout/CapacityModeContext.jsx';
import { ACTIVITY_TYPES, logActivity, getWeeklyScorecard } from '../../services/businessActivityLog.js';
import { getWeeklyReview, setWeeklyReview } from '../../services/dailyCheckin.js';

// ============================================================
// WEEKLY SCORECARD + BOUNDED REVIEW — the load-bearing fix. CRM
// logging and the weekly review both fell off from interaction cost,
// not motivation: logging a touch took five steps, and review opened
// to open-ended prompts instead of the bounded, tap-first pattern
// already used elsewhere (Client Discovery Framework). This applies
// that same fix here. One log (business_activity_log) feeds both the
// scorecard strip and the review's auto-populated numbers.
// ============================================================

const WORKED_CHIPS = ['Consistent follow-up', 'One good conversation', 'Content published', 'Partner touch made', 'Nothing this week'];
const DIDNT_CHIPS = ['Fell behind on follow-up', 'Inconsistent activity', 'Distracted by other things', 'Nothing major', 'Not sure'];
const ATTENTION_CHIPS = ['A specific lead going cold', 'A pending listing/transaction', 'The follow-up system itself', 'Nothing urgent'];
const PRIORITY_CHIPS = ['Consistent follow-up', 'Content creation', 'Partner outreach', 'Website/lead magnet work', 'Client work'];

function ChipRow({ options, selected, onToggle }) {
  return (
    <div className="row" style={{ flexWrap: 'wrap', gap: 4 }}>
      {options.map(opt => (
        <button key={opt} className={`sub-tab ${selected.includes(opt) ? 'active' : ''}`} style={{ fontSize: 'var(--text-micro)' }} onClick={() => onToggle(opt)}>
          {opt}
        </button>
      ))}
    </div>
  );
}

export default function WeeklyScorecardAndReview() {
  const { mode } = useCapacityMode();
  const [counts, setCounts] = useState({ conversation: 0, partner_touch: 0, content_published: 0, follow_up: 0 });
  const [logging, setLogging] = useState(null);
  const [review, setReview] = useState(null);
  const [editingReview, setEditingReview] = useState(false);
  const [reviewForm, setReviewForm] = useState({
    what_worked_chips: [], what_worked: '', what_didnt_chips: [], what_didnt: '',
    needs_attention_chips: [], needs_attention: '', next_week_priorities_chips: [], next_week_priorities: '',
  });

  async function refresh() {
    setCounts(await getWeeklyScorecard());
    const rv = await getWeeklyReview();
    setReview(rv);
    if (rv) {
      setReviewForm({
        what_worked_chips: rv.what_worked_chips || [], what_worked: rv.what_worked || '',
        what_didnt_chips: rv.what_didnt_chips || [], what_didnt: rv.what_didnt || '',
        needs_attention_chips: rv.needs_attention_chips || [], needs_attention: rv.needs_attention || '',
        next_week_priorities_chips: rv.next_week_priorities_chips || [], next_week_priorities: rv.next_week_priorities || '',
      });
    }
  }
  useEffect(() => { refresh(); }, []);

  async function handleLog(type) {
    setLogging(type);
    await logActivity(type);
    setLogging(null);
    refresh();
  }

  function toggleChip(field, value) {
    setReviewForm(prev => ({
      ...prev,
      [field]: prev[field].includes(value) ? prev[field].filter(v => v !== value) : [...prev[field], value],
    }));
  }

  async function handleSaveReview() {
    await setWeeklyReview(reviewForm);
    setEditingReview(false);
    refresh();
  }

  return (
    <>
      <Card style={mode === 'low' ? { opacity: 0.75 } : undefined}>
        <div className="section-label">This week's activity</div>
        <div className="row" style={{ flexWrap: 'wrap', gap: 'var(--space-2)', marginTop: 'var(--space-2)' }}>
          {ACTIVITY_TYPES.map(t => (
            <Button key={t.key} size="sm" variant="ghost" onClick={() => handleLog(t.key)} disabled={logging === t.key}>
              {logging === t.key ? '…' : `+ ${t.label}`}
            </Button>
          ))}
        </div>
        {/* Counts display plainly — no color-coding zero as bad, no streak language, no shame framing, per spec: "even zeros are data." */}
        <div className="row" style={{ flexWrap: 'wrap', gap: 'var(--space-4)', marginTop: 'var(--space-3)' }}>
          {ACTIVITY_TYPES.map(t => (
            <div key={t.key} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 'var(--text-subtitle)', fontWeight: 700 }}>{counts[t.key]}</div>
              <div className="muted" style={{ fontSize: 'var(--text-micro)' }}>{t.label}</div>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <div className="row-between">
          <div>
            <div className="section-label">Weekly reflection</div>
            <Link to="/review" className="muted" style={{ fontSize: 'var(--text-micro)', display: 'inline-flex', alignItems: 'center', gap: 3 }}><RotateCcw size={12} />All reviews →</Link>
          </div>
          <Button size="sm" variant="text" onClick={() => setEditingReview(!editingReview)}>
            {editingReview ? 'Cancel' : (review ? 'Edit' : 'Add reflection')}
          </Button>
        </div>
        {editingReview ? (
          <div className="stack" style={{ marginTop: 'var(--space-3)', gap: 'var(--space-3)' }}>
            <div>
              <div style={{ fontSize: 'var(--text-small)', fontWeight: 700, marginBottom: 4 }}>What worked?</div>
              <ChipRow options={WORKED_CHIPS} selected={reviewForm.what_worked_chips} onToggle={v => toggleChip('what_worked_chips', v)} />
              <input placeholder="Anything else (optional)" value={reviewForm.what_worked} onChange={e => setReviewForm({ ...reviewForm, what_worked: e.target.value })} style={{ marginTop: 6 }} />
            </div>
            <div>
              <div style={{ fontSize: 'var(--text-small)', fontWeight: 700, marginBottom: 4 }}>What didn't?</div>
              <ChipRow options={DIDNT_CHIPS} selected={reviewForm.what_didnt_chips} onToggle={v => toggleChip('what_didnt_chips', v)} />
              <input placeholder="Anything else (optional)" value={reviewForm.what_didnt} onChange={e => setReviewForm({ ...reviewForm, what_didnt: e.target.value })} style={{ marginTop: 6 }} />
            </div>
            <div>
              <div style={{ fontSize: 'var(--text-small)', fontWeight: 700, marginBottom: 4 }}>What needs attention?</div>
              <ChipRow options={ATTENTION_CHIPS} selected={reviewForm.needs_attention_chips} onToggle={v => toggleChip('needs_attention_chips', v)} />
              <input placeholder="Anything else (optional)" value={reviewForm.needs_attention} onChange={e => setReviewForm({ ...reviewForm, needs_attention: e.target.value })} style={{ marginTop: 6 }} />
            </div>
            <div>
              <div style={{ fontSize: 'var(--text-small)', fontWeight: 700, marginBottom: 4 }}>Next week's priority?</div>
              <ChipRow options={PRIORITY_CHIPS} selected={reviewForm.next_week_priorities_chips} onToggle={v => toggleChip('next_week_priorities_chips', v)} />
              <input placeholder="Anything else (optional)" value={reviewForm.next_week_priorities} onChange={e => setReviewForm({ ...reviewForm, next_week_priorities: e.target.value })} style={{ marginTop: 6 }} />
            </div>
            <div><Button size="sm" onClick={handleSaveReview}>Save reflection</Button></div>
          </div>
        ) : review ? (
          <div className="stack" style={{ marginTop: 'var(--space-2)', fontSize: 'var(--text-small)', gap: 4 }}>
            {(review.what_worked_chips?.length > 0 || review.what_worked) && <div><strong>Went well:</strong> {[...(review.what_worked_chips || []), review.what_worked].filter(Boolean).join(', ')}</div>}
            {(review.what_didnt_chips?.length > 0 || review.what_didnt) && <div><strong>Struggle:</strong> {[...(review.what_didnt_chips || []), review.what_didnt].filter(Boolean).join(', ')}</div>}
            {(review.needs_attention_chips?.length > 0 || review.needs_attention) && <div><strong>Needs attention:</strong> {[...(review.needs_attention_chips || []), review.needs_attention].filter(Boolean).join(', ')}</div>}
            {(review.next_week_priorities_chips?.length > 0 || review.next_week_priorities) && <div><strong>Next week:</strong> {[...(review.next_week_priorities_chips || []), review.next_week_priorities].filter(Boolean).join(', ')}</div>}
          </div>
        ) : (
          <div className="muted" style={{ fontSize: 'var(--text-small)', marginTop: 'var(--space-2)' }}>No reflection recorded for this week yet.</div>
        )}
      </Card>
    </>
  );
}
