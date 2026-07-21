import React from 'react';
import './KawaiiBackdrop.css';

// A few soft, hand-drawn-feeling clouds that drift slowly across the
// background. Fixed position, behind everything, pointer-events none —
// this should register as "the app feels cozy" without anyone
// consciously noticing an animation is even running.
export default function KawaiiBackdrop() {
  return (
    <div className="kawaii-backdrop" aria-hidden="true">
      <svg className="kawaii-cloud kawaii-cloud-1" viewBox="0 0 120 60"><path d="M20 45 Q10 45 10 35 Q10 25 20 25 Q22 12 38 12 Q55 12 58 25 Q72 24 72 37 Q72 45 60 45 Z" /></svg>
      <svg className="kawaii-cloud kawaii-cloud-2" viewBox="0 0 120 60"><path d="M20 45 Q10 45 10 35 Q10 25 20 25 Q22 12 38 12 Q55 12 58 25 Q72 24 72 37 Q72 45 60 45 Z" /></svg>
      <svg className="kawaii-cloud kawaii-cloud-3" viewBox="0 0 120 60"><path d="M20 45 Q10 45 10 35 Q10 25 20 25 Q22 12 38 12 Q55 12 58 25 Q72 24 72 37 Q72 45 60 45 Z" /></svg>
      <svg className="kawaii-leaf kawaii-leaf-1" viewBox="0 0 40 40"><path d="M20 4 Q34 12 34 24 Q34 36 20 36 Q6 36 6 24 Q6 12 20 4 Z" /></svg>
      <svg className="kawaii-leaf kawaii-leaf-2" viewBox="0 0 40 40"><path d="M20 4 Q34 12 34 24 Q34 36 20 36 Q6 36 6 24 Q6 12 20 4 Z" /></svg>
    </div>
  );
}
