import React, { useEffect, useState } from 'react';
import { Check } from 'lucide-react';
import Card from '../../components/ui/Card.jsx';
import Button from '../../components/ui/Button.jsx';
import Skeleton from '../../components/ui/Skeleton.jsx';
import { getPreference, setPreference } from '../../services/settings.js';

// Uses the existing generic user_preferences store (category + key +
// jsonb value) — same mechanism every Control Center setting already
// uses. No migration, no new table: this is 7 free-text fields with
// no need to be queried/joined, which is exactly what that store is for.
const CATEGORY = 'dream_life';

// `questions` are prompts to think with, not separate fields — still
// one textarea per section underneath (same data model as before, so
// ProjectsTab's vision-link picker, which only reads .key/.label,
// keeps working unchanged).
export const SECTIONS = [
  {
    key: 'ideal_day', label: 'My Ideal Day',
    placeholder: 'Walk through it hour by hour — where are you, what are you doing, how does it feel?',
    questions: [
      "What time do you wake up, and what's the first hour like?",
      'What does the middle of your day actually look like — energy, focus, who you\u2019re with?',
      "What happens in the evening?",
      'What\u2019s one small moment that makes the whole day feel good?',
    ],
  },
  {
    key: 'ideal_week', label: 'My Ideal Week',
    placeholder: 'What rhythm do the 7 days have? What\u2019s non-negotiable?',
    questions: [
      "What's the same every single week — the non-negotiables?",
      'How many days feel like "work," and how many feel like rest or flex?',
      'What does the weekend actually look like?',
      'Where do exercise, hobbies, or people you care about fit in?',
    ],
  },
  {
    key: 'ideal_home', label: 'My Ideal Home',
    placeholder: 'Where do you live, what does it look and feel like?',
    questions: [
      'Where is it — city, neighborhood, type of place?',
      'What does it feel like the moment you walk in?',
      "What's your favorite room, and why?",
      "Who else is there with you, day to day?",
    ],
  },
  {
    key: 'ideal_business', label: 'My Ideal Business',
    placeholder: 'What does the business look like when it\u2019s working the way you want?',
    questions: [
      "What are you actually doing, day to day, when it's working?",
      'What does it feel like — the pace, the pressure, the freedom?',
      "What's off your plate now that used to take your time?",
      'What does "success" look like at a glance?',
    ],
  },
  {
    key: 'ideal_relationships', label: 'My Ideal Relationships',
    placeholder: 'Who\u2019s in your life, and what do those relationships feel like?',
    questions: [
      'Who\u2019s closest to you, and how often do you actually see them?',
      'What does a normal conversation or hangout feel like?',
      'Is there distance you want — more from some people, less from others?',
      "What do your relationships give you that feels missing today?",
    ],
  },
  {
    key: 'ideal_health', label: 'My Ideal Health',
    placeholder: 'How do you feel in your body? What does your routine look like?',
    questions: [
      'How do you feel when you wake up — energy, pain, mood?',
      'What does movement look like in a normal week?',
      "What does your relationship with food feel like?",
      "What's different about your body or mind, compared to today?",
    ],
  },
  {
    key: 'ideal_finances', label: 'My Ideal Finances',
    placeholder: 'What does financial ease look like for you?',
    questions: [
      'What does "financial ease" actually feel like, day to day?',
      "What are you not worrying about anymore?",
      'What\u2019s one thing you\u2019d spend on without a second thought?',
      "What does your savings or safety net look like?",
    ],
  },
];

export default function DreamLifeTab() {
  const [values, setValues] = useState({});
  const [loaded, setLoaded] = useState(false);
  const [saved, setSaved] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

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
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }

  function goTo(index) {
    save(SECTIONS[activeIndex].key); // don't lose anything typed if you jump before blurring
    setActiveIndex(index);
  }

  if (!loaded) {
    return (
      <div className="stack" style={{ gap: 'var(--space-3)' }}>
        <Skeleton variant="card" />
      </div>
    );
  }

  const section = SECTIONS[activeIndex];

  return (
    <div className="stack" style={{ gap: 'var(--space-4)' }}>
      <p className="muted" style={{ marginTop: -4 }}>
        Get clear on what you actually want before planning how to get there. Every goal you set can point back to one of these.
      </p>

      {/* Stepper — fixed order, every section always one click away.
          Nothing here ever hides or reorders based on what you've
          written; jump anywhere, anytime. */}
      <div className="row" style={{ flexWrap: 'wrap', gap: 6 }}>
        {SECTIONS.map((s, i) => {
          const answered = (values[s.key] || '').trim().length > 0;
          return (
            <button
              key={s.key}
              className={`sub-tab ${activeIndex === i ? 'active' : ''}`}
              style={{ fontSize: 'var(--text-caption)', display: 'inline-flex', alignItems: 'center', gap: 4 }}
              onClick={() => goTo(i)}
            >
              {answered && <Check size={11} />}
              {i + 1}. {s.label.replace('My Ideal ', '')}
            </button>
          );
        })}
      </div>

      <Card>
        <div className="section-label">{section.label}</div>
        <div className="stack" style={{ marginTop: 'var(--space-2)', gap: 4 }}>
          {section.questions.map((q, i) => (
            <div key={i} className="muted" style={{ fontSize: 'var(--text-small)' }}>• {q}</div>
          ))}
        </div>
        <textarea
          value={values[section.key] || ''}
          placeholder={section.placeholder}
          onChange={e => setValues(v => ({ ...v, [section.key]: e.target.value }))}
          onBlur={() => save(section.key)}
          style={{ width: '100%', minHeight: 140, marginTop: 'var(--space-3)' }}
        />
        {saved && <div className="muted" style={{ fontSize: 'var(--text-micro)' }}>Saved</div>}

        <div className="row-between" style={{ marginTop: 'var(--space-4)' }}>
          <Button size="sm" variant="ghost" onClick={() => goTo(Math.max(0, activeIndex - 1))} disabled={activeIndex === 0}>
            ← Back
          </Button>
          <span className="muted" style={{ fontSize: 'var(--text-caption)' }}>{activeIndex + 1} of {SECTIONS.length}</span>
          <Button size="sm" onClick={() => goTo(Math.min(SECTIONS.length - 1, activeIndex + 1))} disabled={activeIndex === SECTIONS.length - 1}>
            Next →
          </Button>
        </div>
      </Card>
    </div>
  );
}
