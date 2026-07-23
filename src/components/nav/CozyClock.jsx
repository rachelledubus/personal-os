import React, { useEffect, useState } from 'react';
import { Sun, Moon, Sunrise, Sunset } from 'lucide-react';
import './CozyClock.css';

function timeIcon(hour) {
  if (hour >= 5 && hour < 8) return Sunrise;
  if (hour >= 8 && hour < 17) return Sun;
  if (hour >= 17 && hour < 20) return Sunset;
  return Moon;
}

export default function CozyClock() {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30000); // half-minute is plenty for a cozy clock, not a stopwatch
    return () => clearInterval(id);
  }, []);

  const Icon = timeIcon(now.getHours());
  const time = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  const day = now.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });

  return (
    <div className="cozy-clock">
      <Icon size={18} strokeWidth={1.8} className="cozy-clock-icon" />
      <div>
        <div className="cozy-clock-time">{time}</div>
        <div className="cozy-clock-day">{day}</div>
      </div>
    </div>
  );
}
