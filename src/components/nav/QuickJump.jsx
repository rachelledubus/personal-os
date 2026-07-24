import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import Modal from '../ui/Modal.jsx';
import { FLAT_TARGETS } from './navTargets.js';
import './QuickJump.css';

// Mounted once in App.jsx. Opens on Cmd/Ctrl+K from anywhere, or via
// the "quickjump:open" window event (SideNav's search button fires
// this) — decoupled so SideNav doesn't need to hold this state.
export default function QuickJump() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const inputRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    function onKeyDown(e) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen(true);
      }
      if (e.key === 'Escape') setOpen(false);
    }
    function onOpenEvent() { setOpen(true); }
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('quickjump:open', onOpenEvent);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('quickjump:open', onOpenEvent);
    };
  }, []);

  useEffect(() => {
    if (open) {
      setQuery('');
      setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [open]);

  const q = query.trim().toLowerCase();
  const results = q
    ? FLAT_TARGETS.filter(t =>
        t.fullLabel.toLowerCase().includes(q) || (t.keywords || '').toLowerCase().includes(q))
    : FLAT_TARGETS;

  function go(path) {
    navigate(path);
    setOpen(false);
  }

  if (!open) return null;

  return (
    <Modal open={open} onClose={() => setOpen(false)} title="Jump to…">
      <div className="quickjump-search">
        <Search size={16} />
        <input
          ref={inputRef}
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search pages… (e.g. goals, pipeline, budget)"
          onKeyDown={e => { if (e.key === 'Enter' && results[0]) go(results[0].path); }}
        />
      </div>
      <div className="quickjump-results">
        {results.length === 0 && <div className="quickjump-empty">No matching page.</div>}
        {results.slice(0, 12).map(t => (
          <button key={t.path} className="quickjump-result" onClick={() => go(t.path)}>
            {t.fullLabel}
          </button>
        ))}
      </div>
    </Modal>
  );
}
