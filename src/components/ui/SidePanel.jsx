import React from 'react';
import Overlay from './Overlay.jsx';

/** Same consolidation as Modal.jsx — internally Overlay variant="drawer" now. */
export default function SidePanel({ open, onClose, title, subtitle, children }) {
  return (
    <Overlay open={open} onClose={onClose} variant="drawer" title={title} subtitle={subtitle}>
      {children}
    </Overlay>
  );
}
