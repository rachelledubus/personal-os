import React from 'react';

/** Native elements already get border/radius/padding/font from
 *  global.css — these wrappers add nothing visually except a sensible
 *  default (width: 100%, which almost every call site was setting by
 *  hand) and a consistent import point for the form/ primitive set. */

export function TextInput({ style, ...props }) {
  return <input type="text" style={{ width: '100%', ...style }} {...props} />;
}

export function TextArea({ minHeight = 70, style, ...props }) {
  return <textarea style={{ width: '100%', minHeight, resize: 'vertical', ...style }} {...props} />;
}

export function Select({ options, children, style, ...props }) {
  return (
    <select style={{ width: '100%', ...style }} {...props}>
      {options ? options.map(o => (
        <option key={o.value ?? o} value={o.value ?? o}>{o.label ?? o}</option>
      )) : children}
    </select>
  );
}
