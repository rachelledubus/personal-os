import React from 'react';
import { Coffee, Leaf, Sparkles } from 'lucide-react';
import './EmptyState.css';

const ICONS = { coffee: Coffee, leaf: Leaf, sparkles: Sparkles };

export default function EmptyState({ icon = 'leaf', title, subtitle }) {
  const Icon = ICONS[icon] || Leaf;
  return (
    <div className="empty-state">
      <div className="empty-state-icon"><Icon size={22} strokeWidth={1.5} /></div>
      <div className="empty-state-title">{title}</div>
      {subtitle && <div className="empty-state-subtitle">{subtitle}</div>}
    </div>
  );
}
