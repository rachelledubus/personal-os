import React from 'react';
import './Skeleton.css';

/** A placeholder shape that renders WHILE something loads, instead of
 *  a blank flash. "Every loading state renders a shape, never a blank
 *  flash" — this is the fix for every `if (loading) return null`
 *  pattern in the codebase (found in 4 files as of this pass).
 *
 *  Usage: <Skeleton width="60%" height={20} /> or <Skeleton variant="card" />
 *  for a pre-shaped card placeholder. */
export default function Skeleton({ width = '100%', height = 16, variant = 'line', style }) {
  if (variant === 'card') {
    return (
      <div className="skeleton skeleton-card" style={style}>
        <div className="skeleton-line" style={{ width: '40%', height: 12 }} />
        <div className="skeleton-line" style={{ width: '80%', height: 18, marginTop: 8 }} />
        <div className="skeleton-line" style={{ width: '60%', height: 12, marginTop: 8 }} />
      </div>
    );
  }
  return <div className="skeleton skeleton-line" style={{ width, height, ...style }} />;
}
