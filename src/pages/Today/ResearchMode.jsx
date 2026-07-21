import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X } from 'lucide-react';
import Button from '../../components/ui/Button.jsx';
import './FocusMode.css';

export default function ResearchMode() {
  const navigate = useNavigate();
  const [seconds, setSeconds] = useState(0);
  const [showExitPrompt, setShowExitPrompt] = useState(false);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    const id = setInterval(() => setSeconds(s => s + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const mm = String(Math.floor(seconds / 60)).padStart(2, '0');
  const ss = String(seconds % 60).padStart(2, '0');

  return (
    <div className="focus-shell">
      <button className="focus-exit" onClick={() => setShowExitPrompt(true)} aria-label="End research session">
        <X size={22} />
      </button>

      {!showExitPrompt ? (
        <div className="focus-content">
          <div className="focus-track-tag track-business">Research</div>
          <h1 className="focus-title">Distraction-free research</h1>
          <div className="focus-timer">{mm}:{ss}</div>
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
            <Button variant="ghost" onClick={() => setShowExitPrompt(false)}>Continue researching</Button>
            <Button variant="primary" onClick={() => navigate('/today')}>Return to today's mission</Button>
            <Button variant="text" onClick={() => navigate('/library/notes')}>Save research for later</Button>
          </div>
        </div>
      )}
    </div>
  );
}
