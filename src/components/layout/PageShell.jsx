import React from 'react';
import PageHeader from './PageHeader.jsx';
import Skeleton from '../ui/Skeleton.jsx';
import EmptyState from '../ui/EmptyState.jsx';

/** Header + content slot + consistent loading/error/empty states.
 *  `loading` renders Skeleton cards, never a blank flash or bare
 *  "Loading…" text — this is the structural fix for the
 *  `if (loading) return null` pattern found repeated across the app
 *  (BeliefTrackerTab, ScheduleTemplateTab, MealPlannerPage,
 *  BusinessPage, and the app-level loading state, as of this pass). */
export default function PageShell({ icon, title, subtitle, actions, loading, error, empty, emptyProps, children }) {
  return (
    <div>
      <PageHeader icon={icon} title={title} subtitle={subtitle} actions={actions} />
      {loading ? (
        <div className="stack" style={{ gap: 'var(--space-3)' }}>
          <Skeleton variant="card" />
          <Skeleton variant="card" />
        </div>
      ) : error ? (
        <div className="muted" style={{ fontSize: 'var(--text-small)', color: 'var(--danger)' }}>
          Couldn't load this page: {error}
        </div>
      ) : empty ? (
        <EmptyState {...(emptyProps || { title: 'Nothing here yet' })} />
      ) : (
        children
      )}
    </div>
  );
}
