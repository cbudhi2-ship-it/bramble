-- ===========================================================================
-- Persist the original assignee for history / consistency insights.
-- ===========================================================================
-- The 18:05 sweep nulls assigned_to when a dealt job lapses onto the board, so
-- assigned_to alone can't tell you whose job it *was*. dealt_to records who the
-- 6am rota dealt it to and is never nulled — that's what lets the parent panel
-- show who clears their own decks vs who waits for jobs to become paid bonuses.
-- ===========================================================================

alter table job_instance
  add column if not exists dealt_to uuid references member(id) on delete set null;

create index if not exists job_instance_dealt_to_idx on job_instance(dealt_to);
