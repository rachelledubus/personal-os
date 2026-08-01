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

/** Hyperfocus detection (Area 4) — no new tracking infrastructure
 *  beyond focus_sessions itself, just the block's own end_time plus
 *  real evidence Focus Mode was actually open during this block. A
 *  work block that ended 30+ minutes ago, still isn't marked done,
 *  and had at least one focus session overlapping it is the signal —
 *  a block that simply ran long with no Focus Mode use doesn't fire
 *  this anymore. */
export function getOverrunningBlock(blocks, focusSessions = []) {
  if (!blocks) return null;
  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const todayDateStr = now.toISOString().slice(0, 10);

  function hadOverlappingFocusSession(block) {
    if (!block.start_time || !block.end_time) return false;
    const [sh, sm] = block.start_time.split(':').map(Number);
    const blockStart = new Date(`${todayDateStr}T00:00:00`);
    blockStart.setHours(sh, sm, 0, 0);
    return focusSessions.some(fs => {
      const started = new Date(fs.started_at);
      const ended = fs.ended_at ? new Date(fs.ended_at) : now;
      return ended >= blockStart; // session ran into or past when this block started
    });
  }

  return blocks.find(b => {
    if (!b.end_time || b.completed) return false;
    const [eh, em] = b.end_time.split(':').map(Number);
    const endMin = eh * 60 + em;
    const openTasks = (b.tasks || []).some(t => !t.completed);
    const isCandidate = nowMin - endMin >= 30 && nowMin - endMin < 240 && (openTasks || b.life_rhythm_blocks?.is_work_block);
    return isCandidate && hadOverlappingFocusSession(b);
  }) || null;
}

export default function ScheduleView({ blocks, onToggleTask, onToggleBlock, onToggleStep, onAddStep, onRemoveStep, onMoveTask, onDismissBlock }) {
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
          onDismissBlock={onDismissBlock}
        />
      ))}
    </div>
  );
}
