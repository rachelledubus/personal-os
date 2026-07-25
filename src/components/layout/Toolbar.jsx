import React from 'react';

/** For filter/action rows above a list or board — currently hand-built
 *  per page (e.g. BusinessPage's pipeline stage filters). Not wired
 *  into any existing page yet; exists so the monolith splits (Batches
 *  6-9) have somewhere to reach for instead of rebuilding this per
 *  page again. */
export default function Toolbar({ children, style }) {
  return (
    <div className="row" style={{ flexWrap: 'wrap', gap: 'var(--space-2)', marginBottom: 'var(--space-3)', ...style }}>
      {children}
    </div>
  );
}
