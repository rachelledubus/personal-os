import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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

/** Where a task's real context lives, if anywhere — a quick-added
 *  task with no project has nowhere to jump to, and that's fine, it
 *  just stays plain text. Anything more specific gets a real link. */
function taskLinkTarget(task) {
  if (task.project_id || task.goal_id) return '/plan/goals';
  if (task.capture_type === 'purchase') return '/grow/finance';
  return null;
}

export default function ScheduleBlock({ block, isCurrent, onToggleTask, onToggleBlock, onToggleStep, onAddStep, onMoveTask, onDismissBlock }) {
  const navigate = useNavigate();
  const [addingStep, setAddingStep] = useState(false);
  const [newStep, setNewStep] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const blockType = block.life_rhythm_blocks?.block_type || 'work';
  const Icon = TYPE_ICON[blockType] || Sparkles;
  const isWorkBlock = block.life_rhythm_blocks?.is_work_block || (block.track === 'business' && !block.auto_generated);
  const timeLabel = formatRange(block.start_time, block.end_time);
  const steps = block.life_rhythm_blocks?.steps || [];
  const completedSteps = block.completed_steps || [];

  function handleAddStep() {
    if (!newStep.trim()) return;
    onAddStep(block, newStep.trim());
    setNewStep('');
    setAddingStep(false);
  }

  function handleDragStart(e, task) {
    e.dataTransfer.setData('text/plain', task.id);
    e.dataTransfer.effectAllowed = 'move';
  }

  function handleDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOver(true);
  }

  function handleDrop(e) {
    e.preventDefault();
    setDragOver(false);
    const taskId = e.dataTransfer.getData('text/plain');
    if (taskId) onMoveTask(taskId, block.id);
  }

  return (
    <div className={`schedule-block track-${block.track} type-${blockType} ${isCurrent ? 'schedule-block-current' : ''} ${block.completed ? 'schedule-block-done' : ''}`}>
      <div className="schedule-block-rail">
        <div className="schedule-block-icon"><Icon size={16} strokeWidth={2} /></div>
        <div className="schedule-block-line" />
      </div>

      <div className="schedule-block-body">
        <div className="schedule-block-header">
          <div className="row" style={{ gap: 8 }}>
            <Checkbox checked={!!block.completed} onChange={(v) => onToggleBlock(block, v)} />
            <div className="schedule-block-title">{block.title}</div>
          </div>
          {timeLabel && <div className="schedule-block-time">{timeLabel}</div>}
          {onDismissBlock && (
            <button
              className="row-remove-btn"
              title="Not doing this today — remove it from today's schedule"
              onClick={() => onDismissBlock(block)}
            >
              ×
            </button>
          )}
        </div>
        {block.life_rhythm_blocks?.notes && (
          <div className="schedule-block-notes">{block.life_rhythm_blocks.notes}</div>
        )}

        {/* Transition steps — Morning Routine, Shutdown, Evening Routine
            etc. get a real step-by-step sequence instead of just a
            title, so "start the routine" isn't its own decision. */}
        {steps.length > 0 && (
          <div className="schedule-block-steps">
            {steps.map((step, i) => (
              <label key={i} className="schedule-step-row">
                <input type="checkbox" checked={!!completedSteps[i]} onChange={e => onToggleStep(block, i, e.target.checked)} />
                <span className={completedSteps[i] ? 'schedule-step-done' : ''}>{step}</span>
              </label>
            ))}
          </div>
        )}
        {!isWorkBlock && block.life_rhythm_blocks && (
          addingStep ? (
            <div className="row" style={{ marginTop: 4, gap: 4 }}>
              <input placeholder="Add a step..." value={newStep} onChange={e => setNewStep(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAddStep()} style={{ fontSize: 12, padding: '4px 8px' }} />
              <button className="schedule-step-link" onClick={handleAddStep}>Add</button>
              <button className="schedule-step-link" onClick={() => setAddingStep(false)}>Cancel</button>
            </div>
          ) : (
            <button className="schedule-step-link" onClick={() => setAddingStep(true)}>
              {steps.length > 0 ? '+ add step' : '+ add steps to this routine'}
            </button>
          )
        )}

        {isWorkBlock && (
          <div
            className={`schedule-block-tasks ${dragOver ? 'schedule-block-tasks-dragover' : ''}`}
            onDragOver={handleDragOver}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
          >
            {(!block.tasks || block.tasks.length === 0) && (
              <div className="schedule-block-empty">{dragOver ? 'Drop here to move it into this block' : 'Nothing assigned — all caught up, or nothing fits this window.'}</div>
            )}
            {(block.tasks || []).map(task => {
              const linkTarget = taskLinkTarget(task);
              return (
                <div key={task.id} className={`schedule-task ${task.completed ? 'schedule-task-done' : ''}`}
                  draggable onDragStart={e => handleDragStart(e, task)}>
                  <Checkbox checked={!!task.completed} onChange={(v) => onToggleTask(task, v)} />
                  <div className="schedule-task-body" style={linkTarget ? { cursor: 'pointer' } : undefined} onClick={() => linkTarget && navigate(linkTarget)}>
                    <div className="schedule-task-title">{task.title}{linkTarget && <span className="schedule-task-jump"> →</span>}</div>
                    <div className="schedule-task-meta">
                      {task.estimated_minutes ? `${task.estimated_minutes} min` : null}
                      {task.priority && task.priority !== 'Medium' ? ` · ${task.priority}` : null}
                      {task.energy_type ? ` · ${task.energy_type}` : null}
                      {task.rolled_over_from ? ` · carried from ${task.rolled_over_from}` : null}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
