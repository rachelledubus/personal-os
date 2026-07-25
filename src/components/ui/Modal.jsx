import React from 'react';
import Overlay from './Overlay.jsx';

/** Kept as its own named component so existing call sites don't need
 *  to change — internally it's just Overlay variant="sheet" now. */
export default function Modal({ open, onClose, title, children, dismissible = true }) {
  return (
    <Overlay open={open} onClose={onClose} variant="sheet" title={title} dismissible={dismissible}>
      {children}
    </Overlay>
  );
}
