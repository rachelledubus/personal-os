import React from 'react';
import ScheduleBlock from './ScheduleBlock.jsx';
import EmptyState from '../ui/EmptyState.jsx';

function isCurrentBlock(block) {
  if (!block.start_time) return false;
  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const [sh, sm] = block.start_time.split(':').map(Number);
  const startMin = sh * 60 + sm;
  let endMin = startMin + 60;
  if (block.end_time) {
    const [eh, em] = block.end_time.split(':').map(Number);
    endMin = eh * 60 + em;
  }
  return nowMin >= startMin && nowMin < endMin;
}

export default function ScheduleView({ blocks, onToggleTask, onToggleBlock }) {
  if (blocks === null) return null;
  if (blocks.length === 0) {
    return <EmptyState icon="calendar" title="No schedule yet" subtitle="Your day will build itself here once your Life Rhythm is set up." />;
  }

  return (
    <div className="schedule-view">
      {blocks.map(block => (
        <ScheduleBlock
          key={block.id}
          block={block}
          isCurrent={isCurrentBlock(block)}
          onToggleTask={onToggleTask}
          onToggleBlock={onToggleBlock}
        />
      ))}
    </div>
  );
}
