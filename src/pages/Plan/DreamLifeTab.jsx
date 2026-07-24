import React, { useEffect, useState } from 'react';
import Card from '../../components/ui/Card.jsx';
import { getPreference, setPreference } from '../../services/settings.js';

// Uses the existing generic user_preferences store (category + key +
// jsonb value) — same mechanism every Control Center setting already
// uses. No migration, no new table: this is 7 free-text fields with
// no need to be queried/joined, which is exactly what that store is for.
const CATEGORY = 'dream_life';

const SECTIONS = [
  { key: 'ideal_day', label: 'My Ideal Day', placeholder: 'Walk through it hour by hour — where are you, what are you doing, how does it feel?' },
  { key: 'ideal_week', label: 'My Ideal Week', placeholder: 'What rhythm do the 7 days have? What\u2019s non-negotiable?' },
  { key: 'ideal_home', label: 'My Ideal Home', placeholder: 'Where do you live, what does it look and feel like?' },
  { key: 'ideal_business', label: 'My Ideal Business', placeholder: 'What does the business look like when it\u2019s working the way you want?' },
  { key: 'ideal_relationships', label: 'My Ideal Relationships', placeholder: 'Who\u2019s in your life, and what do those relationships feel like?' },
  { key: 'ideal_health', label: 'My Ideal Health', placeholder: 'How do you feel in your body? What does your routine look like?' },
  { key: 'ideal_finances', label: 'My Ideal Finances', placeholder: 'What does financial ease look like for you?' },
];

export default function DreamLifeTab() {
  const [values, setValues] = useState({});
  const [loaded, setLoaded] = useState(false);
  const [savedKey, setSavedKey] = useState(null);

  useEffect(() => {
    (async () => {
      const entries = await Promise.all(SECTIONS.map(s => getPreference(CATEGORY, s.key, '')));
      const next = {};
      SECTIONS.forEach((s, i) => { next[s.key] = entries[i] || ''; });
      setValues(next);
      setLoaded(true);
    })();
  }, []);

  async function save(key) {
    await setPreference(CATEGORY, key, values[key] || '');
    setSavedKey(key);
    setTimeout(() => setSavedKey(k => (k === key ? null : k)), 1500);
  }

  if (!loaded) return null;

  return (
    <div className="stack" style={{ gap: 'var(--space-4)' }}>
      <p className="muted" style={{ marginTop: -4 }}>
        Get clear on what you actually want before planning how to get there. Every goal you set can point back to one of these.
      </p>
      {SECTIONS.map(s => (
        <Card key={s.key}>
          <div className="section-label">{s.label}</div>
          <textarea
            value={values[s.key] || ''}
            placeholder={s.placeholder}
            onChange={e => setValues(v => ({ ...v, [s.key]: e.target.value }))}
            onBlur={() => save(s.key)}
            style={{ width: '100%', minHeight: 90, marginTop: 'var(--space-2)' }}
          />
          {savedKey === s.key && <div className="muted" style={{ fontSize: 11 }}>Saved</div>}
        </Card>
      ))}
    </div>
  );
}
