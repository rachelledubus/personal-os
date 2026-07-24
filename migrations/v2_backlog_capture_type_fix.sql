-- ============================================================
-- Migration: fix a real bug (correction)
-- ============================================================
-- Sprint A added a "Backlog idea" quick-capture type in GlobalCapture.jsx
-- without checking that capture_items.capture_type has a CHECK
-- constraint restricting it to a fixed list — same mistake pattern as
-- the weekly_reviews collision. Selecting "Backlog idea" and hitting
-- Capture threw a constraint-violation error that GlobalCapture.jsx
-- didn't catch, so the button got stuck on "Saving..." forever. Fixed
-- in two places: this migration (the actual cause), and a try/catch
-- added to GlobalCapture.jsx so this class of failure can't do that
-- silently again.
-- ============================================================

alter table capture_items drop constraint if exists capture_items_capture_type_check;
alter table capture_items add constraint capture_items_capture_type_check
  check (capture_type in (
    'task','idea','content_idea','note','research','purchase',
    'reminder','opportunity','thought','buyer_question','backlog'
  ));
