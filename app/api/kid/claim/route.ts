/**
 * POST /api/kid/claim  — a child taps a board job.
 * Body: { jobInstanceId }
 *
 * A claim is a soft hold, not a credit — status goes 'open' → 'claimed',
 * claimed_by = the child. Nothing is paid until a parent approves (spec §2).
 */
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { getChildSession, buildSessionCookie, createChildToken } from "@/lib/child-session";

export async function POST(req: Request) {
  const session = await getChildSession(req);
  if (!session) return NextResponse.json({ error: "No session" }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body?.jobInstanceId)
    return NextResponse.json({ error: "jobInstanceId required" }, { status: 400 });

  const supabase = createServiceClient();

  // must be an open, unassigned (board) job in the child's household
  const { data: job } = await supabase
    .from("job_instance")
    .select("id, status, assigned_to, household_id")
    .eq("id", body.jobInstanceId)
    .eq("household_id", session.householdId)
    .maybeSingle();

  if (!job) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (job.status !== "open" || job.assigned_to) {
    return NextResponse.json({ error: "Already taken" }, { status: 409 });
  }

  await supabase
    .from("job_instance")
    .update({ status: "claimed", claimed_by: session.memberId })
    .eq("id", job.id)
    .eq("status", "open"); // guard against a race

  const res = NextResponse.json({ ok: true });
  // extend the inactivity window
  const token = await createChildToken({
    memberId: session.memberId,
    householdId: session.householdId,
    displayName: session.displayName,
    colourHex: session.colourHex,
    mode: session.mode,
  });
  res.headers.set("Set-Cookie", buildSessionCookie(token));
  return res;
}
