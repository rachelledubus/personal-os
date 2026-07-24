import React, { useEffect, useState } from 'react';
import Card from '../../components/ui/Card.jsx';
import { getPreference, setPreference } from '../../services/settings.js';
import { currentMonthStr } from '../../utils/date.js';

const CATEGORY = 'monthly_theme';
const FEELING_OPTIONS = ['Calm', 'Confident', 'Creative', 'Focused', 'Grounded', 'Energized', 'Spacious', 'Playful'];

export default function MonthlyThemeCard() {
  const month = currentMonthStr(); // e.g. "2026-07" — one row per month, keyed by this
  const [theme, setTheme] = useState('');
  const [feelings, setFeelings] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    (async () => {
      const value = await getPreference(CATEGORY, month, null);
      setTheme(value?.theme || '');
      setFeelings(value?.feelings || []);
      setLoaded(true);
    })();
  }, [month]);

  async function save(nextTheme = theme, nextFeelings = feelings) {
    await setPreference(CATEGORY, month, { theme: nextTheme, feelings: nextFeelings });
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }

  function toggleFeeling(f) {
    const next = feelings.includes(f) ? feelings.filter(x => x !== f) : [...feelings, f];
    setFeelings(next);
    save(theme, next);
  }

  if (!loaded) return null;

  const monthLabel = new Date(month + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  return (
    <Card>
      <div className="section-label">This Month's Theme — {monthLabel}</div>
      <input
        placeholder="e.g. Simplify + Create Space"
        value={theme}
        onChange={e => setTheme(e.target.value)}
        onBlur={() => save()}
        style={{ width: '100%', marginTop: 'var(--space-2)' }}
      />
      <div className="muted" style={{ fontSize: 12, marginTop: 'var(--space-3)', marginBottom: 'var(--space-2)' }}>
        Desired feelings this month — evaluate decisions against these
      </div>
      <div className="row" style={{ flexWrap: 'wrap', gap: 6 }}>
        {FEELING_OPTIONS.map(f => (
          <button
            key={f}
            className={`sub-tab ${feelings.includes(f) ? 'active' : ''}`}
            style={{ fontSize: 12 }}
            onClick={() => toggleFeeling(f)}
          >
            {f}
          </button>
        ))}
      </div>
      {saved && <div className="muted" style={{ fontSize: 11, marginTop: 6 }}>Saved</div>}
    </Card>
  );
}
