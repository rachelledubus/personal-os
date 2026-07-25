import React from 'react';
import './Badge.css';

/** Shared status-coloring primitive. Several places (ContactProfilePanel,
 *  BusinessWeeklyResetPage) had their own STATUS_TONE color maps with
 *  hardcoded hex fallbacks that had drifted from the real tokens
 *  (e.g. one had --danger falling back to #c0392b when the real
 *  --danger token is #B5533D) — this is the one place that mapping
 *  should live. Full migration of those call sites happens in the
 *  BusinessPage split (Batch 8); this just makes the primitive exist. */
const TONE_CLASS = {
  success: 'badge-success',
  warning: 'badge-warning',
  danger: 'badge-danger',
  neutral: 'badge-neutral',
};

export default function Badge({ tone = 'neutral', children }) {
  return <span className={`badge ${TONE_CLASS[tone] || TONE_CLASS.neutral}`}>{children}</span>;
}
