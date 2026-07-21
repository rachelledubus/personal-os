import React from 'react';
import { Coffee, Leaf, Sparkles, Calendar, Star, Dumbbell, Map, Phone, Lightbulb, Circle } from 'lucide-react';
import './EmptyState.css';

const ICONS = {
  coffee: Coffee, leaf: Leaf, sparkles: Sparkles, calendar: Calendar,
  star: Star, dumbbell: Dumbbell, map: Map, phone: Phone, lightbulb: Lightbulb, circle: Circle,
};

// A soft, round, Ghibli-soot-sprite-ish little companion — two dot
// eyes, a gentle blush, nothing sharp anywhere. Sits behind the actual
// icon so every empty state feels like a cozy pause, not a dead end.
function BlobMascot() {
  return (
    <svg viewBox="0 0 64 64" className="empty-state-blob" aria-hidden="true">
      <ellipse cx="32" cy="36" rx="26" ry="22" fill="var(--cream)" />
      <ellipse cx="32" cy="34" rx="26" ry="22" fill="var(--sage)" opacity="0.18" />
      <circle cx="23" cy="32" r="2.4" fill="var(--navy)" opacity="0.7" />
      <circle cx="41" cy="32" r="2.4" fill="var(--navy)" opacity="0.7" />
      <ellipse cx="18" cy="38" rx="4" ry="2.4" fill="var(--blush)" opacity="0.6" />
      <ellipse cx="46" cy="38" rx="4" ry="2.4" fill="var(--blush)" opacity="0.6" />
      <path d="M 26 40 Q 32 44 38 40" stroke="var(--navy)" strokeWidth="1.6" strokeLinecap="round" fill="none" opacity="0.6" />
    </svg>
  );
}

export default function EmptyState({ icon = 'leaf', title, subtitle }) {
  const Icon = ICONS[icon] || Leaf;
  return (
    <div className="empty-state">
      <div className="empty-state-icon">
        <BlobMascot />
        <Icon size={18} strokeWidth={1.5} className="empty-state-icon-glyph" />
      </div>
      <div className="empty-state-title">{title}</div>
      {subtitle && <div className="empty-state-subtitle">{subtitle}</div>}
    </div>
  );
}
