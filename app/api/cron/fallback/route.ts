/**
 * GET /api/cron/fallback  — the 18:05 sweep (spec §5.1, the load-bearing part).
 *
 * Any job still open or claimed past its deadline stops being a dealt demand and
 * becomes paid bonus work on the public board: assigned_to → null, is_bonus →
 * true, a fallback price attached, claimable by anyone present. An undone
 * critical job becomes an opportunity for someone else instead of a row.
 *
 * Fallback prices rise with the load state (spec §9) so undone work gets
 * hoovered up faster on stretched/survival days.
 */
export const runtime = "nodejs";
export const maxDuration = 60;

import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import type { LoadState } from "@/lib/types";

function unauthorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return req.headers.get("authorization") !== `Bearer ${secret}`;
}

/**
 * Load-state bump for the 6pm price. The base price is the parent's per-job
 * fallback_pence (set at creation); on a stretched/survival day we raise it a
 * little so undone work gets hoovered up faster (spec §9). Normal days pay
 * exactly what the parent set.
 */
function loadMultiplier(load: LoadState): number {
  if (load === "survival") return 2;
  if (load === "stretched") return 1.5;
  return 1;
}

export async function GET(req: Request) {
  if (unauthorized(req)) return new NextResponse("Unauthorized", { status: 401 });

  const supabase = createServiceClient();
  const nowIso = new Date().toISOString();

  const { data: households } = await supabase.from("household").select("id, load_state");
  if (!households) return NextResponse.json({ ok: true, swept: 0 });

  // Low-demand (PDA) children work at their own pace: their dealt tasks are
  // never swept off their dashboard by the deadline — they stay assigned and
  // tickable all evening. Only these members are exempt.
  const { data: lowDemand } = await supabase
    .from("member")
    .select("id")
    .eq("mode", "low_demand")
    .eq("active", true);
  const pacedYourself = new Set((lowDemand ?? []).map((m) => m.id));

  let swept = 0;

  for (const household of households) {
    // open OR claimed, past deadline, not already a bonus — with each job's
    // creation-time fallback price.
    const { data: stale } = await supabase
      .from("job_instance")
      .select("id, assigned_to, job_def:job_def_id(fallback_pence)")
      .eq("household_id", household.id)
      .in("status", ["open", "claimed"])
      .eq("is_bonus", false)
      .lt("deadline_at", nowIso);

    if (!stale?.length) continue;

    const mult = loadMultiplier(household.load_state as LoadState);

    for (const row of stale) {
      // leave a PDA child's task with them — no deadline snatch
      if (row.assigned_to && pacedYourself.has(row.assigned_to)) continue;

      const def = row.job_def as unknown as { fallback_pence: number } | null;
      const price = Math.round((def?.fallback_pence ?? 75) * mult);
      const { error } = await supabase
        .from("job_instance")
        .update({
          assigned_to: null,
          claimed_by: null,
          status: "open",
          is_bonus: true,
          award_pence: price,
        })
        .eq("id", row.id);
      if (!error) swept += 1;
    }
  }

  return NextResponse.json({ ok: true, swept });
}
