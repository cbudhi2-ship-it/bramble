/**
 * POST /api/parent/review — clear one submitted job (spec §6).
 * Body: { jobInstanceId, action: 'approve' | 'part_done' | 'not_yet',
 *         percent?, note? }
 *
 *   approve   → status='approved',  award = price,           ledger +price
 *   part_done → status='part_done', award = percent of price, ledger +award
 *   not_yet   → status='open',      no ledger, job returns to the board
 *
 * "Not yet" is never "Rejected": it puts the job back on the board rather than
 * throwing it back at the child. Part-done must always pay for genuine effort.
 */
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getParent } from "@/lib/parent-auth";
import { partDoneAward } from "@/lib/money";

export async function POST(req: Request) {
  const parent = await getParent();
  if (!parent) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const action = body?.action as "approve" | "part_done" | "not_yet";
  if (!body?.jobInstanceId || !["approve", "part_done", "not_yet"].includes(action)) {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }

  const supabase = await createClient();

  // RLS scopes this to the parent's household automatically.
  const { data: job } = await supabase
    .from("job_instance")
    .select("id, status, claimed_by, is_bonus, award_pence, job_def:job_def_id(price_pence)")
    .eq("id", body.jobInstanceId)
    .maybeSingle();

  if (!job) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (job.status !== "submitted") {
    return NextResponse.json({ error: "Not awaiting review" }, { status: 409 });
  }

  // bonus (fallback) jobs carry their own price in award_pence; otherwise use the def price
  const jobDef = job.job_def as unknown as { price_pence: number } | null;
  const fullPrice = job.is_bonus ? (job.award_pence ?? 0) : (jobDef?.price_pence ?? 0);
  const now = new Date().toISOString();

  if (action === "not_yet") {
    await supabase
      .from("job_instance")
      .update({
        status: "open",
        claimed_by: null,
        submitted_at: null,
        reviewed_at: now,
        reviewed_by: parent.userId,
        parent_note: body.note ?? null,
      })
      .eq("id", job.id);
    return NextResponse.json({ ok: true, action });
  }

  const award = action === "approve" ? fullPrice : partDoneAward(fullPrice, Number(body.percent) || 0);

  await supabase
    .from("job_instance")
    .update({
      status: action === "approve" ? "approved" : "part_done",
      award_pence: award,
      reviewed_at: now,
      reviewed_by: parent.userId,
      parent_note: body.note ?? null,
    })
    .eq("id", job.id);

  if (award > 0 && job.claimed_by) {
    await supabase.from("ledger").insert({
      household_id: parent.householdId,
      member_id: job.claimed_by,
      delta_pence: award,
      reason: "job",
      job_instance_id: job.id,
      note: body.note ?? null,
      created_by: parent.userId,
    });
  }

  return NextResponse.json({ ok: true, action, award });
}
