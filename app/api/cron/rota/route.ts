/**
 * GET /api/cron/rota  — the six o'clock deal (spec §5).
 *
 * Vercel cron, 06:00 daily (see vercel.json). Resolves who is present, chooses
 * the tier, runs the pure planRota() engine, and writes job_instance rows with
 * the SERVICE-ROLE client — the generator writes on behalf of every child, so
 * it must never be the browser client (spec §2).
 *
 * Idempotent per day: it clears any non-bonus instances for the date first, so
 * a re-run re-deals cleanly rather than duplicating (the seeded shuffle makes
 * the re-deal identical anyway).
 */
export const runtime = "nodejs";
export const maxDuration = 60;

import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { resolvePresentMembers } from "@/lib/presence";
import { planRota } from "@/lib/rota";
import type { JobDef, Member, PresenceOverride } from "@/lib/types";

function unauthorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false; // allow in local dev when unset
  return req.headers.get("authorization") !== `Bearer ${secret}`;
}

/** 18:00 UTC deadline on the given date. */
function deadlineFor(date: string): string {
  return new Date(`${date}T18:00:00Z`).toISOString();
}

function yesterdayOf(date: string): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

export async function GET(req: Request) {
  if (unauthorized(req)) return new NextResponse("Unauthorized", { status: 401 });

  const supabase = createServiceClient();
  const today = new Date().toISOString().slice(0, 10);
  const yesterday = yesterdayOf(today);

  const { data: households } = await supabase.from("household").select("*");
  if (!households) return NextResponse.json({ ok: true, households: 0 });

  const results: Record<string, unknown> = {};

  for (const household of households) {
    const [{ data: members }, { data: jobDefs }, { data: overrides }, { data: yest }] =
      await Promise.all([
        supabase.from("member").select("*").eq("household_id", household.id).eq("active", true),
        supabase.from("job_def").select("*").eq("household_id", household.id).eq("active", true),
        supabase
          .from("presence_override")
          .select("*, member!inner(household_id)")
          .eq("member.household_id", household.id),
        supabase
          .from("job_instance")
          .select("assigned_to, job_def_id")
          .eq("household_id", household.id)
          .eq("date", yesterday)
          .eq("is_bonus", false),
      ]);

    const present = resolvePresentMembers(
      (members ?? []) as Member[],
      today,
      (overrides ?? []) as PresenceOverride[]
    );

    const yesterdayByMember: Record<string, string[]> = {};
    for (const row of yest ?? []) {
      if (!row.assigned_to) continue;
      (yesterdayByMember[row.assigned_to] ??= []).push(row.job_def_id);
    }

    const plan = planRota({
      householdId: household.id,
      date: today,
      loadState: household.load_state,
      presentMembers: present,
      jobDefs: (jobDefs ?? []) as JobDef[],
      yesterdayByMember,
    });

    // clear today's non-bonus instances (idempotent re-run)
    await supabase
      .from("job_instance")
      .delete()
      .eq("household_id", household.id)
      .eq("date", today)
      .eq("is_bonus", false);

    const rows = [
      ...plan.dealt.map((d) => ({
        household_id: household.id,
        job_def_id: d.job_def_id,
        date: today,
        assigned_to: d.assigned_to,
        dealt_to: d.assigned_to, // persists through the 6pm sweep for insights
        status: "open" as const,
        is_bonus: false,
        deadline_at: deadlineFor(today),
      })),
      ...plan.board.map((b) => ({
        household_id: household.id,
        job_def_id: b.job_def_id,
        date: today,
        assigned_to: null,
        status: "open" as const,
        is_bonus: false,
        deadline_at: deadlineFor(today),
      })),
    ];

    if (rows.length) await supabase.from("job_instance").insert(rows);

    results[household.id] = { tier: plan.tier, dealt: plan.dealt.length, board: plan.board.length };
  }

  return NextResponse.json({ ok: true, date: today, results });
}
