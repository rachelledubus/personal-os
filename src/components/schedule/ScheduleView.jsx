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

/** Hyperfocus detection (Area 4) — no new tracking infrastructure,
 *  just the block's own end_time. A work block that ended 30+ minutes
 *  ago, still isn't marked done, and still has open tasks is the
 *  actual signal — not a timer running in the background. */
export function getOverrunningBlock(blocks) {
  if (!blocks) return null;
  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();
  return blocks.find(b => {
    if (!b.end_time || b.completed) return false;
    const [eh, em] = b.end_time.split(':').map(Number);
    const endMin = eh * 60 + em;
    const openTasks = (b.tasks || []).some(t => !t.completed);
    return nowMin - endMin >= 30 && nowMin - endMin < 240 && (openTasks || b.life_rhythm_blocks?.is_work_block);
  }) || null;
}

export default function ScheduleView({ blocks, onToggleTask, onToggleBlock, onToggleStep, onAddStep, onRemoveStep, onMoveTask }) {
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
          onToggleStep={onToggleStep}
          onAddStep={onAddStep}
          onRemoveStep={onRemoveStep}
          onMoveTask={onMoveTask}
        />
      ))}
    </div>
  );
}
