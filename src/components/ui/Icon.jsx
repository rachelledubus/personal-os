import React from 'react';

/** Thin wrapper, not a name-string registry — pass the icon component
 *  itself (still import it directly from lucide-react, which is the
 *  tree-shakeable, idiomatic pattern this app already mostly uses).
 *  What this adds: one place that enforces consistent default
 *  size/strokeWidth instead of every call site picking its own.
 *
 *  <Icon icon={ShoppingCart} />
 *  <Icon icon={Check} size={14} tone="success" /> */
const TONE_COLOR = {
  success: 'var(--success)',
  warning: 'var(--warning)',
  danger: 'var(--danger)',
  muted: 'var(--ink-soft)',
};

export default function Icon({ icon: IconComponent, size = 16, strokeWidth = 2, tone, style, ...rest }) {
  if (!IconComponent) return null;
  const color = tone ? TONE_COLOR[tone] : undefined;
  return <IconComponent size={size} strokeWidth={strokeWidth} style={{ color, ...style }} {...rest} />;
}
