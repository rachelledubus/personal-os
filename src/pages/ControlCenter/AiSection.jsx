import React, { useEffect, useState } from 'react';
import Card from '../../components/ui/Card.jsx';
import FormField from '../../components/form/FormField.jsx';
import { TextArea } from '../../components/form/FormControls.jsx';
import { FormActions } from '../../components/form/FormActions.jsx';
import { getCustomAiInstructions, setCustomAiInstructions } from '../../services/settings.js';
import { getAutonomyLevel, setAutonomyLevel } from '../../services/aiOperator.js';

export default function AiSection() {
  const [instructions, setInstructions] = useState('');
  const [autonomy, setAutonomy] = useState('confirm');
  const [saved, setSaved] = useState(false);

  async function refresh() {
    setInstructions(await getCustomAiInstructions());
    setAutonomy(await getAutonomyLevel());
  }
  useEffect(() => { refresh(); }, []);

  async function handleSave() {
    await setCustomAiInstructions(instructions);
    setSaved(true);
    setTimeout(() => setSaved(false), 1200);
  }

  async function handleAutonomyChange(level) {
    setAutonomy(level);
    await setAutonomyLevel(level);
  }

  return (
    <div className="stack" style={{ gap: 'var(--space-4)' }}>
      <Card>
        <div className="section-label">Custom instructions for AI features</div>
        <p className="muted" style={{ fontSize: 'var(--text-caption)' }}>Applied to AI-drafted follow-ups and content repurposing, on top of the base brand voice rules.</p>
        <div style={{ marginTop: 'var(--space-2)' }}>
          <FormField>
            <TextArea
              value={instructions}
              onChange={e => setInstructions(e.target.value)}
              minHeight={80}
              placeholder="e.g. Keep messages under 100 words. Never mention pricing directly."
            />
          </FormField>
        </div>
        <FormActions onSave={handleSave} saved={saved} saveLabel="Save instructions" />
      </Card>

      <Card>
        <div className="section-label">AI autonomy</div>
        <p className="muted" style={{ fontSize: 'var(--text-caption)' }}>
          Currently every AI action proposes and waits for your confirmation. "Auto-apply" isn't wired to skip
          confirmation yet — this sets the preference for when that's built.
        </p>
        <select value={autonomy} onChange={e => handleAutonomyChange(e.target.value)} style={{ marginTop: 'var(--space-2)' }}>
          <option value="confirm">Always ask first (current behavior)</option>
          <option value="auto">Auto-apply when confident (not yet active)</option>
        </select>
      </Card>
    </div>
  );
}
