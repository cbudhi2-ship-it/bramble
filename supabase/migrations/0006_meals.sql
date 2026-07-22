-- ===========================================================================
-- Weekly meal planner.
-- ===========================================================================
-- Every child records up to 3 favourite foods (changeable any time). The
-- grown-ups add up to 6 meal ideas. A button then generates lunch + dinner for
-- 7 days from the collective foods — and that week's plan is "stuck": it's
-- saved against the week, so changing a favourite later only affects the next
-- week you generate.
-- ===========================================================================

alter table member    add column if not exists fave_foods text[] not null default '{}';
alter table household add column if not exists meal_ideas text[] not null default '{}';

create table if not exists meal_plan (
  id            uuid primary key default gen_random_uuid(),
  household_id  uuid not null references household(id) on delete cascade,
  week_start    date not null,                 -- the Monday the plan covers
  plan          jsonb not null,                -- [{ lunch, dinner }] × 7
  created_by    uuid references auth.users(id) on delete set null,
  created_at    timestamptz not null default now(),
  unique (household_id, week_start)
);
create index if not exists meal_plan_household_idx on meal_plan(household_id);

alter table meal_plan enable row level security;

drop policy if exists meal_plan_parent_rw on meal_plan;
create policy meal_plan_parent_rw on meal_plan
  for all using (household_id = current_household_id())
  with check (household_id = current_household_id());
