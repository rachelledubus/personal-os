import React from 'react';

/** Formalizes `.row` (horizontal flex, centered, gap var(--space-3)). */
export function Row({ gap, wrap, children, style, ...rest }) {
  return (
    <div
      className="row"
      style={{ gap: gap ? `var(--space-${gap})` : undefined, flexWrap: wrap ? 'wrap' : undefined, ...style }}
      {...rest}
    >
      {children}
    </div>
  );
}

/** Formalizes `.row-between` (horizontal flex, space-between). */
export function RowBetween({ gap, children, style, ...rest }) {
  return (
    <div className="row-between" style={{ gap: gap ? `var(--space-${gap})` : undefined, ...style }} {...rest}>
      {children}
    </div>
  );
}

/** A wrap-by-default Row — for chip/filter/tag groups that were
 *  previously each hand-adding flexWrap: 'wrap' inline (the sub-tab
 *  filter rows in BusinessPage, the meal-type/energy chips in
 *  ProjectsTab, etc.). Same underlying .row class. */
export function Cluster({ gap = 2, children, style, ...rest }) {
  return (
    <div className="row" style={{ gap: `var(--space-${gap})`, flexWrap: 'wrap', ...style }} {...rest}>
      {children}
    </div>
  );
}

export default Row;
