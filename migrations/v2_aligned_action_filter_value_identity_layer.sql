-- ============================================================
-- ALIGNED ACTION FILTER — Value + Identity dimensions
-- The original filter was Vision / Value / Identity / Energy impact.
-- Only vision_link and energy_impact ever got built. This adds the
-- other two: value_link (a category picker, backed by the new
-- personal_values category list) and identity_link (free text —
-- "who am I becoming by doing this," genuinely too personal/varied
-- to force into a fixed category list the way values can be).
-- ============================================================

alter table goals add column if not exists value_link text default null;
alter table goals add column if not exists identity_link text default null;
alter table projects add column if not exists value_link text default null;
alter table projects add column if not exists identity_link text default null;
