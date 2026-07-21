import React from 'react';
import { Dumbbell, Coffee, Briefcase, Sunrise, Moon, Sparkles, Home } from 'lucide-react';
import Checkbox from '../ui/Checkbox.jsx';
import './ScheduleBlock.css';

const TYPE_ICON = {
  routine: Sunrise,
  workout: Dumbbell,
  meal: Coffee,
  work: Briefcase,
  reset: Home,
  personal: Sparkles,
};

function formatRange(start, end) {
  if (!start) return null;
  const fmt = (t) => {
    const [h, m] = t.split(':').map(Number);
    const period = h >= 12 ? 'PM' : 'AM';
    const hour12 = h % 12 === 0 ? 12 : h % 12;
    return `${hour12}:${String(m).padStart(2, '0')} ${period}`;
  };
  return end ? `${fmt(start)} – ${fmt(end)}` : fmt(start);
}

export default function ScheduleBlock({ block, isCurrent, onToggleTask }) {
  const blockType = block.life_rhythm_blocks?.block_type || 'work';
  const Icon = TYPE_ICON[blockType] || Sparkles;
  const isWorkBlock = block.life_rhythm_blocks?.is_work_block || (block.track === 'business' && !block.auto_generated);
  const timeLabel = formatRange(block.start_time, block.end_time);

  return (
    <div className={`schedule-block track-${block.track} type-${blockType} ${isCurrent ? 'schedule-block-current' : ''}`}>
      <div className="schedule-block-rail">
        <div className="schedule-block-icon"><Icon size={16} strokeWidth={2} /></div>
        <div className="schedule-block-line" />
      </div>

      <div className="schedule-block-body">
        <div className="schedule-block-header">
          <div className="schedule-block-title">{block.title}</div>
          {timeLabel && <div className="schedule-block-time">{timeLabel}</div>}
        </div>
        {block.life_rhythm_blocks?.notes && (
          <div className="schedule-block-notes">{block.life_rhythm_blocks.notes}</div>
        )}

        {isWorkBlock && (
          <div className="schedule-block-tasks">
            {(!block.tasks || block.tasks.length === 0) && (
              <div className="schedule-block-empty">Nothing assigned — all caught up, or nothing fits this window.</div>
            )}
            {(block.tasks || []).map(task => (
              <div key={task.id} className={`schedule-task ${task.completed ? 'schedule-task-done' : ''}`}>
                <Checkbox checked={!!task.completed} onChange={(v) => onToggleTask(task, v)} />
                <div className="schedule-task-body">
                  <div className="schedule-task-title">{task.title}</div>
                  <div className="schedule-task-meta">
                    {task.estimated_minutes ? `${task.estimated_minutes} min` : null}
                    {task.priority && task.priority !== 'Medium' ? ` · ${task.priority}` : null}
                    {task.energy_type ? ` · ${task.energy_type}` : null}
                    {task.rolled_over_from ? ` · carried from ${task.rolled_over_from}` : null}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
