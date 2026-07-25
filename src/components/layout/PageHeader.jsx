import React from 'react';

/** Formalizes the `.page-title` pattern. The CSS class already
 *  includes flex + gap, so `icon` just slots in — no need for the
 *  inline `display:flex, alignItems:center, gap:8` that got hand-added
 *  at each call site during the Batch 2 icon migration; this is where
 *  that duplication stops. */
export default function PageHeader({ icon: IconComponent, title, subtitle, actions }) {
  return (
    <div>
      <div className="page-title">
        {IconComponent && <IconComponent size={20} />}
        {title}
      </div>
      {subtitle && <p className="muted" style={{ marginTop: -8, marginBottom: 'var(--space-4)' }}>{subtitle}</p>}
      {actions && <div className="row" style={{ marginBottom: 'var(--space-4)' }}>{actions}</div>}
    </div>
  );
}
