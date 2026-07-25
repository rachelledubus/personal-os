import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import './Overlay.css';

/** One overlay primitive, three variants:
 *  - 'sheet'      centered dialog (was Modal.jsx)
 *  - 'drawer'     docked right, full-height (was SidePanel.jsx)
 *  - 'fullscreen' covers the whole viewport, no scrim (was FocusMode's
 *                 bespoke .focus-shell)
 *
 *  All three get the same focus-on-open, Escape-to-close, and
 *  aria-modal behavior for free — previously each had to reimplement
 *  (or, for FocusMode, never got) this individually. */
export default function Overlay({ open, onClose, variant = 'sheet', title, subtitle, dismissible = true, showScrim = true, children }) {
  const panelRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    // Focus the panel on open so keyboard/screen-reader users land
    // inside the overlay immediately, not wherever focus was before.
    panelRef.current?.focus();
    function handleKeyDown(e) {
      if (e.key === 'Escape' && dismissible) onClose?.();
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, dismissible, onClose]);

  if (!open) return null;

  const scrimClass = variant === 'fullscreen' ? 'overlay-scrim overlay-scrim-fullscreen' : 'overlay-scrim';
  const bareFullscreenClose = variant === 'fullscreen' && !title; // FocusMode's exact current look: a floating corner X, no header row

  return (
    <div className={scrimClass} onClick={showScrim && dismissible ? onClose : undefined}>
      <div
        ref={panelRef}
        className={`overlay-panel overlay-panel-${variant}`}
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
      >
        {bareFullscreenClose ? (
          dismissible && (
            <button className="overlay-close overlay-close-floating" onClick={onClose} aria-label="Close">
              <X size={22} />
            </button>
          )
        ) : (title || dismissible) && (
          <div className="overlay-header">
            <div>
              {title && <h3>{title}</h3>}
              {subtitle && <div className="muted" style={{ fontSize: 'var(--text-small)' }}>{subtitle}</div>}
            </div>
            {dismissible && (
              <button className="overlay-close" onClick={onClose} aria-label="Close">
                <X size={18} />
              </button>
            )}
          </div>
        )}
        <div className="overlay-body">{children}</div>
      </div>
    </div>
  );
}
