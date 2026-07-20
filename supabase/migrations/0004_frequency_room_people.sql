-- ===========================================================================
-- Job frequency, room, and multi-person jobs.
-- ===========================================================================
-- Three refinements to the job library:
--   * frequency  — jobs aren't all daily; add 'monthly' alongside daily/weekly
--   * room       — group jobs by room so parents can see which rooms are due
--   * people_needed — a whole-room job (e.g. the bathroom) can need two people,
--                     so the 6am rota deals it to that many children
-- ===========================================================================

-- allow 'monthly' recurrence
alter table job_def drop constraint if exists job_def_recurrence_check;
alter table job_def add constraint job_def_recurrence_check
  check (recurrence in ('daily', 'weekdays', 'weekly', 'monthly', 'on_demand'));

-- which room the job is in (nullable — not every job belongs to a room)
alter table job_def add column if not exists room text;

-- how many children the job should be dealt to (whole-room jobs need >1)
alter table job_def add column if not exists people_needed integer not null default 1;

-- The daily-unique index prevented duplicate dealt/board rows per job per day.
-- Multi-person jobs need one row per assignee, so key on assigned_to too. NULL
-- (board jobs) is coalesced to a fixed sentinel so there's still only one board
-- row per job per day.
drop index if exists job_instance_daily_unique;
create unique index if not exists job_instance_daily_unique
  on job_instance (job_def_id, date, coalesce(assigned_to, '00000000-0000-0000-0000-000000000000'::uuid))
  where is_bonus = false;
