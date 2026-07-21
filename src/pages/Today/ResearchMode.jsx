import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X } from 'lucide-react';
import Button from '../../components/ui/Button.jsx';
import TimerWidget from '../../components/timer/TimerWidget.jsx';
import { useTimerContext } from '../../context/TimerContext.jsx';
import { BUILT_IN_PRESETS } from '../../services/timer.js';
import './FocusMode.css';

export default function ResearchMode() {
  const navigate = useNavigate();
  const timer = useTimerContext();
  const [showExitPrompt, setShowExitPrompt] = useState(false);
  const [notes, setNotes] = useState('');

  // Auto-starts an open stopwatch on entry — research sessions are
  // open-ended by nature, unlike focus sessions which usually want a
  // preset. Still fully controllable (pause/reset/stop) via the widget.
  useEffect(() => {
    if (!timer.isActive) {
      timer.start(BUILT_IN_PRESETS.find(p => p.mode === 'stopwatch'), { sourceTable: 'research_mode', sourceId: null, title: 'Research' });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleEnd() {
    if (timer.isActive) timer.skip(true);
    setShowExitPrompt(true);
  }

  return (
    <div className="focus-shell">
      <button className="focus-exit" onClick={handleEnd} aria-label="End research session">
        <X size={22} />
      </button>

      {!showExitPrompt ? (
        <div className="focus-content">
          <div className="focus-track-tag track-business">Research</div>
          <h1 className="focus-title">Distraction-free research</h1>

          <div className="focus-timer-slot">
            <TimerWidget compact />
          </div>

          <textarea
            className="research-notes"
            placeholder="Jot findings as you go..."
            value={notes}
            onChange={e => setNotes(e.target.value)}
          />
        </div>
      ) : (
        <div className="focus-content">
          <h1 className="focus-title" style={{ fontSize: 24 }}>Time's up — what next?</h1>
          <div className="stack" style={{ marginTop: 'var(--space-5)', alignItems: 'center' }}>
            <Button variant="ghost" onClick={() => { setShowExitPrompt(false); timer.start(BUILT_IN_PRESETS.find(p => p.mode === 'stopwatch')); }}>Continue researching</Button>
            <Button variant="primary" onClick={() => navigate('/today')}>Return to today's mission</Button>
            <Button variant="text" onClick={() => navigate('/library/notes')}>Save research for later</Button>
          </div>
        </div>
      )}
    </div>
  );
}
