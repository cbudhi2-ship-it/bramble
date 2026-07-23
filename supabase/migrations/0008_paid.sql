-- ===========================================================================
-- One-off unlock fee (Stripe).
-- ===========================================================================
-- A single one-time payment per household unlocks the app. `paid` is flipped to
-- true by the Stripe webhook on a completed checkout.
--
-- Every household that already exists is grandfathered in (paid = true) so no
-- current family — including the owner's own — is ever locked out. Only new
-- households created after this migration start unpaid.
-- ===========================================================================

alter table household add column if not exists paid boolean not null default false;
update household set paid = true;
