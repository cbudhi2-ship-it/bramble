-- ===========================================================================
-- Bramble — initial schema (spec §4)
-- ===========================================================================
-- Scale is ~7 users and a few hundred rows a month. Single household row is
-- fine, but household_id is carried everywhere so this stays multi-tenant.
--
-- Security model (spec §3.4):
--   * Parents are real Supabase Auth users. RLS scopes them to their household.
--   * Children are ROWS, not users. They have no auth context. Every child
--     read/write goes through a server route holding a validated child-session
--     token and the SERVICE-ROLE client. The anon client is never exposed to
--     Kid Mode. So there is deliberately no child-facing RLS to write.
-- ===========================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- household
-- ---------------------------------------------------------------------------
create table if not exists household (
  id                       uuid primary key default gen_random_uuid(),
  name                     text not null,
  load_state               text not null default 'normal'
                             check (load_state in ('normal','stretched','survival')),
  base_pocket_money_pence  integer not null default 0,
  created_at               timestamptz not null default now()
);

-- parent_account links a Supabase Auth user to a household. The two parents each
-- get one row. This is the only bridge between auth.users and household data.
create table if not exists parent_account (
  user_id       uuid primary key references auth.users(id) on delete cascade,
  household_id  uuid not null references household(id) on delete cascade,
  display_name  text not null,
  created_at    timestamptz not null default now()
);
create index if not exists parent_account_household_idx on parent_account(household_id);

-- ---------------------------------------------------------------------------
-- member  (the children — rows, not users)
-- ---------------------------------------------------------------------------
create table if not exists member (
  id                uuid primary key default gen_random_uuid(),
  household_id      uuid not null references household(id) on delete cascade,
  display_name      text not null,
  dob               date,
  colour_hex        text not null default '#6B2456',
  avatar_key        text,
  mode              text not null default 'standard'
                      check (mode in ('low_demand','standard','young_visual')),
  presence          text not null default 'full_time'
                      check (presence in ('full_time','eow_and_holidays')),
  pin_hash          text,
  pin_type          text not null default 'numeric'
                      check (pin_type in ('numeric','picture')),
  weekly_cap_pence      integer,   -- full-timers; resets Monday 00:00
  per_visit_cap_pence   integer,   -- weekend crew; resets on arrival
  active            boolean not null default true,
  created_at        timestamptz not null default now()
);
create index if not exists member_household_idx on member(household_id);

-- ---------------------------------------------------------------------------
-- presence_override  (holidays, swaps, one-off nights)
-- ---------------------------------------------------------------------------
create table if not exists presence_override (
  id          uuid primary key default gen_random_uuid(),
  member_id   uuid not null references member(id) on delete cascade,
  date_from   date not null,
  date_to     date not null,
  present     boolean not null,
  note        text
);
create index if not exists presence_override_member_idx on presence_override(member_id);

-- ---------------------------------------------------------------------------
-- job_def  (the library of jobs; parents create these)
-- ---------------------------------------------------------------------------
create table if not exists job_def (
  id              uuid primary key default gen_random_uuid(),
  household_id    uuid not null references household(id) on delete cascade,
  title           text not null,
  icon_key        text,
  kind            text not null
                    check (kind in ('house_critical','paid','life_skill')),
  price_pence     integer not null default 0,   -- 0 for house_critical & life_skill
  age_min         integer not null default 0,
  age_max         integer not null default 99,
  tier            text not null default 'full'
                    check (tier in ('core','full')),
  pool            text not null default 'any'
                    check (pool in ('any','weekend_only')),
  recurrence      text not null default 'daily'
                    check (recurrence in ('daily','weekdays','weekly','on_demand')),
  low_demand_safe boolean not null default false,
  framing_direct  text,   -- "Empty the dishwasher"
  framing_ambient text,   -- "The dishwasher is full"
  active          boolean not null default true,
  created_at      timestamptz not null default now()
);
create index if not exists job_def_household_idx on job_def(household_id);

-- ---------------------------------------------------------------------------
-- job_instance  (one per job per day)
-- ---------------------------------------------------------------------------
create table if not exists job_instance (
  id            uuid primary key default gen_random_uuid(),
  household_id  uuid not null references household(id) on delete cascade,
  job_def_id    uuid not null references job_def(id) on delete cascade,
  date          date not null,
  assigned_to   uuid references member(id) on delete set null,  -- null for board jobs
  claimed_by    uuid references member(id) on delete set null,
  status        text not null default 'open'
                  check (status in ('open','claimed','submitted','approved','part_done','not_yet','expired')),
  is_bonus      boolean not null default false,
  deadline_at   timestamptz,
  submitted_at  timestamptz,
  reviewed_at   timestamptz,
  reviewed_by   uuid references auth.users(id) on delete set null,
  award_pence   integer,          -- what was actually paid (may be < price_pence)
  parent_note   text,
  created_at    timestamptz not null default now()
);
create index if not exists job_instance_household_date_idx on job_instance(household_id, date);
create index if not exists job_instance_status_idx on job_instance(household_id, status);
-- one board/dealt instance per job_def per day (bonus fallbacks are separate rows)
create unique index if not exists job_instance_daily_unique
  on job_instance(job_def_id, date) where is_bonus = false;

-- ---------------------------------------------------------------------------
-- ledger  (append-only — balance = SUM(delta_pence))
-- ---------------------------------------------------------------------------
create table if not exists ledger (
  id               uuid primary key default gen_random_uuid(),
  household_id     uuid not null references household(id) on delete cascade,
  member_id        uuid not null references member(id) on delete cascade,
  delta_pence      integer not null,
  reason           text not null
                     check (reason in ('job','base','spontaneous','spend','adjustment')),
  job_instance_id  uuid references job_instance(id) on delete set null,
  note             text,
  created_by       uuid references auth.users(id) on delete set null,
  created_at       timestamptz not null default now()
);
create index if not exists ledger_member_idx on ledger(member_id);
create index if not exists ledger_household_idx on ledger(household_id);

-- ---------------------------------------------------------------------------
-- goal  (per child)
-- ---------------------------------------------------------------------------
create table if not exists goal (
  id            uuid primary key default gen_random_uuid(),
  member_id     uuid not null references member(id) on delete cascade,
  title         text not null,
  target_pence  integer not null,
  image_key     text,
  active        boolean not null default true,
  achieved_at   timestamptz
);
create index if not exists goal_member_idx on goal(member_id);

-- ---------------------------------------------------------------------------
-- collective_goal  (the one shared, unattributed progress display — v2)
-- ---------------------------------------------------------------------------
create table if not exists collective_goal (
  id             uuid primary key default gen_random_uuid(),
  household_id   uuid not null references household(id) on delete cascade,
  title          text not null,
  target_pence   integer not null,
  progress_pence integer not null default 0,
  image_key      text,
  achieved_at    timestamptz
);
create index if not exists collective_goal_household_idx on collective_goal(household_id);

-- ---------------------------------------------------------------------------
-- life_skill  (v2)
-- ---------------------------------------------------------------------------
create table if not exists life_skill (
  id            uuid primary key default gen_random_uuid(),
  household_id  uuid not null references household(id) on delete cascade,
  title         text not null,
  age_min       integer not null default 0,
  body_md       text,
  icon_key      text
);
create index if not exists life_skill_household_idx on life_skill(household_id);

-- ===========================================================================
-- Row Level Security
-- ===========================================================================
-- Parents only. Children never touch these tables directly — Kid-Mode traffic
-- runs through server routes on the service-role client, which bypasses RLS.
-- ===========================================================================

alter table household         enable row level security;
alter table parent_account    enable row level security;
alter table member            enable row level security;
alter table presence_override enable row level security;
alter table job_def           enable row level security;
alter table job_instance      enable row level security;
alter table ledger            enable row level security;
alter table goal              enable row level security;
alter table collective_goal   enable row level security;
alter table life_skill        enable row level security;

-- helper: the household_id of the currently authenticated parent
create or replace function current_household_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select household_id from parent_account where user_id = auth.uid()
$$;

-- household: a parent can see / update their own household
drop policy if exists household_parent_rw on household;
create policy household_parent_rw on household
  for all using (id = current_household_id())
  with check (id = current_household_id());

-- parent_account: a parent can read rows in their household
drop policy if exists parent_account_read on parent_account;
create policy parent_account_read on parent_account
  for select using (household_id = current_household_id());

-- generic household-scoped policy for the child-data tables
drop policy if exists member_parent_rw on member;
create policy member_parent_rw on member
  for all using (household_id = current_household_id())
  with check (household_id = current_household_id());

drop policy if exists presence_override_parent_rw on presence_override;
create policy presence_override_parent_rw on presence_override
  for all using (
    member_id in (select id from member where household_id = current_household_id())
  ) with check (
    member_id in (select id from member where household_id = current_household_id())
  );

drop policy if exists job_def_parent_rw on job_def;
create policy job_def_parent_rw on job_def
  for all using (household_id = current_household_id())
  with check (household_id = current_household_id());

drop policy if exists job_instance_parent_rw on job_instance;
create policy job_instance_parent_rw on job_instance
  for all using (household_id = current_household_id())
  with check (household_id = current_household_id());

drop policy if exists ledger_parent_rw on ledger;
create policy ledger_parent_rw on ledger
  for all using (household_id = current_household_id())
  with check (household_id = current_household_id());

drop policy if exists goal_parent_rw on goal;
create policy goal_parent_rw on goal
  for all using (
    member_id in (select id from member where household_id = current_household_id())
  ) with check (
    member_id in (select id from member where household_id = current_household_id())
  );

drop policy if exists collective_goal_parent_rw on collective_goal;
create policy collective_goal_parent_rw on collective_goal
  for all using (household_id = current_household_id())
  with check (household_id = current_household_id());

drop policy if exists life_skill_parent_rw on life_skill;
create policy life_skill_parent_rw on life_skill
  for all using (household_id = current_household_id())
  with check (household_id = current_household_id());
