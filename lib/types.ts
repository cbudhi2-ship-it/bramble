/** Shared domain types (mirrors supabase/migrations/0001_init.sql). */

export type LoadState = "normal" | "stretched" | "survival";
export type MemberMode = "low_demand" | "standard" | "young_visual";
export type Presence = "full_time" | "eow_and_holidays";
export type PinType = "numeric" | "picture";
export type JobKind = "house_critical" | "paid" | "life_skill";
export type Tier = "core" | "full";
export type Pool = "any" | "weekend_only";
export type Recurrence = "daily" | "weekdays" | "weekly" | "monthly" | "on_demand";
export type JobStatus =
  | "open"
  | "claimed"
  | "submitted"
  | "approved"
  | "part_done"
  | "not_yet"
  | "expired";
export type LedgerReason = "job" | "base" | "spontaneous" | "spend" | "adjustment";

export interface Household {
  id: string;
  name: string;
  load_state: LoadState;
  base_pocket_money_pence: number;
  meal_ideas: string[];
  front_seats: number;
  created_at: string;
}

export interface Member {
  id: string;
  household_id: string;
  display_name: string;
  dob: string | null;
  colour_hex: string;
  avatar_key: string | null;
  mode: MemberMode;
  presence: Presence;
  pin_hash: string | null;
  pin_type: PinType;
  weekly_cap_pence: number | null;
  per_visit_cap_pence: number | null;
  fave_foods: string[];
  active: boolean;
  created_at: string;
}

export interface PresenceOverride {
  id: string;
  member_id: string;
  date_from: string;
  date_to: string;
  present: boolean;
  note: string | null;
}

export interface JobDef {
  id: string;
  household_id: string;
  title: string;
  icon_key: string | null;
  kind: JobKind;
  price_pence: number;
  fallback_pence: number;
  age_min: number;
  age_max: number;
  tier: Tier;
  pool: Pool;
  recurrence: Recurrence;
  room: string | null;
  people_needed: number;
  low_demand_safe: boolean;
  framing_direct: string | null;
  framing_ambient: string | null;
  active: boolean;
  created_at: string;
}

export interface JobInstance {
  id: string;
  household_id: string;
  job_def_id: string;
  date: string;
  assigned_to: string | null;
  dealt_to: string | null;
  claimed_by: string | null;
  status: JobStatus;
  is_bonus: boolean;
  deadline_at: string | null;
  submitted_at: string | null;
  reviewed_at: string | null;
  reviewed_by: string | null;
  award_pence: number | null;
  parent_note: string | null;
  created_at: string;
}
