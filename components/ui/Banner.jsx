import React, { useEffect, useState } from 'react';
import { getAssetUrl } from '../../services/assets.js';
import './Banner.css';

// ============================================================
// ZONE BANNERS
// Full illustrated scenes, not corner doodles — this is the actual
// aesthetic-carrying element now. Falls back to a themed SVG scene
// when no custom image is assigned, so it looks intentional on day
// one and gets richer the moment real artwork is dropped into
// Control Center -> Appearance -> Banners.
// ============================================================

function SunriseCottage() {
  return (
    <svg viewBox="0 0 800 220" preserveAspectRatio="xMidYMid slice">
      <defs>
        <linearGradient id="sky-today" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FBD9B0" /><stop offset="55%" stopColor="#F6C9C4" /><stop offset="100%" stopColor="#EAD9E8" />
        </linearGradient>
      </defs>
      <rect width="800" height="220" fill="url(#sky-today)" />
      <circle cx="640" cy="70" r="46" fill="#FDEBC7" opacity="0.9" />
      <circle cx="640" cy="70" r="70" fill="#FDEBC7" opacity="0.35" />
      <path d="M0 150 Q120 110 260 145 T520 140 T800 155 V220 H0 Z" fill="#B7CBA6" opacity="0.55" />
      <path d="M0 175 Q150 145 320 170 T650 165 T800 180 V220 H0 Z" fill="#8FAE85" opacity="0.75" />
      <g transform="translate(90,140)">
        <rect x="0" y="26" width="60" height="34" fill="#E8C7A3" />
        <path d="M-6 26 L30 -2 L66 26 Z" fill="#C97B5C" />
        <rect x="24" y="38" width="14" height="22" fill="#8B5E3C" />
        <rect x="6" y="34" width="10" height="10" fill="#FBF3E4" />
        <rect x="42" y="34" width="10" height="10" fill="#FBF3E4" />
        <rect x="42" y="4" width="8" height="14" fill="#C97B5C" />
        <path d="M46 4 Q52 -8 44 -18" stroke="#D9D2C8" strokeWidth="3" fill="none" opacity="0.7" />
      </g>
      <ellipse cx="180" cy="200" rx="26" ry="14" fill="#7EA36F" opacity="0.8" />
      <ellipse cx="740" cy="205" rx="34" ry="16" fill="#7EA36F" opacity="0.7" />
      <path d="M700 60 Q708 55 716 60" stroke="#5B4A42" strokeWidth="2.5" strokeLinecap="round" fill="none" />
      <path d="M690 70 Q698 65 706 70" stroke="#5B4A42" strokeWidth="2.5" strokeLinecap="round" fill="none" />
    </svg>
  );
}

function PathAndSignpost() {
  return (
    <svg viewBox="0 0 800 220" preserveAspectRatio="xMidYMid slice">
      <defs>
        <linearGradient id="sky-biz" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#F3D9A8" /><stop offset="60%" stopColor="#E8C79A" /><stop offset="100%" stopColor="#CDE0C7" />
        </linearGradient>
      </defs>
      <rect width="800" height="220" fill="url(#sky-biz)" />
      <circle cx="120" cy="55" r="34" fill="#FBEAC3" opacity="0.85" />
      <path d="M0 160 Q200 120 400 155 T800 150 V220 H0 Z" fill="#A9BE8E" opacity="0.6" />
      <path d="M0 185 Q220 155 420 180 T800 175 V220 H0 Z" fill="#87A56E" opacity="0.8" />
      <path d="M60 220 Q260 150 460 190 T780 165" stroke="#E8D9BC" strokeWidth="18" fill="none" opacity="0.55" strokeLinecap="round" strokeDasharray="2 22" />
      <g transform="translate(430,110)">
        <rect x="-3" y="0" width="6" height="70" fill="#8B6F4E" />
        <rect x="-32" y="6" width="34" height="14" rx="2" fill="#D4A24C" />
        <rect x="-32" y="24" width="30" height="14" rx="2" fill="#C0704F" />
      </g>
      <g transform="translate(600,70)" opacity="0.85">
        <ellipse cx="0" cy="26" rx="24" ry="26" fill="#EAD9E8" />
        <path d="M-24 26 Q0 5 24 26" fill="#F6C9C4" />
        <line x1="-14" y1="46" x2="-14" y2="62" stroke="#8B6F4E" strokeWidth="2" />
        <line x1="14" y1="46" x2="14" y2="62" stroke="#8B6F4E" strokeWidth="2" />
        <rect x="-18" y="60" width="36" height="8" rx="2" fill="#C0704F" />
      </g>
    </svg>
  );
}

function GardenRows() {
  return (
    <svg viewBox="0 0 800 220" preserveAspectRatio="xMidYMid slice">
      <defs>
        <linearGradient id="sky-grow" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#CDEAD9" /><stop offset="100%" stopColor="#F3ECC9" />
        </linearGradient>
      </defs>
      <rect width="800" height="220" fill="url(#sky-grow)" />
      <circle cx="700" cy="50" r="30" fill="#FDEBC7" opacity="0.8" />
      <path d="M0 150 Q200 130 400 150 T800 145 V220 H0 Z" fill="#9CBE8A" opacity="0.5" />
      {[80, 210, 340, 470, 600, 730].map((x, i) => (
        <g key={x} transform={`translate(${x},150)`}>
          <rect x="-24" y="10" width="48" height="16" rx="3" fill="#B98F63" />
          {[-14, 0, 14].map(dx => (
            <g key={dx} transform={`translate(${dx},0)`}>
              <path d="M0 10 Q-6 -6 0 -18" stroke="#6E9A5C" strokeWidth="2.5" fill="none" />
              <path d="M0 10 Q6 -4 0 -16" stroke="#7EA36F" strokeWidth="2.5" fill="none" />
              <circle cx="0" cy={-18 - (i % 2) * 2} r={i % 3 === 0 ? 4 : 0} fill="#E8A0AC" />
            </g>
          ))}
        </g>
      ))}
      <g transform="translate(220,80)"><path d="M0 0 Q6 -8 12 0 Q6 8 0 0Z" fill="#F3C7D6" opacity="0.9" /></g>
      <g transform="translate(560,110)"><path d="M0 0 Q6 -8 12 0 Q6 8 0 0Z" fill="#F6DDA0" opacity="0.9" /></g>
    </svg>
  );
}

function WindingHillPath() {
  return (
    <svg viewBox="0 0 800 220" preserveAspectRatio="xMidYMid slice">
      <defs>
        <linearGradient id="sky-plan" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#E3D3EC" /><stop offset="60%" stopColor="#F2D6D0" /><stop offset="100%" stopColor="#F8E8D0" />
        </linearGradient>
      </defs>
      <rect width="800" height="220" fill="url(#sky-plan)" />
      <ellipse cx="140" cy="55" rx="46" ry="16" fill="#FFFFFF" opacity="0.7" />
      <ellipse cx="620" cy="40" rx="38" ry="14" fill="#FFFFFF" opacity="0.6" />
      <path d="M0 150 Q180 110 360 145 T800 140 V220 H0 Z" fill="#C7B7D6" opacity="0.45" />
      <path d="M0 175 Q220 150 420 172 T800 165 V220 H0 Z" fill="#A98FBE" opacity="0.6" />
      <path d="M40 220 Q220 190 340 150 T650 90 T760 40" stroke="#FBF3E4" strokeWidth="10" fill="none" strokeDasharray="1 18" strokeLinecap="round" opacity="0.85" />
      <g transform="translate(760,30)">
        <line x1="0" y1="0" x2="0" y2="30" stroke="#8B6F4E" strokeWidth="2.5" />
        <path d="M0 0 L20 6 L0 12 Z" fill="#C0704F" />
      </g>
    </svg>
  );
}

function ReadingNook() {
  return (
    <svg viewBox="0 0 800 220" preserveAspectRatio="xMidYMid slice">
      <defs>
        <linearGradient id="sky-lib" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2E2A4A" /><stop offset="100%" stopColor="#5B4A6E" />
        </linearGradient>
        <radialGradient id="lamp-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#FDEBC7" stopOpacity="0.9" /><stop offset="100%" stopColor="#FDEBC7" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="800" height="220" fill="url(#sky-lib)" />
      {[[80, 40], [220, 70], [400, 30], [560, 60], [700, 45]].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={1.5 + (i % 3)} fill="#FBF3E4" opacity="0.8" />
      ))}
      <path d="M0 160 Q300 130 500 155 T800 150 V220 H0 Z" fill="#221E3B" opacity="0.7" />
      <g transform="translate(560,100)">
        <circle cx="0" cy="0" r="70" fill="url(#lamp-glow)" />
        <line x1="0" y1="0" x2="0" y2="40" stroke="#3A3252" strokeWidth="3" />
        <path d="M-16 -10 L16 -10 L10 10 L-10 10 Z" fill="#E8A0AC" opacity="0.9" />
      </g>
      <g transform="translate(120,150)">
        <rect x="0" y="0" width="90" height="14" fill="#C0704F" />
        <rect x="4" y="-16" width="82" height="14" fill="#8FAE85" />
        <rect x="0" y="-32" width="90" height="14" fill="#D4A24C" />
        <rect x="10" y="-48" width="70" height="14" fill="#A98FBE" />
      </g>
      <g transform="translate(660,175)" opacity="0.9">
        <ellipse cx="0" cy="8" rx="22" ry="10" fill="#3A3252" />
        <circle cx="-10" cy="-2" r="9" fill="#3A3252" />
        <path d="M-16 -8 L-18 -18 L-11 -10 Z" fill="#3A3252" />
        <path d="M-6 -8 L-3 -18 L-9 -10 Z" fill="#3A3252" />
      </g>
    </svg>
  );
}

function CatchBasket() {
  return (
    <svg viewBox="0 0 800 220" preserveAspectRatio="xMidYMid slice">
      <defs>
        <linearGradient id="sky-inbox" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#D6E8E0" /><stop offset="100%" stopColor="#F3E4C9" />
        </linearGradient>
      </defs>
      <rect width="800" height="220" fill="url(#sky-inbox)" />
      <circle cx="120" cy="50" r="28" fill="#FDEBC7" opacity="0.8" />
      <path d="M0 155 Q220 125 420 150 T800 145 V220 H0 Z" fill="#B7CBA6" opacity="0.5" />
      {[[300, 30, '#F6C9C4'], [420, 60, '#EAD9E8'], [500, 20, '#D4A24C'], [340, 90, '#8FAE85'], [460, 100, '#F6C9C4']].map(([x, y, c], i) => (
        <g key={i} transform={`translate(${x},${y}) rotate(${(i * 37) % 40 - 20})`}>
          <rect x="-8" y="-6" width="16" height="12" rx="2" fill={c} opacity="0.85" />
        </g>
      ))}
      <g transform="translate(420,150)">
        <path d="M-70 0 L-56 50 L56 50 L70 0 Z" fill="#C0704F" />
        <path d="M-70 0 L70 0 L60 -14 L-60 -14 Z" fill="#D4895F" />
        <ellipse cx="0" cy="-14" rx="60" ry="8" fill="#E8A97A" />
      </g>
    </svg>
  );
}

const SCENES = {
  today: SunriseCottage,
  business: PathAndSignpost,
  grow: GardenRows,
  plan: WindingHillPath,
  library: ReadingNook,
  inbox: CatchBasket,
};

export default function Banner({ slotKey, scene = 'today', title }) {
  const [imageUrl, setImageUrl] = useState(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    getAssetUrl(slotKey).then(url => { setImageUrl(url); setLoaded(true); });
  }, [slotKey]);

  const Scene = SCENES[scene] || SunriseCottage;

  return (
    <div className="zone-banner">
      {loaded && imageUrl ? (
        <img src={imageUrl} alt="" className="zone-banner-img" />
      ) : (
        <Scene />
      )}
      {title && <div className="zone-banner-title">{title}</div>}
    </div>
  );
}
