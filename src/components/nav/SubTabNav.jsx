import React from 'react';
import './SubTabNav.css';

/** Replaces the "TABS.map(t => <button className='sub-tab'>...)" pattern
 *  duplicated in PlannerPage, GrowPage, BusinessPage, and LibraryPage —
 *  same markup, same behavior, one place now.
 *
 *  tabs: [{ key, label }]  active: current key  onChange: (key) => void */
export default function SubTabNav({ tabs, active, onChange }) {
  return (
    <div className="sub-tab-nav">
      {tabs.map(t => (
        <button key={t.key} className={`sub-tab ${active === t.key ? 'active' : ''}`} onClick={() => onChange(t.key)}>
          {t.label}
        </button>
      ))}
    </div>
  );
}