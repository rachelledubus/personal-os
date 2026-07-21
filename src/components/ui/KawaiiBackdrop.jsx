import React from 'react';
import './KawaiiBackdrop.css';

// Soft drifting clouds, swaying leaves, and twinkling sparkles behind
// everything — the "always-on ambient warmth" layer. Opaque cards sit
// on top (z-index 1) so this only shows through the gaps, which is
// exactly the point: it should color the mood without ever competing
// with anything you're trying to read.
export default function KawaiiBackdrop() {
  return (
    <div className="kawaii-backdrop" aria-hidden="true">
      <svg className="kawaii-cloud kawaii-cloud-1" viewBox="0 0 120 60"><path d="M20 45 Q10 45 10 35 Q10 25 20 25 Q22 12 38 12 Q55 12 58 25 Q72 24 72 37 Q72 45 60 45 Z" /></svg>
      <svg className="kawaii-cloud kawaii-cloud-2" viewBox="0 0 120 60"><path d="M20 45 Q10 45 10 35 Q10 25 20 25 Q22 12 38 12 Q55 12 58 25 Q72 24 72 37 Q72 45 60 45 Z" /></svg>
      <svg className="kawaii-cloud kawaii-cloud-3" viewBox="0 0 120 60"><path d="M20 45 Q10 45 10 35 Q10 25 20 25 Q22 12 38 12 Q55 12 58 25 Q72 24 72 37 Q72 45 60 45 Z" /></svg>
      <svg className="kawaii-cloud kawaii-cloud-4" viewBox="0 0 120 60"><path d="M20 45 Q10 45 10 35 Q10 25 20 25 Q22 12 38 12 Q55 12 58 25 Q72 24 72 37 Q72 45 60 45 Z" /></svg>

      <svg className="kawaii-leaf kawaii-leaf-1" viewBox="0 0 40 40"><path d="M20 4 Q34 12 34 24 Q34 36 20 36 Q6 36 6 24 Q6 12 20 4 Z" /></svg>
      <svg className="kawaii-leaf kawaii-leaf-2" viewBox="0 0 40 40"><path d="M20 4 Q34 12 34 24 Q34 36 20 36 Q6 36 6 24 Q6 12 20 4 Z" /></svg>
      <svg className="kawaii-leaf kawaii-leaf-3" viewBox="0 0 40 40"><path d="M20 4 Q34 12 34 24 Q34 36 20 36 Q6 36 6 24 Q6 12 20 4 Z" /></svg>

      <svg className="kawaii-sparkle kawaii-sparkle-1" viewBox="0 0 20 20"><path d="M10 0 L12 8 L20 10 L12 12 L10 20 L8 12 L0 10 L8 8 Z" /></svg>
      <svg className="kawaii-sparkle kawaii-sparkle-2" viewBox="0 0 20 20"><path d="M10 0 L12 8 L20 10 L12 12 L10 20 L8 12 L0 10 L8 8 Z" /></svg>
      <svg className="kawaii-sparkle kawaii-sparkle-3" viewBox="0 0 20 20"><path d="M10 0 L12 8 L20 10 L12 12 L10 20 L8 12 L0 10 L8 8 Z" /></svg>
      <svg className="kawaii-sparkle kawaii-sparkle-4" viewBox="0 0 20 20"><path d="M10 0 L12 8 L20 10 L12 12 L10 20 L8 12 L0 10 L8 8 Z" /></svg>
    </div>
  );
}
