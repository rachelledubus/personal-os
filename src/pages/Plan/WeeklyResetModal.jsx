import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Modal from '../../components/ui/Modal.jsx';
import Button from '../../components/ui/Button.jsx';
import { supabase } from '../../lib/supabaseClient.js';
import { markPromptShown, markPromptCompleted } from '../../services/prompts.js';
import { getBusinessMonthlySnapshot } from '../../services/dailyCheckin.js';
import { mondayOfWeek } from '../../utils/date.js';

const COPY = {
  weekly_reset: {
    title: 'Monday Reset',
    subtitle: "Set this week's one priority before the week gets away from you.",
  },
  weekly_closeout: {
    title: 'Friday Close-Out',
    subtitle: 'Quick review before the weekend — this becomes your Weekly Review.',
  },
  monthly_snapshot: {
    title: 'Monthly Snapshot',
    subtitle: 'A one-glance summary of last month, computed from your actual data.',
  },
};

async function getUserId() {
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id;
}

export default function WeeklyResetModal({ promptType, marker, onClose }) {
  const [fields, setFields] = useState({});
  const [businessSnapshot, setBusinessSnapshot] = useState(null);
  const [goalsAchieved, setGoalsAchieved] = useState(null);

  useEffect(() => {
    markPromptShown(promptType, marker);

    if (promptType === 'weekly_reset') {
      (async () => {
        const userId = await getUserId();
        const { data } = await supabase.from('personal_weekly_resets').select('priority')
          .eq('user_id', userId).eq('week_start', marker).maybeSingle();
        if (data?.priority) setFields(prev => ({ ...prev, priority: data.priority }));
      })();
    }

    if (promptType === 'monthly_snapshot') {
      getBusinessMonthlySnapshot().then(setBusinessSnapshot);
      (async () => {
        const userId = await getUserId();
        const now = new Date();
        const start = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().slice(0, 10);
        const end = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().slice(0, 10);
        const { count } = await supabase.from('goals').select('id', { count: 'exact', head: true })
          .eq('user_id', userId).eq('status', 'Achieved').gte('updated_at', start).lte('updated_at', end + 'T23:59:59');
        setGoalsAchieved(count || 0);
      })();
    }
  }, [promptType, marker]);

  function set(key, value) {
    setFields(prev => ({ ...prev, [key]: value }));
  }

  async function handleSave() {
    const userId = await getUserId();

    if (promptType === 'weekly_reset') {
      await supabase.from('personal_weekly_resets').upsert({
        user_id: userId, week_start: marker, priority: fields.priority || '', updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id,week_start' });
    }

    if (promptType === 'weekly_closeout') {
      await supabase.from('weekly_reviews').upsert({
        user_id: userId,
        week_start: marker,
        wins: fields.wins || '',
        challenges: fields.challenges || '',
        next_week_priorities: fields.priorities || '',
      }, { onConflict: 'user_id,week_start' });
    }

    await markPromptCompleted(promptType, marker);
    onClose();
  }

  const copy = COPY[promptType];

  return (
    <Modal open title={copy.title} onClose={onClose}>
      <p className="muted" style={{ marginTop: -8, marginBottom: 'var(--space-4)' }}>{copy.subtitle}</p>

      {promptType === 'weekly_reset' && (
        <div className="stack">
          <label className="reset-field">
            <span>This week's one priority</span>
            <input value={fields.priority || ''} onChange={e => set('priority', e.target.value)} />
          </label>
          <div className="muted" style={{ fontSize: 12, marginTop: 'var(--space-2)' }}>
            This stays personal — your conversation/follow-up targets for the business live in Business Dashboard.
          </div>
          <Link to="/business/dashboard" onClick={onClose}>
            <Button variant="ghost" size="sm" style={{ marginTop: 4 }}>Set this week's Business targets →</Button>
          </Link>
        </div>
      )}

      {promptType === 'weekly_closeout' && (
        <div className="stack">
          <label className="reset-field">
            <span>Wins this week</span>
            <textarea onChange={e => set('wins', e.target.value)} />
          </label>
          <label className="reset-field">
            <span>Challenges</span>
            <textarea onChange={e => set('challenges', e.target.value)} />
          </label>
          <label className="reset-field">
            <span>Next week's priorities</span>
            <textarea onChange={e => set('priorities', e.target.value)} />
          </label>
          <Link to="/business/dashboard" onClick={onClose}>
            <Button variant="ghost" size="sm" style={{ marginTop: 4 }}>Do the Business Weekly Reflection too →</Button>
          </Link>
        </div>
      )}

      {promptType === 'monthly_snapshot' && (
        <div className="stack">
          <div>
            <div className="section-label" style={{ fontSize: 12 }}>Personal</div>
            <div style={{ marginTop: 4, fontSize: 13 }}>
              {goalsAchieved == null ? 'Loading…' : `${goalsAchieved} goal${goalsAchieved === 1 ? '' : 's'} achieved this month`}
            </div>
          </div>
          <div style={{ marginTop: 'var(--space-3)' }}>
            <div className="section-label" style={{ fontSize: 12 }}>Business</div>
            {businessSnapshot ? (
              <div className="stack" style={{ marginTop: 4, fontSize: 13, gap: 2 }}>
                <div>{businessSnapshot.contactsAdded} contacts added</div>
                <div>{businessSnapshot.dealsClosed} deals closed</div>
                <div>{businessSnapshot.contentPublished} pieces of content published</div>
                <div>{businessSnapshot.marketingCompleted} marketing activities completed</div>
              </div>
            ) : <div className="muted" style={{ fontSize: 13, marginTop: 4 }}>Loading…</div>}
          </div>
        </div>
      )}

      <div className="row" style={{ justifyContent: 'flex-end', marginTop: 'var(--space-5)' }}>
        <Button variant="ghost" onClick={onClose}>Skip for now</Button>
        <Button variant="primary" onClick={handleSave}>Save & continue</Button>
      </div>
    </Modal>
  );
}