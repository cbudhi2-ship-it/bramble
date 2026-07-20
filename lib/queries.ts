/**
 * Read helpers shared by Kid Mode and Parent Mode server components. All run on
 * the service-role client — Kid Mode has no auth context, and these are only
 * ever called server-side behind a validated session.
 */
import { createServiceClient } from "@/lib/supabase/server";
import { balancePence } from "@/lib/money";
import { resolvePresentMembers } from "@/lib/presence";
import { recurrenceFires } from "@/lib/rota";
import type { JobDef, JobInstance, Member, PresenceOverride } from "@/lib/types";

export interface HydratedJob extends JobInstance {
  job_def: JobDef;
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function daysAgo(n: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString().slice(0, 10);
}

/** Everything one child's home screen needs. */
export async function getMemberHome(memberId: string, householdId: string) {
  const supabase = createServiceClient();
  const date = today();

  const [{ data: jobs }, { data: ledger }, { data: goal }, { data: member }] = await Promise.all([
    supabase
      .from("job_instance")
      .select("*, job_def:job_def_id(*)")
      .eq("household_id", householdId)
      .eq("date", date),
    supabase.from("ledger").select("delta_pence").eq("member_id", memberId),
    supabase
      .from("goal")
      .select("*")
      .eq("member_id", memberId)
      .eq("active", true)
      .maybeSingle(),
    supabase.from("member").select("*").eq("id", memberId).maybeSingle(),
  ]);

  const all = (jobs ?? []) as HydratedJob[];
  // jobs dealt to this child today (still live)
  const dealt = all.filter((j) => j.assigned_to === memberId && j.status !== "approved");
  // the public paid board: unassigned, open jobs (paid pool + bonus fallbacks)
  const board = all.filter((j) => j.assigned_to === null && j.status === "open");

  return {
    member,
    dealt,
    board,
    goal,
    balancePence: balancePence(ledger ?? []),
  };
}

export interface UndistributedJob {
  id: string;
  title: string;
  icon: string;
  fallback_pence: number;
}

/** The parent "Today" view: the whole rota, plus the essential jobs that fire
 * today but couldn't be dealt to any present child — those fall to the parent. */
export async function getParentToday(householdId: string) {
  const supabase = createServiceClient();
  const date = today();

  const [
    { data: jobs },
    { data: members },
    { data: household },
    { data: jobDefs },
    { data: overrides },
  ] = await Promise.all([
    supabase
      .from("job_instance")
      .select("*, job_def:job_def_id(*)")
      .eq("household_id", householdId)
      .eq("date", date),
    supabase.from("member").select("*").eq("household_id", householdId).eq("active", true),
    supabase.from("household").select("*").eq("id", householdId).maybeSingle(),
    supabase.from("job_def").select("*").eq("household_id", householdId).eq("active", true),
    supabase
      .from("presence_override")
      .select("*, member!inner(household_id)")
      .eq("member.household_id", householdId),
  ]);

  const all = (jobs ?? []) as HydratedJob[];
  const present = resolvePresentMembers(
    (members ?? []) as Member[],
    date,
    (overrides ?? []) as PresenceOverride[]
  );
  const weekendCrew = present.some((m) => m.presence === "eow_and_holidays");
  const hasInstance = new Set(all.map((j) => j.job_def_id));

  // essential jobs that should happen today but nobody was dealt them
  const undistributed: UndistributedJob[] = ((jobDefs ?? []) as JobDef[])
    .filter(
      (d) =>
        d.kind === "house_critical" &&
        recurrenceFires(d, date) &&
        !(d.pool === "weekend_only" && !weekendCrew) &&
        !hasInstance.has(d.id)
    )
    .map((d) => ({
      id: d.id,
      title: d.title,
      icon: d.icon_key ?? "•",
      fallback_pence: d.fallback_pence,
    }));

  return {
    household,
    members: members ?? [],
    jobs: all,
    undistributed,
  };
}

export interface MemberInsight {
  id: string;
  name: string;
  colour: string;
  dealt: number; // essential jobs dealt to them in the window
  didOnTime: number; // …that they finished before 6pm
  lapsed: number; // …that they left to become a paid bonus
  grabbed: number; // paid/bonus jobs they picked up that weren't theirs
  consistencyPct: number | null; // didOnTime / dealt
}

/**
 * Consistency over a rolling window (default a week). Answers "do they clear
 * their own decks, or wait for jobs to become paid?" — didOnTime vs lapsed —
 * and how much opportunistic paid work they grab.
 */
export async function getInsights(householdId: string, days = 7) {
  const supabase = createServiceClient();
  const start = daysAgo(days - 1);

  const [{ data: members }, { data: rows }] = await Promise.all([
    supabase.from("member").select("*").eq("household_id", householdId).eq("active", true),
    supabase
      .from("job_instance")
      .select("dealt_to, claimed_by, is_bonus, status")
      .eq("household_id", householdId)
      .gte("date", start),
  ]);

  const done = (s: string) => s === "approved" || s === "part_done";

  const insights: MemberInsight[] = ((members ?? []) as Member[]).map((m) => {
    let dealt = 0,
      didOnTime = 0,
      lapsed = 0,
      grabbed = 0;
    for (const r of rows ?? []) {
      if (r.dealt_to === m.id) {
        dealt++;
        if (r.is_bonus) lapsed++;
        else if (done(r.status)) didOnTime++;
      }
      if (r.claimed_by === m.id && r.dealt_to !== m.id && done(r.status)) grabbed++;
    }
    return {
      id: m.id,
      name: m.display_name,
      colour: m.colour_hex,
      dealt,
      didOnTime,
      lapsed,
      grabbed,
      consistencyPct: dealt > 0 ? Math.round((didOnTime / dealt) * 100) : null,
    };
  });

  return { days, insights };
}
