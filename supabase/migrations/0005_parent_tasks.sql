-- ===========================================================================
-- Parent's own to-do list.
-- ===========================================================================
-- Separate from the children's job library (job_def) and from the auto
-- "on your list" (essential jobs nobody could be dealt): this is a plain
-- personal to-do for the grown-ups — things that aren't dealt to a child.
-- ===========================================================================

create table if not exists parent_task (
  id            uuid primary key default gen_random_uuid(),
  household_id  uuid not null references household(id) on delete cascade,
  title         text not null,
  done          boolean not null default false,
  created_by    uuid references auth.users(id) on delete set null,
  created_at    timestamptz not null default now(),
  done_at       timestamptz
);
create index if not exists parent_task_household_idx on parent_task(household_id);

alter table parent_task enable row level security;

drop policy if exists parent_task_parent_rw on parent_task;
create policy parent_task_parent_rw on parent_task
  for all using (household_id = current_household_id())
  with check (household_id = current_household_id());
