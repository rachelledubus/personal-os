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

  // Focus-on-open only — deliberately depends on nothing but `open`.
  // Previously this lived in the same effect as the keydown listener,
  // which also depended on `onClose` — and since callers pass
  // `onClose={() => setOpen(false)}` as a fresh inline function every
  // render, ANY re-render (e.g. typing a character, which calls
  // setState in the caller) re-ran this effect and re-focused the
  // panel, stealing focus straight out of whatever input was being
  // typed into. Splitting this out means it only fires on the actual
  // open transition, which is the only time it should.
  useEffect(() => {
    if (open) panelRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;
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
