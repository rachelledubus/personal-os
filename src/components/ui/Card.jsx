import React from 'react';
import './Card.css';

export default function Card({ elevation = 'resting', children, className = '', ...props }) {
  return (
    <div className={`card card-${elevation} ${className}`} {...props}>
      {children}
    </div>
  );
}
