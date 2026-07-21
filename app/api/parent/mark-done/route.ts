/**
 * POST /api/parent/mark-done — the parent records that a job got done, and who
 * did it, without the child having to submit it in Kid Mode (spec §6). Useful
 * when a child did the job but couldn't get to the device, or when someone
 * cleared an after-6pm bonus.
 *
 * Body: { jobInstanceId, memberId }
 *   memberId = the child who did it → they're credited (and paid, if the job
 *              carries money — a paid job or an after-6pm bonus).
 *   memberId = null → "a grown-up did it": marked done, nobody paid.
 */
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getParent } from "@/lib/parent-auth";

export async function POST(req: Request) {
  const parent = await getParent();
  if (!parent) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body?.jobInstanceId) {
    return NextResponse.json({ error: "jobInstanceId required" }, { status: 400 });
  }
  const memberId: string | null = body.memberId ?? null;

  const supabase = await createClient();

  const { data: job } = await supabase
    .from("job_instance")
    .select("id, status, is_bonus, award_pence, job_def:job_def_id(price_pence)")
    .eq("id", body.jobInstanceId)
    .maybeSingle();

  if (!job) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (["approved", "part_done", "expired"].includes(job.status)) {
    return NextResponse.json({ error: "Already sorted" }, { status: 409 });
  }

  // money the job carries: a fallback bonus keeps its price in award_pence,
  // otherwise it's the job's board price (essential jobs are 0).
  const jobDef = job.job_def as unknown as { price_pence: number } | null;
  const award = job.is_bonus ? (job.award_pence ?? 0) : (jobDef?.price_pence ?? 0);
  const now = new Date().toISOString();

  await supabase
    .from("job_instance")
    .update({
      status: "approved",
      claimed_by: memberId,
      award_pence: memberId ? award : 0,
      reviewed_at: now,
      reviewed_by: parent.userId,
    })
    .eq("id", job.id);

  if (memberId && award > 0) {
    await supabase.from("ledger").insert({
      household_id: parent.householdId,
      member_id: memberId,
      delta_pence: award,
      reason: "job",
      job_instance_id: job.id,
      created_by: parent.userId,
    });
  }

  return NextResponse.json({ ok: true, award: memberId ? award : 0 });
}
