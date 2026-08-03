import React from 'react';
import { Check } from 'lucide-react';
import './Checkbox.css';

export default function Checkbox({ checked, onChange, label, disabled = false }) {
  return (
    <label className="checkbox-row" style={disabled ? { cursor: 'not-allowed', opacity: 0.6 } : undefined}>
      <button
        type="button"
        className={`checkbox-box ${checked ? 'checked' : ''}`}
        onClick={() => !disabled && onChange(!checked)}
        aria-pressed={checked}
        disabled={disabled}
      >
        {checked && <Check size={14} strokeWidth={3} />}
      </button>
      {label && <span className={`checkbox-label ${checked ? 'done' : ''}`}>{label}</span>}
    </label>
  );
}
