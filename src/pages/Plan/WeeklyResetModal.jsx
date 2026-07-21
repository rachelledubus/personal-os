import React, { useEffect, useState } from 'react';
import Modal from '../../components/ui/Modal.jsx';
import Button from '../../components/ui/Button.jsx';
import { supabase } from '../../lib/supabaseClient.js';
import { markPromptShown, markPromptCompleted } from '../../services/prompts.js';

const COPY = {
  weekly_reset: {
    title: 'Monday Reset',
    subtitle: "Set this week's targets before the week gets away from you.",
  },
  weekly_closeout: {
    title: 'Friday Close-Out',
    subtitle: 'Quick review before the weekend — this becomes your Weekly Review.',
  },
  monthly_snapshot: {
    title: 'Monthly Snapshot',
    subtitle: 'A one-glance summary of last month, auto-filled from your data.',
  },
};

export default function WeeklyResetModal({ promptType, marker, onClose }) {
  const [fields, setFields] = useState({});

  useEffect(() => {
    markPromptShown(promptType, marker);
  }, [promptType, marker]);

  function set(key, value) {
    setFields(prev => ({ ...prev, [key]: value }));
  }

  async function handleSave() {
    if (promptType === 'weekly_closeout') {
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from('weekly_reviews').upsert({
        user_id: user.id,
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
          <label className="reset-field">
            <span>Meaningful conversations target</span>
            <input type="number" defaultValue={10} onChange={e => set('conversationsTarget', e.target.value)} />
          </label>
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
        </div>
      )}

      {promptType === 'monthly_snapshot' && (
        <p>Your business KPIs and pipeline snapshot are ready in Business → Overview.</p>
      )}

      <div className="row" style={{ justifyContent: 'flex-end', marginTop: 'var(--space-5)' }}>
        <Button variant="ghost" onClick={onClose}>Skip for now</Button>
        <Button variant="primary" onClick={handleSave}>Save & continue</Button>
      </div>
    </Modal>
  );
}
