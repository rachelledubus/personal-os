import React from 'react';
import { Check } from 'lucide-react';
import './Checkbox.css';

export default function Checkbox({ checked, onChange, label }) {
  return (
    <label className="checkbox-row">
      <button
        type="button"
        className={`checkbox-box ${checked ? 'checked' : ''}`}
        onClick={() => onChange(!checked)}
        aria-pressed={checked}
      >
        {checked && <Check size={14} strokeWidth={3} />}
      </button>
      {label && <span className={`checkbox-label ${checked ? 'done' : ''}`}>{label}</span>}
    </label>
  );
}
