import React from 'react';
import './ChibiAccent.css';

// Small cozy characters/motifs for corners of cards and section
// headers. Always pointer-events:none and positioned within a
// relatively-positioned parent — never fixed, never able to overlap
// an interactive element outside its own card.

function ChibiCat() {
  return (
    <svg viewBox="0 0 40 40"><g>
      <path d="M11 14 L14 6 L18 13 Z" fill="var(--sand)" />
      <path d="M29 14 L26 6 L22 13 Z" fill="var(--sand)" />
      <ellipse cx="20" cy="22" rx="13" ry="11" fill="var(--sand)" />
      <circle cx="15" cy="21" r="1.5" fill="var(--navy)" opacity="0.7" />
      <circle cx="25" cy="21" r="1.5" fill="var(--navy)" opacity="0.7" />
      <path d="M17 25 Q20 27 23 25" stroke="var(--navy)" strokeWidth="1.3" strokeLinecap="round" fill="none" opacity="0.6" />
      <ellipse cx="11" cy="24" rx="2.5" ry="1.6" fill="var(--blush)" opacity="0.7" />
      <ellipse cx="29" cy="24" rx="2.5" ry="1.6" fill="var(--blush)" opacity="0.7" />
    </g></svg>
  );
}

function ChibiSprout() {
  return (
    <svg viewBox="0 0 40 40"><g>
      <path d="M20 34 L20 20" stroke="var(--sage)" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M20 22 Q12 20 12 12 Q20 12 20 22 Z" fill="var(--sage)" opacity="0.85" />
      <path d="M20 22 Q28 18 28 10 Q20 12 20 22 Z" fill="var(--sage)" opacity="0.65" />
      <ellipse cx="20" cy="34" rx="9" ry="2.5" fill="var(--cream)" />
    </g></svg>
  );
}

function ChibiCloudFriend() {
  return (
    <svg viewBox="0 0 40 40"><g>
      <path d="M10 26 Q6 26 6 21 Q6 16 11 16 Q12 9 20 9 Q28 9 29 16 Q34 16 34 22 Q34 26 29 26 Z" fill="var(--white)" opacity="0.9" />
      <circle cx="16" cy="20" r="1.5" fill="var(--navy)" opacity="0.6" />
      <circle cx="24" cy="20" r="1.5" fill="var(--navy)" opacity="0.6" />
      <path d="M17 23 Q20 25 23 23" stroke="var(--navy)" strokeWidth="1.2" strokeLinecap="round" fill="none" opacity="0.5" />
    </g></svg>
  );
}

function ChibiBook() {
  return (
    <svg viewBox="0 0 40 40"><g>
      <path d="M8 10 Q8 8 10 8 L19 8 L19 30 L10 30 Q8 30 8 28 Z" fill="var(--accent)" opacity="0.8" />
      <path d="M32 10 Q32 8 30 8 L21 8 L21 30 L30 30 Q32 30 32 28 Z" fill="var(--sage)" opacity="0.8" />
      <path d="M19 8 L21 8 L21 30 L19 30 Z" fill="var(--navy)" opacity="0.5" />
      <circle cx="14" cy="19" r="1.3" fill="var(--white)" opacity="0.8" />
      <circle cx="26" cy="19" r="1.3" fill="var(--white)" opacity="0.8" />
    </g></svg>
  );
}

function ChibiCoin() {
  return (
    <svg viewBox="0 0 40 40"><g>
      <circle cx="20" cy="20" r="13" fill="var(--gold)" opacity="0.85" />
      <circle cx="20" cy="20" r="9" fill="none" stroke="var(--white)" strokeWidth="1.2" opacity="0.6" />
      <circle cx="16" cy="17" r="1.3" fill="var(--navy)" opacity="0.7" />
      <circle cx="24" cy="17" r="1.3" fill="var(--navy)" opacity="0.7" />
      <path d="M16 22 Q20 25 24 22" stroke="var(--navy)" strokeWidth="1.2" strokeLinecap="round" fill="none" opacity="0.6" />
    </g></svg>
  );
}

function ChibiPawprint() {
  return (
    <svg viewBox="0 0 40 40"><g fill="var(--blush)" opacity="0.85">
      <ellipse cx="20" cy="26" rx="8" ry="6.5" />
      <ellipse cx="10" cy="16" rx="3" ry="3.6" />
      <ellipse cx="18" cy="11" rx="3" ry="3.6" />
      <ellipse cx="26" cy="11" rx="3" ry="3.6" />
      <ellipse cx="32" cy="17" rx="3" ry="3.6" />
    </g></svg>
  );
}

const VARIANTS = {
  cat: ChibiCat, sprout: ChibiSprout, cloud: ChibiCloudFriend,
  book: ChibiBook, coin: ChibiCoin, paw: ChibiPawprint,
};

export default function ChibiAccent({ variant = 'cat', size = 40, corner = 'top-right' }) {
  const Chibi = VARIANTS[variant] || ChibiCat;
  return (
    <div className={`chibi-accent chibi-${corner}`} style={{ width: size, height: size }} aria-hidden="true">
      <Chibi />
    </div>
  );
}
