import React, { useEffect, useState } from 'react';
import Card from '../../components/ui/Card.jsx';
import Button from '../../components/ui/Button.jsx';
import ProgressBar from '../../components/ui/ProgressBar.jsx';
import FormField from '../../components/form/FormField.jsx';
import { FormActions } from '../../components/form/FormActions.jsx';
import {
  FEATURE_FLAGS, getAllFeatureFlags, setFeatureFlag, getSleepTargets, setSleepTargets, getPreference, setPreference,
} from '../../services/settings.js';
import {
  seedGuardiansIfEmpty, listGuardians, getXpProgressWithinLevel, getFullHistory, getAchievementProgress,
} from '../../services/guardians.js';
import { pushSupported, notificationPermission, isSubscribed, subscribeToPush, unsubscribeFromPush, sendTestPush } from '../../services/pushNotifications.js';

export default function FeaturesSection() {
  const [flags, setFlags] = useState({});
  const [sleepTargets, setSleepTargetsState] = useState({ bedtime: '22:30', wake_time: '06:00' });
  const [sleepSaved, setSleepSaved] = useState(false);
  const [guardians, setGuardians] = useState(null);
  const [achievements, setAchievements] = useState(null);
  const [expandedHistoryId, setExpandedHistoryId] = useState(null);
  const [fullHistory, setFullHistory] = useState(null);
  const [pushSubscribed, setPushSubscribed] = useState(false);
  const [pushBusy, setPushBusy] = useState(false);
  const [pushError, setPushError] = useState(null);
  const [testStatus, setTestStatus] = useState(null);
  const [timezone, setTimezoneState] = useState('America/New_York');
  const [tzSaved, setTzSaved] = useState(false);

  async function refresh() {
    setFlags(await getAllFeatureFlags());
    setSleepTargetsState(await getSleepTargets());
    await seedGuardiansIfEmpty();
    setGuardians(await listGuardians());
    setAchievements(await getAchievementProgress());
    setPushSubscribed(await isSubscribed());
    setTimezoneState(await getPreference('notification_settings', 'timezone', 'America/New_York'));
  }
  useEffect(() => { refresh(); }, []);

  async function handleEnablePush() {
    setPushBusy(true);
    setPushError(null);
    try {
      await subscribeToPush();
      setPushSubscribed(true);
    } catch (err) {
      setPushError(err.message || String(err));
    }
    setPushBusy(false);
  }

  async function handleDisablePush() {
    setPushBusy(true);
    await unsubscribeFromPush();
    setPushSubscribed(false);
    setPushBusy(false);
  }

  async function handleTestPush() {
    setTestStatus('sending');
    try {
      await sendTestPush();
      setTestStatus('sent');
    } catch (err) {
      setTestStatus(`error: ${err.message || err}`);
    }
    setTimeout(() => setTestStatus(null), 4000);
  }

  async function handleSaveTimezone() {
    await setPreference('notification_settings', 'timezone', timezone);
    setTzSaved(true);
    setTimeout(() => setTzSaved(false), 1500);
  }

  async function toggle(key, value) {
    setFlags(prev => ({ ...prev, [key]: value }));
    await setFeatureFlag(key, value);
  }

  async function handleSaveSleep() {
    await setSleepTargets(sleepTargets);
    setSleepSaved(true);
    setTimeout(() => setSleepSaved(false), 1200);
  }

  async function handleToggleHistory(guardian) {
    if (expandedHistoryId === guardian.id) {
      setExpandedHistoryId(null);
      return;
    }
    setExpandedHistoryId(guardian.id);
    setFullHistory(await getFullHistory(guardian.id));
  }

  return (
    <div className="stack" style={{ gap: 'var(--space-4)' }}>
    <Card>
      <div className="section-label">Notifications</div>
      <p className="muted" style={{ fontSize: 'var(--text-caption)' }}>
        {pushSupported()
          ? "Lets reminders (habits/systems today, medications and appointments once built) reach you even when the app isn't open. On iPhone, this only works after you've added the app to your home screen first."
          : "Push notifications aren't supported in this browser."}
      </p>
      {pushSupported() && (
        <>
          <div className="row" style={{ marginTop: 'var(--space-2)', gap: 'var(--space-2)', alignItems: 'center' }}>
            {pushSubscribed ? (
              <>
                <Button size="sm" variant="ghost" onClick={handleDisablePush} disabled={pushBusy}>Turn off notifications</Button>
                <Button size="sm" variant="text" onClick={handleTestPush} disabled={testStatus === 'sending'}>
                  {testStatus === 'sending' ? 'Sending…' : testStatus === 'sent' ? 'Sent ✓ — check your device' : 'Send test notification'}
                </Button>
              </>
            ) : (
              <Button size="sm" onClick={handleEnablePush} disabled={pushBusy}>
                {pushBusy ? 'Enabling…' : 'Enable notifications'}
              </Button>
            )}
          </div>
          {pushError && <div className="muted" style={{ fontSize: 'var(--text-micro)', marginTop: 4, color: 'var(--danger)' }}>{pushError}</div>}
          {testStatus?.startsWith('error') && <div className="muted" style={{ fontSize: 'var(--text-micro)', marginTop: 4, color: 'var(--danger)' }}>{testStatus}</div>}

          <div className="row" style={{ marginTop: 'var(--space-3)', gap: 'var(--space-2)', alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <FormField label="Your timezone (for time-of-day reminders)" hint="e.g. America/New_York, America/Chicago, America/Los_Angeles">
              <input value={timezone} onChange={e => setTimezoneState(e.target.value)} style={{ minWidth: 220 }} />
            </FormField>
            <FormActions onSave={handleSaveTimezone} saved={tzSaved} saveLabel="Save timezone" />
          </div>
        </>
      )}
    </Card>

    <Card>
      <div className="section-label">Feature toggles</div>
      <div className="stack" style={{ marginTop: 'var(--space-3)' }}>
        {Object.entries(FEATURE_FLAGS).map(([key, meta]) => (
          <label key={key} className="row" style={{ gap: 'var(--space-3)' }}>
            <input type="checkbox" checked={flags[key] ?? meta.default} onChange={e => toggle(key, e.target.checked)} />
            <span style={{ fontSize: 'var(--text-small)' }}>{meta.label}</span>
          </label>
        ))}
      </div>
      <p className="muted" style={{ fontSize: 'var(--text-micro)', marginTop: 'var(--space-3)' }}>
        Changes apply next time you load a page that reads them.
      </p>
    </Card>

    <Card>
      <div className="section-label">Sleep targets</div>
      <p className="muted" style={{ fontSize: 'var(--text-caption)' }}>
        Used by the PM routine countdown — your companion nudges you in the evening if starting your
        routine now would push you past this bedtime or under 8 hours of sleep.
      </p>
      <div className="row" style={{ gap: 'var(--space-4)', marginTop: 'var(--space-3)', flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <FormField label="Target bedtime">
          <input type="time" value={sleepTargets.bedtime}
            onChange={e => setSleepTargetsState({ ...sleepTargets, bedtime: e.target.value })} />
        </FormField>
        <FormField label="Usual wake time">
          <input type="time" value={sleepTargets.wake_time}
            onChange={e => setSleepTargetsState({ ...sleepTargets, wake_time: e.target.value })} />
        </FormField>
        <FormActions onSave={handleSaveSleep} saved={sleepSaved} />
      </div>
    </Card>

    <Card>
      <div className="section-label">Guardians</div>
      <p className="muted" style={{ fontSize: 'var(--text-caption)' }}>
        Track themselves as you use the app — nothing to configure, this is just visibility into their progress.
      </p>
      {guardians === null ? null : (
        <div className="stack" style={{ marginTop: 'var(--space-3)', gap: 'var(--space-3)' }}>
          {guardians.map(g => (
            <div key={g.id}>
              <div className="row-between" style={{ fontSize: 'var(--text-small)' }}>
                <span style={{ fontWeight: 700 }}>{g.name}</span>
                <span className="muted">Level {g.level} · {g.growth_stage} · {g.mood}</span>
              </div>
              <ProgressBar value={getXpProgressWithinLevel(g.experience_points)} max={100} tone="sage" />
              <div className="muted" style={{ fontSize: 'var(--text-micro)', marginTop: 2 }}>{g.experience_points} total XP</div>
              {g.recent_events?.[0]?.reaction && (
                <div style={{ fontSize: 'var(--text-caption)', marginTop: 4, color: 'var(--sage)' }}>{g.recent_events[0].reaction}</div>
              )}
              {(g.unlocked_features || []).includes('full_history') && (
                <>
                  <Button size="sm" variant="text" onClick={() => handleToggleHistory(g)} style={{ marginTop: 4, padding: 0 }}>
                    {expandedHistoryId === g.id ? 'Hide full history' : 'View full history ✨ unlocked at level 3'}
                  </Button>
                  {expandedHistoryId === g.id && fullHistory && (
                    <div className="stack" style={{ marginTop: 'var(--space-2)', gap: 2, maxHeight: 160, overflowY: 'auto' }}>
                      {fullHistory.length === 0 ? (
                        <span className="muted" style={{ fontSize: 'var(--text-micro)' }}>No history yet.</span>
                      ) : fullHistory.map(t => (
                        <div key={t.id} className="row-between" style={{ fontSize: 'var(--text-micro)' }}>
                          <span className="muted">{t.source_table}:{t.event_type}</span>
                          <span className="muted">+{t.amount} XP</span>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </Card>

    <Card>
      <div className="section-label">Achievements</div>
      <p className="muted" style={{ fontSize: 'var(--text-caption)' }}>
        A trophy case, not a to-do list — these track themselves as you use the app, nothing to manage here.
      </p>
      {achievements === null ? null : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 'var(--space-3)', marginTop: 'var(--space-3)' }}>
          {achievements.map(a => (
            <div
              key={a.key}
              className="stack"
              style={{
                alignItems: 'center', textAlign: 'center', gap: 4, padding: 'var(--space-3)',
                borderRadius: 'var(--radius-md)',
                background: a.earned ? 'var(--cream)' : 'transparent',
                border: a.earned ? '2px solid var(--accent)' : '2px solid transparent',
                opacity: a.earned ? 1 : 0.45,
              }}
              title={a.description}
            >
              <div style={{ fontSize: 'var(--text-display)' }}>{a.icon}</div>
              <span style={{ fontSize: 'var(--text-caption)', fontWeight: 700 }}>{a.name}</span>
              <span className="muted" style={{ fontSize: 10 }}>{a.description}</span>
            </div>
          ))}
        </div>
      )}
    </Card>
    </div>
  );
}
