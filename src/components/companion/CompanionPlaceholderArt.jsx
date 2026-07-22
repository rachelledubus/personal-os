import React from 'react';

// ============================================================
// PLACEHOLDER ART — active while USE_SPRITE_SHEET is false in
// companion.config.js. This is a layered SVG (not a single flat
// shape), animated via CSS classes applied by Companion.jsx based
// on animation state ('idle' | 'blinking' | 'running'). It exists so
// the position/animation *engine* is demonstrably working end-to-end
// before real character art is dropped in — swap it out by flipping
// USE_SPRITE_SHEET on and adding /public/companion/sprite-sheet.png;
// nothing in Companion.jsx needs to change to do that.
// ============================================================

export default function CompanionPlaceholderArt({ animState }) {
  return (
    <svg
      viewBox="0 0 96 96"
      className={`companion-art companion-anim-${animState}`}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="companionBody" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#D98A63" />
          <stop offset="100%" stopColor="#C0704F" />
        </linearGradient>
        <radialGradient id="companionCheek" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#E8C4B8" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#E8C4B8" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* tail — swishes gently on idle, flicks faster on run */}
      <g className="companion-part companion-tail">
        <path d="M68 62 Q88 58 84 40 Q80 26 66 32 Q78 38 74 50 Q70 60 62 60 Z" fill="url(#companionBody)" />
        <ellipse cx="80" cy="38" rx="6" ry="5" fill="#FBF8F2" />
      </g>

      {/* legs — only visibly animated during run state */}
      <g className="companion-part companion-legs">
        <rect x="30" y="78" width="9" height="12" rx="4" fill="#A85436" />
        <rect x="58" y="78" width="9" height="12" rx="4" fill="#A85436" />
      </g>

      {/* body — this is the group that "breathes" (scaleY) on idle */}
      <g className="companion-part companion-body">
        <ellipse cx="48" cy="66" rx="26" ry="20" fill="url(#companionBody)" />
        <ellipse cx="48" cy="72" rx="14" ry="9" fill="#FBF8F2" />
      </g>

      {/* head group */}
      <g className="companion-part companion-head">
        {/* ears */}
        <path d="M26 30 L34 8 L42 32 Z" fill="url(#companionBody)" />
        <path d="M70 30 L62 8 L54 32 Z" fill="url(#companionBody)" />
        <path d="M29 27 L34 14 L39 28 Z" fill="#3A2A22" />
        <path d="M67 27 L62 14 L57 28 Z" fill="#3A2A22" />

        {/* head shape */}
        <circle cx="48" cy="42" r="24" fill="url(#companionBody)" />
        <ellipse cx="48" cy="50" rx="15" ry="11" fill="#FBF8F2" />

        {/* cheeks */}
        <circle cx="30" cy="46" r="8" fill="url(#companionCheek)" />
        <circle cx="66" cy="46" r="8" fill="url(#companionCheek)" />

        {/* eyes — eyelids are separate rects that scale down to 0 to blink */}
        <g className="companion-eye companion-eye-left">
          <circle cx="39" cy="40" r="5" fill="#16324F" />
          <circle cx="40.5" cy="38" r="1.6" fill="#FBF8F2" />
          <rect className="companion-eyelid" x="33" y="35" width="12" height="10" fill="#D98A63" />
        </g>
        <g className="companion-eye companion-eye-right">
          <circle cx="57" cy="40" r="5" fill="#16324F" />
          <circle cx="58.5" cy="38" r="1.6" fill="#FBF8F2" />
          <rect className="companion-eyelid" x="51" y="35" width="12" height="10" fill="#D98A63" />
        </g>

        {/* nose + mouth */}
        <ellipse cx="48" cy="50" rx="3" ry="2.4" fill="#3A2A22" />
        <path d="M44 53 Q48 56 52 53" stroke="#3A2A22" strokeWidth="1.6" fill="none" strokeLinecap="round" />
      </g>
    </svg>
  );
}
