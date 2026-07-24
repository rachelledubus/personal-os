import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { FLAT_TARGETS } from './navTargets.js';
import './Breadcrumb.css';

// Longest-path-match so /business/content/:id still resolves to the
// "Content" tab crumb instead of finding nothing.
function findTarget(pathname) {
  const matches = FLAT_TARGETS.filter(t => pathname === t.path || pathname.startsWith(t.path + '/'));
  if (matches.length === 0) return null;
  return matches.reduce((best, t) => (t.path.length > best.path.length ? t : best));
}

export default function Breadcrumb() {
  const location = useLocation();
  if (location.pathname === '/today') return null; // home — no crumb needed

  const target = findTarget(location.pathname);
  if (!target) return null;

  return (
    <div className="breadcrumb">
      <Link to="/today" className="breadcrumb-link">Today</Link>
      {target.zonePath && (
        <>
          <ChevronRight size={13} className="breadcrumb-sep" />
          <Link to={target.zonePath} className="breadcrumb-link">{target.zoneLabel}</Link>
        </>
      )}
      <ChevronRight size={13} className="breadcrumb-sep" />
      <span className="breadcrumb-current">{target.zonePath ? target.label : target.label}</span>
    </div>
  );
}
