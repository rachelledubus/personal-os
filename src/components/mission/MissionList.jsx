import React from 'react';
import MissionCard from './MissionCard.jsx';
import EmptyState from '../ui/EmptyState.jsx';
import './MissionList.css';

export default function MissionList({ missions, onToggle, onDismiss }) {
  if (!missions || missions.length === 0) {
    return <EmptyState icon="sparkles" title="Nothing left today" subtitle="Enjoy the rest of your day." />;
  }

  const firstUndoneIndex = missions.findIndex(m => !m.done && !m.informational);

  return (
    <div className="mission-list">
      {missions.map((m, i) => (
        <div key={m.id} className="mission-list-item">
          <MissionCard
            mission={m}
            active={i === firstUndoneIndex}
            onToggle={onToggle}
            onDismiss={onDismiss}
          />
        </div>
      ))}
    </div>
  );
}
