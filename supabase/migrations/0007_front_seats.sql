-- ===========================================================================
-- Front-seat picker.
-- ===========================================================================
-- Ends the daily "can I sit in the front?" argument: the app randomly picks
-- who rides up front for the day. `front_seats` is how many seats are up for
-- grabs (1 or 2); the pick itself is computed fresh each day from who's here,
-- deterministically, so it's stable all day and changes tomorrow.
-- ===========================================================================

alter table household add column if not exists front_seats smallint not null default 1;
