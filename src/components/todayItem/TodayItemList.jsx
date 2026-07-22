import React from 'react';
import TodayItemCard from './TodayItemCard.jsx';
import EmptyState from '../ui/EmptyState.jsx';
import './TodayItemList.css';

export default function TodayItemList({ items, onToggle, onDismiss }) {
  if (!items || items.length === 0) {
    return <EmptyState icon="sparkles" title="Nothing left today" subtitle="Enjoy the rest of your day." />;
  }

  const firstUndoneIndex = items.findIndex(m => !m.done && !m.informational);

  return (
    <div className="today-item-list">
      {items.map((m, i) => (
        <div key={m.id} className="today-item-list-item">
          <TodayItemCard
            item={m}
            active={i === firstUndoneIndex}
            onToggle={onToggle}
            onDismiss={onDismiss}
          />
        </div>
      ))}
    </div>
  );
}
