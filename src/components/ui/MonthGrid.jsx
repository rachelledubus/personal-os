import React from 'react';
import './MonthGrid.css';

/** Bullet-journal-style month grid — one square per day. `days` is
 *  { 1: value, 2: value, ... }. `colorFor(value)` returns a CSS color
 *  or null for "empty square." Purely presentational — every tracker
 *  passes in data it already has, this never fetches anything itself. */
export default function MonthGrid({ year, month, days, colorFor, label }) {
  const daysInMonth = new Date(year, month, 0).getDate();
  const firstWeekday = new Date(year, month - 1, 1).getDay(); // 0 = Sunday

  const cells = [];
  for (let i = 0; i < firstWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <div className="month-grid-wrap">
      {label && <div className="month-grid-label">{label}</div>}
      <div className="month-grid">
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
          <div key={`h-${i}`} className="month-grid-weekday">{d}</div>
        ))}
        {cells.map((d, i) => {
          if (d === null) return <div key={`empty-${i}`} className="month-grid-cell month-grid-cell-blank" />;
          const value = days[d];
          const color = colorFor ? colorFor(value) : (value ? 'var(--sage)' : null);
          return (
            <div
              key={d}
              className="month-grid-cell"
              style={color ? { background: color } : {}}
              title={`${month}/${d}`}
            >
              <span className="month-grid-daynum">{d}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
