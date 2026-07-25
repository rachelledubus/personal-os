import React, { useId, cloneElement, isValidElement } from 'react';

/** Formalizes the `.reset-field` pattern (label span + control) that
 *  was already appearing ad hoc in WeeklyResetModal/CeoDashboardView,
 *  and adds the piece neither had: a real error slot, wired to the
 *  control via aria-describedby automatically — so a future form
 *  doesn't need to remember to wire that up by hand. */
export default function FormField({ label, error, hint, children }) {
  const fieldId = useId();
  const errorId = error ? `${fieldId}-error` : undefined;
  const hintId = hint ? `${fieldId}-hint` : undefined;
  const describedBy = [errorId, hintId].filter(Boolean).join(' ') || undefined;

  const control = isValidElement(children)
    ? cloneElement(children, { id: fieldId, 'aria-describedby': describedBy, 'aria-invalid': error ? 'true' : undefined })
    : children;

  return (
    <label className="reset-field" htmlFor={fieldId}>
      {label && <span>{label}</span>}
      {control}
      {hint && !error && <div id={hintId} className="muted" style={{ fontSize: 'var(--text-micro)' }}>{hint}</div>}
      {error && <div id={errorId} style={{ fontSize: 'var(--text-micro)', color: 'var(--danger)' }}>{error}</div>}
    </label>
  );
}
