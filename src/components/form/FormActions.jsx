import React from 'react';
import { Check } from 'lucide-react';
import Button from '../ui/Button.jsx';

/** The save/cancel row repeated at the bottom of nearly every settings
 *  form. `saved` shows a brief confirmation state — includes the Check
 *  icon by default, matching every other "Saved" confirmation across
 *  the app after the Batch 2 icon migration (a plain-text default here
 *  would've been a fresh inconsistency in the primitive meant to
 *  prevent exactly that). */
export function FormActions({ onSave, onCancel, saving, saved, saveLabel = 'Save', savedLabel, cancelLabel = 'Cancel' }) {
  const savedContent = savedLabel ?? <>Saved <Check size={14} style={{ verticalAlign: 'middle' }} /></>;
  return (
    <div className="row" style={{ gap: 'var(--space-2)', marginTop: 'var(--space-3)' }}>
      <Button size="sm" onClick={onSave} disabled={saving}>
        {saving ? 'Saving…' : saved ? savedContent : saveLabel}
      </Button>
      {onCancel && <Button size="sm" variant="text" onClick={onCancel}>{cancelLabel}</Button>}
    </div>
  );
}

export default FormActions;
