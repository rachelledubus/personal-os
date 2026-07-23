import React from 'react';
import './RunningChibi.css';

// ============================================================
// Four selectable running chibis, sharing one animation framework
// (bob, alternating legs, motion trail, breakpoint reposition) so
// adding a variant later only means drawing a new head/body, not
// rebuilding the running behavior.
// ============================================================

export const CHIBI_VARIANTS = [
  { key: 'bunny', label: 'Bunny' },
  { key: 'cat', label: 'Cat' },
  { key: 'fox', label: 'Fox' },
  { key: 'duck', label: 'Duck' },
];

function BunnyBody() {
  return (
    <g className="chibi-body">
      <ellipse cx="44" cy="38" rx="16" ry="13" fill="var(--cream)" stroke="var(--ink-soft)" strokeWidth="1.2" />
      <g className="chibi-ears">
        <path d="M36 16 Q34 2 40 14" fill="var(--cream)" stroke="var(--ink-soft)" strokeWidth="1.2" />
        <path d="M44 14 Q46 0 50 16" fill="var(--cream)" stroke="var(--ink-soft)" strokeWidth="1.2" />
      </g>
      <circle cx="44" cy="24" r="11" fill="var(--cream)" stroke="var(--ink-soft)" strokeWidth="1.2" />
      <circle cx="40" cy="23" r="1.4" fill="var(--navy)" /><circle cx="48" cy="23" r="1.4" fill="var(--navy)" />
      <path d="M41 28 Q44 30 47 28" stroke="var(--navy)" strokeWidth="1.1" strokeLinecap="round" fill="none" />
      <ellipse cx="35" cy="27" rx="1.8" ry="1.1" fill="var(--blush)" opacity="0.7" /><ellipse cx="53" cy="27" rx="1.8" ry="1.1" fill="var(--blush)" opacity="0.7" />
      <circle cx="30" cy="42" r="4" fill="var(--white)" stroke="var(--ink-soft)" strokeWidth="1" />
    </g>
  );
}

function CatBody() {
  return (
    <g className="chibi-body">
      <ellipse cx="44" cy="38" rx="16" ry="13" fill="var(--sand)" stroke="var(--ink-soft)" strokeWidth="1.2" />
      <g className="chibi-ears">
        <path d="M35 18 L32 6 L42 15 Z" fill="var(--sand)" stroke="var(--ink-soft)" strokeWidth="1.2" />
        <path d="M47 15 L52 5 L53 18 Z" fill="var(--sand)" stroke="var(--ink-soft)" strokeWidth="1.2" />
      </g>
      <circle cx="44" cy="24" r="11" fill="var(--sand)" stroke="var(--ink-soft)" strokeWidth="1.2" />
      <circle cx="40" cy="23" r="1.4" fill="var(--navy)" /><circle cx="48" cy="23" r="1.4" fill="var(--navy)" />
      <path d="M41 28 Q44 30 47 28" stroke="var(--navy)" strokeWidth="1.1" strokeLinecap="round" fill="none" />
      <line x1="30" y1="25" x2="22" y2="23" stroke="var(--ink-soft)" strokeWidth="0.8" />
      <line x1="30" y1="27" x2="22" y2="28" stroke="var(--ink-soft)" strokeWidth="0.8" />
      <path d="M28 42 Q18 38 20 26" stroke="var(--sand)" strokeWidth="5" fill="none" strokeLinecap="round" />
    </g>
  );
}

function FoxBody() {
  return (
    <g className="chibi-body">
      <ellipse cx="44" cy="38" rx="16" ry="13" fill="#E8925C" stroke="var(--ink-soft)" strokeWidth="1.2" />
      <g className="chibi-ears">
        <path d="M35 17 L30 4 L42 15 Z" fill="#E8925C" stroke="var(--ink-soft)" strokeWidth="1.2" />
        <path d="M46 15 L54 4 L53 17 Z" fill="#E8925C" stroke="var(--ink-soft)" strokeWidth="1.2" />
      </g>
      <path d="M38 21 Q44 18 50 21 Q49 30 44 31 Q39 30 38 21 Z" fill="#E8925C" stroke="var(--ink-soft)" strokeWidth="1.2" />
      <circle cx="40" cy="24" r="1.4" fill="var(--navy)" /><circle cx="48" cy="24" r="1.4" fill="var(--navy)" />
      <circle cx="44" cy="30" r="1.3" fill="var(--navy)" />
      <path d="M26 44 Q16 40 20 28 Q26 32 28 42 Z" fill="#E8925C" stroke="var(--ink-soft)" strokeWidth="1" />
      <path d="M18 30 Q17 34 20 36" fill="var(--white)" opacity="0.9" />
    </g>
  );
}

function DuckBody() {
  return (
    <g className="chibi-body">
      <ellipse cx="44" cy="38" rx="17" ry="13" fill="#FDEBC7" stroke="var(--ink-soft)" strokeWidth="1.2" />
      <circle cx="44" cy="24" r="11" fill="#FDEBC7" stroke="var(--ink-soft)" strokeWidth="1.2" />
      <circle cx="41" cy="23" r="1.4" fill="var(--navy)" /><circle cx="48" cy="23" r="1.4" fill="var(--navy)" />
      <path d="M48 26 Q58 25 57 29 Q55 31 47 29 Z" fill="var(--gold)" stroke="var(--ink-soft)" strokeWidth="1" />
      <path d="M32 34 Q22 32 26 42 Q34 44 34 36 Z" fill="var(--white)" stroke="var(--ink-soft)" strokeWidth="1" />
    </g>
  );
}

const VARIANTS = { bunny: BunnyBody, cat: CatBody, fox: FoxBody, duck: DuckBody };

/** A static (non-fixed-position) render of just the animal, for use in
 *  pickers/previews — the real RunningChibi wraps this with fixed
 *  positioning, which a preview thumbnail shouldn't have. */
export function ChibiPreview({ variant = 'bunny' }) {
  const Body = VARIANTS[variant] || BunnyBody;
  return (
    <>
      <Body />
      <g className="chibi-leg-a">
        <path d="M36 48 L32 58" stroke="var(--ink-soft)" strokeWidth="2.4" strokeLinecap="round" />
        <path d="M50 48 L55 57" stroke="var(--ink-soft)" strokeWidth="2.4" strokeLinecap="round" />
      </g>
      <g className="chibi-leg-b">
        <path d="M38 48 L42 59" stroke="var(--ink-soft)" strokeWidth="2.4" strokeLinecap="round" />
        <path d="M48 48 L46 59" stroke="var(--ink-soft)" strokeWidth="2.4" strokeLinecap="round" />
      </g>
    </>
  );
}

export default function RunningChibi({ variant = 'bunny' }) {
  const Body = VARIANTS[variant] || BunnyBody;

  return (
    <div className="running-chibi" aria-hidden="true">
      <svg viewBox="0 0 80 60" className="running-chibi-svg">
        <g className="chibi-trail">
          <line x1="4" y1="40" x2="16" y2="40" stroke="var(--sand)" strokeWidth="2" strokeLinecap="round" />
          <line x1="8" y1="46" x2="18" y2="46" stroke="var(--sand)" strokeWidth="2" strokeLinecap="round" />
        </g>

        <Body />

        <g className="chibi-leg-a">
          <path d="M36 48 L32 58" stroke="var(--ink-soft)" strokeWidth="2.4" strokeLinecap="round" />
          <path d="M50 48 L55 57" stroke="var(--ink-soft)" strokeWidth="2.4" strokeLinecap="round" />
        </g>
        <g className="chibi-leg-b">
          <path d="M38 48 L42 59" stroke="var(--ink-soft)" strokeWidth="2.4" strokeLinecap="round" />
          <path d="M48 48 L46 59" stroke="var(--ink-soft)" strokeWidth="2.4" strokeLinecap="round" />
        </g>
      </svg>
    </div>
  );
}
