import React from 'react';
import { X } from 'lucide-react';
import './Modal.css';

export default function Modal({ open, onClose, title, children, dismissible = true }) {
  if (!open) return null;
  return (
    <div className="modal-scrim" onClick={dismissible ? onClose : undefined}>
      <div className="modal-panel" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{title}</h3>
          {dismissible && (
            <button className="modal-close" onClick={onClose} aria-label="Close">
              <X size={18} />
            </button>
          )}
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}
