import React, { useId } from 'react';
import { Coffee, Leaf, Sparkles, Calendar, Star, Dumbbell, Map, Phone, Lightbulb, Circle, Megaphone } from 'lucide-react';
import './EmptyState.css';

const ICONS = {
  coffee: Coffee, leaf: Leaf, sparkles: Sparkles, calendar: Calendar,
  star: Star, dumbbell: Dumbbell, map: Map, phone: Phone, lightbulb: Lightbulb, circle: Circle,
  megaphone: Megaphone,
};

// Hand-drawn bullet-journal style, replacing the old smooth blob
// mascot — a wobbly pen-circle (deliberately imperfect bezier control
// points, not a true <circle>), the SVG "roughen" filter (feTurbulence
// + feDisplacementMap) applied to both the circle stroke and the icon
// so neither reads as machine-perfect, and a doodled underline beneath
// the title — the same "looks sketched into a notebook, not rendered"
// quality the new Journal/Trackers spreads are built around, applied
// here too so the whole app shares one hand-drawn language instead of
// two competing empty-state styles.
export default function EmptyState({ icon = 'leaf', title, subtitle }) {
  const Icon = ICONS[icon] || Leaf;
  const filterId = useId();
  const roughId = `empty-state-rough-${filterId}`;

  return (
    <div className="empty-state">
      <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true">
        <filter id={roughId}>
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="3" result="noise" />
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="2.2" />
        </filter>
      </svg>

      <div className="empty-state-icon">
        <svg viewBox="0 0 84 84" className="empty-state-sketch-circle" aria-hidden="true" style={{ filter: `url(#${roughId})` }}>
          <path
            d="M 42 6 C 62 6 78 20 78 42 C 78 63 63 79 41 78 C 21 77 6 62 7 41 C 8 21 22 6 42 6 Z"
            fill="var(--cream)"
            stroke="var(--sage)"
            strokeWidth="2.5"
          />
        </svg>
        <Icon size={20} strokeWidth={1.75} className="empty-state-icon-glyph" style={{ filter: `url(#${roughId})` }} />
      </div>

      <div className="empty-state-title">{title}</div>
      <svg viewBox="0 0 90 8" className="empty-state-scribble-underline" aria-hidden="true">
        <path d="M 4 4 Q 25 1 45 4 T 86 4" fill="none" stroke="var(--sage)" strokeWidth="2" strokeLinecap="round" opacity="0.5" />
      </svg>
      {subtitle && <div className="empty-state-subtitle">{subtitle}</div>}
    </div>
  );
}
