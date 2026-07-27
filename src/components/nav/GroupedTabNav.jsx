import React from 'react';
import SubTabNav from './SubTabNav.jsx';
import './GroupedTabNav.css';

/** Two-tier tab navigation for pages with more sub-destinations than a
 *  flat row can hold predictably (Business had grown to 10 flat tabs).
 *
 *  groups: [{ key, label, tabs: [{ key, label }] }]
 *
 *  A group with exactly one tab (e.g. Dashboard) renders as a single
 *  top-level pill with no second row underneath it — it doesn't need one.
 *
 *  Grouping is fixed, not adaptive: it never reorders itself based on
 *  usage or recency, per the Shell spec's predictability rule — the
 *  same reason Section.jsx never auto-collapses. The active leaf tab
 *  always determines which group is highlighted, so a deep link like
 *  /business/pipeline still lands on the right group automatically. */
export default function GroupedTabNav({ groups, active, onChange }) {
  const activeGroup = groups.find(g => g.tabs.some(t => t.key === active)) || groups[0];

  return (
    <div className="grouped-tab-nav">
      <div className="grouped-tab-nav-top">
        {groups.map(g => (
          <button
            key={g.key}
            className={`grouped-tab-pill ${activeGroup.key === g.key ? 'active' : ''}`}
            onClick={() => { if (activeGroup.key !== g.key) onChange(g.tabs[0].key); }}
          >
            {g.label}
          </button>
        ))}
      </div>
      {activeGroup.tabs.length > 1 && (
        <SubTabNav tabs={activeGroup.tabs} active={active} onChange={onChange} />
      )}
    </div>
  );
}
