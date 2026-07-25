import React, { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';

/** Formalizes `.section-label` + the spacing convention around it.
 *
 *  Collapsible is opt-in, off by default — "nothing important should
 *  ever be fully hidden, shrink don't hide" is the app's default
 *  posture. When collapsible IS the right call for a given section,
 *  `defaultOpen` must be a static value you set once for that call
 *  site ("this section always starts collapsed" is fine) — never
 *  something computed from data length, staleness, or any other
 *  runtime heuristic ("the app decided to hide this today" is not
 *  fine, per the UX spec's rule-based-not-adaptive requirement). */
export default function Section({ title, collapsible = false, defaultOpen = true, children }) {
  const [open, setOpen] = useState(defaultOpen);

  if (!collapsible) {
    return (
      <div>
        {title && <div className="section-label">{title}</div>}
        {children}
      </div>
    );
  }

  return (
    <div>
      <button
        className="section-label"
        style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, padding: 0 }}
        onClick={() => setOpen(!open)}
      >
        {open ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
        {title}
      </button>
      {open && children}
    </div>
  );
}
