-- ===========================================================================
-- Per-job 6pm fallback price (set at creation, not at the deadline).
-- ===========================================================================
-- When a job isn't done by its deadline, the 18:05 sweep turns it into paid
-- bonus work on the board (spec §5.1). The price it carries is now decided by
-- the parent when they create the job — so the whole thing is set up front and
-- nobody has to decide anything at 6pm.
-- ===========================================================================

alter table job_def
  add column if not exists fallback_pence integer not null default 75;
