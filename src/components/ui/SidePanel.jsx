import React from 'react';
import { X } from 'lucide-react';
import './SidePanel.css';

/** Same scrim pattern as Modal.jsx, but docked to the right edge and
 *  full-height instead of centered — for content you want to browse
 *  alongside a list (like a contact profile) rather than a focused
 *  one-off prompt. */
export default function SidePanel({ open, onClose, title, subtitle, children }) {
  if (!open) return null;
  return (
    <div className="sidepanel-scrim" onClick={onClose}>
      <div className="sidepanel-panel" onClick={e => e.stopPropagation()}>
        <div className="sidepanel-header">
          <div>
            <h3>{title}</h3>
            {subtitle && <div className="muted" style={{ fontSize: 13 }}>{subtitle}</div>}
          </div>
          <button className="sidepanel-close" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>
        <div className="sidepanel-body">{children}</div>
      </div>
    </div>
  );
}