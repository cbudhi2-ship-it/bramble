/**
 * Read helpers shared by Kid Mode and Parent Mode server components. All run on
 * the service-role client — Kid Mode has no auth context, and these are only
 * ever called server-side behind a validated session.
 */
import { createServiceClient } from "@/lib/supabase/server";
import { balancePence } from "@/lib/money";
import { resolvePresentMembers } from "@/lib/presence";
import { recurrenceFires, seededShuffle } from "@/lib/rota";
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
    { data: tasks },
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
    supabase
      .from("parent_task")
      .select("id, title, done")
      .eq("household_id", householdId)
      .eq("done", false)
      .order("created_at", { ascending: false }),
  ]);

  const all = (jobs ?? []) as HydratedJob[];
  const present = resolvePresentMembers(
    (members ?? []) as Member[],
    date,
    (overrides ?? []) as PresenceOverride[]
  );
  const weekendCrew = present.some((m) => m.presence === "eow_and_holidays");

  // who rides up front today — a FAIR daily rotation, not a fresh random pick
  // (which kept landing on the same children). Everyone gets a turn before
  // anyone repeats, and nobody gets it two days running. Precompute both the
  // 1-seat and 2-seat pick so the seat toggle is instant.
  const seats = Math.min(2, Math.max(1, household?.front_seats ?? 1));
  const frontInfo = (id: string) => {
    const m = present.find((p) => p.id === id)!;
    return { id: m.id, name: m.display_name, colour: m.colour_hex };
  };
  const dayNum = Math.floor(new Date(`${date}T00:00:00Z`).getTime() / 86_400_000);
  const frontFor = (n: number) =>
    rotateFrontSeat(present.map((m) => m.id), n, dayNum, householdId).map(frontInfo);
  const frontSeat = { seats, one: frontFor(1), two: frontFor(2) };
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
    parentTasks: (tasks ?? []) as { id: string; title: string; done: boolean }[],
    frontSeat,
  };
}

/**
 * Fair front-seat rotation. Shuffles who's here into a stable per-household
 * order, then walks a sliding window of `seats` through it, advancing `seats`
 * places per day. Everyone gets a turn before anyone repeats, the window never
 * overlaps day-to-day (so no child two days running), and the picks are always
 * distinct. Deterministic, so it holds all day and moves on tomorrow.
 */
function rotateFrontSeat(presentIds: string[], seats: number, dayNum: number, householdId: string): string[] {
  const ids = [...presentIds].sort(); // canonical order, independent of fetch order
  const n = ids.length;
  if (n === 0) return [];
  const s = Math.min(n, Math.max(1, seats));
  const base = seededShuffle(ids, `${householdId}:front:base`);
  const offset = (((dayNum * s) % n) + n) % n;
  const picks: string[] = [];
  for (let i = 0; i < s; i++) picks.push(base[(offset + i) % n]);
  return picks;
}

export interface TodayItem {
  title: string;
  icon: string;
  pence: number; // what they earned for it (0 = done, no money)
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
  today: TodayItem[]; // what they did / were paid for today
  todayPence: number; // total earned today
}

/**
 * Consistency over a rolling window (default a week). Answers "do they clear
 * their own decks, or wait for jobs to become paid?" — didOnTime vs lapsed —
 * and how much opportunistic paid work they grab.
 */
export async function getInsights(householdId: string, days = 7) {
  const supabase = createServiceClient();
  const start = daysAgo(days - 1);
  const todayStr = today();

  const [{ data: members }, { data: rows }, { data: doneToday }, { data: paysToday }] =
    await Promise.all([
      supabase.from("member").select("*").eq("household_id", householdId).eq("active", true),
      supabase
        .from("job_instance")
        .select("dealt_to, claimed_by, is_bonus, status")
        .eq("household_id", householdId)
        .gte("date", start),
      // today's completed jobs, with who did them and what they earned
      supabase
        .from("job_instance")
        .select("assigned_to, claimed_by, award_pence, is_bonus, status, job_def:job_def_id(title, icon_key, price_pence)")
        .eq("household_id", householdId)
        .eq("date", todayStr)
        .in("status", ["approved", "part_done"]),
      // today's non-job credits (thank-yous, pocket money) not tied to a job
      supabase
        .from("ledger")
        .select("member_id, delta_pence, reason")
        .eq("household_id", householdId)
        .gte("created_at", `${todayStr}T00:00:00.000Z`)
        .in("reason", ["spontaneous", "base", "adjustment"]),
    ]);

  const done = (s: string) => s === "approved" || s === "part_done";

  // per-member "what they did today" list
  const todayByMember: Record<string, TodayItem[]> = {};
  const push = (id: string | null, item: TodayItem) => {
    if (!id) return;
    (todayByMember[id] ??= []).push(item);
  };
  type DoneRow = {
    assigned_to: string | null;
    claimed_by: string | null;
    award_pence: number | null;
    job_def: { title?: string; icon_key?: string; price_pence?: number } | null;
  };
  for (const j of (doneToday ?? []) as unknown as DoneRow[]) {
    const doer = j.claimed_by ?? j.assigned_to;
    const def = j.job_def;
    push(doer, {
      title: def?.title ?? "Job",
      icon: def?.icon_key ?? "•",
      pence: j.award_pence ?? def?.price_pence ?? 0,
    });
  }
  for (const p of (paysToday ?? []) as { member_id: string; delta_pence: number; reason: string }[]) {
    if (p.delta_pence <= 0) continue;
    push(p.member_id, {
      title: p.reason === "spontaneous" ? "Thank-you" : p.reason === "base" ? "Pocket money" : "Adjustment",
      icon: p.reason === "spontaneous" ? "💝" : "🪙",
      pence: p.delta_pence,
    });
  }

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
    const todayItems = todayByMember[m.id] ?? [];
    return {
      id: m.id,
      name: m.display_name,
      colour: m.colour_hex,
      dealt,
      didOnTime,
      lapsed,
      grabbed,
      consistencyPct: dealt > 0 ? Math.round((didOnTime / dealt) * 100) : null,
      today: todayItems,
      todayPence: todayItems.reduce((s, it) => s + it.pence, 0),
    };
  });

  return { days, insights };
}
