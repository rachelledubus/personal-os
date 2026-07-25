import React, { useState } from 'react';
import { Download } from 'lucide-react';
import Card from '../../components/ui/Card.jsx';
import Button from '../../components/ui/Button.jsx';
import { exportAllData, downloadAsFile } from '../../services/dataExport.js';
import { resetAllUserData } from '../../services/accountReset.js';

export default function DataSection() {
  const [exporting, setExporting] = useState(false);

  async function handleExport() {
    setExporting(true);
    const bundle = await exportAllData();
    downloadAsFile(bundle, `personal-os-export-${new Date().toISOString().slice(0, 10)}.json`);
    setExporting(false);
  }

  return (
    <div className="stack" style={{ gap: 'var(--space-4)' }}>
    <Card>
      <div className="section-label">Export your data</div>
      <p className="muted" style={{ fontSize: 'var(--text-caption)' }}>
        Downloads contacts, content, tasks, roadmap, library, backlog, maintenance, finance, and notes as one JSON file.
      </p>
      <Button size="sm" onClick={handleExport} disabled={exporting} style={{ marginTop: 'var(--space-2)' }}>
        <Download size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} />{exporting ? 'Exporting…' : 'Export all data'}
      </Button>
      <p className="muted" style={{ fontSize: 'var(--text-micro)', marginTop: 'var(--space-3)' }}>
        Import/restore isn't built yet — restoring data safely (without risking overwrites) needs its own careful
        pass rather than being rushed in here. Export is safe to use today.
      </p>
    </Card>

    <ResetSection />
    </div>
  );
}

function ResetSection() {
  const [confirmText, setConfirmText] = useState('');
  const [resetting, setResetting] = useState(false);
  const [error, setError] = useState(null);
  const canReset = confirmText === 'DELETE';

  async function handleReset() {
    if (!canReset) return;
    setResetting(true);
    setError(null);
    try {
      await resetAllUserData();
      // A full reload rather than client-side navigation — nearly
      // everything in memory (state, cached lists) is now stale, and
      // this is also the moment every "seed if empty" pattern already
      // built throughout the app (life rhythm, chores, guardians,
      // workout templates) naturally kicks back in on next load.
      window.location.href = '/today';
    } catch (err) {
      setResetting(false);
      setError(err.message || 'Reset failed — nothing was deleted.');
    }
  }

  return (
    <Card style={{ border: '1px solid var(--danger)' }}>
      <div className="section-label" style={{ color: 'var(--danger)' }}>Danger zone</div>
      <p className="muted" style={{ fontSize: 'var(--text-caption)', marginTop: 4 }}>
        Permanently deletes everything — habits, tasks, contacts, Guardian progress, all of it. Your login stays
        intact, but the app comes back completely empty, as if you'd just signed up. <strong>This cannot be undone.</strong>{' '}
        Export your data above first if there's anything you'd want to keep.
      </p>
      <div className="row" style={{ marginTop: 'var(--space-3)', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
        <input
          placeholder='Type "DELETE" to confirm'
          value={confirmText}
          onChange={e => setConfirmText(e.target.value)}
          style={{ borderColor: canReset ? 'var(--danger)' : undefined }}
        />
        <Button
          size="sm"
          variant="accent"
          onClick={handleReset}
          disabled={!canReset || resetting}
          style={canReset ? { background: 'var(--danger)' } : {}}
        >
          {resetting ? 'Deleting everything…' : 'Reset all data'}
        </Button>
      </div>
      {error && <p style={{ fontSize: 'var(--text-caption)', color: 'var(--danger)', marginTop: 'var(--space-2)' }}>{error}</p>}
    </Card>
  );
}
