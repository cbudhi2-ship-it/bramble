/**
 * Parent-auth helpers. Parent Mode is the only context in which money can be
 * credited, jobs created, or approvals given (spec §3.1).
 *
 * getParent() — read-only: resolves the signed-in user to their household, or
 * null if they have no parent_account.
 *
 * getParentOrBootstrap() — used by the Parent Mode entry page: on a parent's
 * very first sign-in it auto-creates (or joins) the household and their
 * parent_account, so there's no manual SQL/seed step. Gated by an optional
 * ALLOWED_PARENT_EMAILS allowlist so a random sign-up on the public site can't
 * get into the family's data.
 */
import { createClient, createServiceClient } from "@/lib/supabase/server";

export interface ParentContext {
  userId: string;
  householdId: string;
  displayName: string;
}

export async function getParent(): Promise<ParentContext | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: account } = await supabase
    .from("parent_account")
    .select("household_id, display_name")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!account) return null;
  return {
    userId: user.id,
    householdId: account.household_id,
    displayName: account.display_name,
  };
}

/** Comma-separated allowlist of parent emails, or null when unset (dev = open). */
function allowedEmails(): string[] | null {
  const raw = process.env.ALLOWED_PARENT_EMAILS;
  if (!raw) return null;
  return raw
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

// Sensible starter jobs so a brand-new household isn't empty. Generic — no names.
const DEFAULT_JOBS = [
  { title: "Empty the dishwasher", icon_key: "🍽️", kind: "house_critical", tier: "core", age_min: 8, low_demand_safe: false, fallback_pence: 100, room: "Kitchen", framing_direct: "Empty the dishwasher", framing_ambient: "The dishwasher is full" },
  { title: "Feed the pet", icon_key: "🐾", kind: "house_critical", tier: "core", age_min: 5, low_demand_safe: true, fallback_pence: 75, room: "Kitchen", framing_direct: "Feed the pet", framing_ambient: "The pet's bowl is empty" },
  { title: "Bins out", icon_key: "🗑️", kind: "house_critical", tier: "core", age_min: 8, low_demand_safe: true, fallback_pence: 75, framing_direct: "Put the bins out", framing_ambient: "The bins need to go out" },
  { title: "Shoes away", icon_key: "👟", kind: "house_critical", tier: "full", age_min: 5, low_demand_safe: true, fallback_pence: 50, room: "Hallway", framing_direct: "Put your shoes away", framing_ambient: "There are shoes in the hall" },
  { title: "Match the socks", icon_key: "🧦", kind: "paid", price_pence: 60, fallback_pence: 60, age_min: 5, room: "Utility", framing_direct: "Match the socks", framing_ambient: "There's a basket of odd socks" },
  { title: "Water the plants", icon_key: "🪴", kind: "paid", price_pence: 50, fallback_pence: 50, age_min: 5, framing_direct: "Water the plants", framing_ambient: "The plants look thirsty" },
];

export type BootstrapResult =
  | { ok: true; parent: ParentContext }
  | { ok: false; reason: "unauthenticated" | "not_allowed" };

export async function getParentOrBootstrap(): Promise<BootstrapResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, reason: "unauthenticated" };

  // already set up?
  const { data: account } = await supabase
    .from("parent_account")
    .select("household_id, display_name")
    .eq("user_id", user.id)
    .maybeSingle();
  if (account) {
    return {
      ok: true,
      parent: { userId: user.id, householdId: account.household_id, displayName: account.display_name },
    };
  }

  // gate first-time bootstrap by the allowlist (if configured)
  const allow = allowedEmails();
  const email = (user.email ?? "").toLowerCase();
  if (allow && !allow.includes(email)) return { ok: false, reason: "not_allowed" };

  const admin = createServiceClient();

  // Single-family instance: join the existing household if there is one,
  // otherwise create it (and seed the starter jobs).
  const { data: existing } = await admin
    .from("household")
    .select("id")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  let householdId: string;
  if (existing?.id) {
    householdId = existing.id as string;
  } else {
    const { data: hh } = await admin
      .from("household")
      .insert({ name: "Our house", base_pocket_money_pence: 0, load_state: "normal" })
      .select("id")
      .single();
    householdId = hh!.id as string;
    const hid = householdId; // const for the closure below
    await admin.from("job_def").insert(DEFAULT_JOBS.map((j) => ({ household_id: hid, ...j })));
  }

  const displayName = (user.email ?? "Parent").split("@")[0];
  await admin
    .from("parent_account")
    .insert({ user_id: user.id, household_id: householdId, display_name: displayName });

  return { ok: true, parent: { userId: user.id, householdId, displayName } };
}
