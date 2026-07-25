import React from 'react';

/** Formalizes the existing `.stack` utility class (vertical flex,
 *  gap var(--space-3) by default) — same CSS, now a named, documented
 *  component instead of a bare className nobody discovers. */
export default function Stack({ gap, children, style, ...rest }) {
  return (
    <div className="stack" style={{ gap: gap ? `var(--space-${gap})` : undefined, ...style }} {...rest}>
      {children}
    </div>
  );
}
