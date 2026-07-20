/**
 * POST /api/kid/submit  — a child taps "I've done it".
 * Body: { jobInstanceId }
 *
 * status → 'submitted', submitted_at = now. This is a CLAIM, not a credit — it
 * lands in the parent's review queue and pays nothing until approved (spec §2,
 * §3.3). A child can only submit a job dealt to them or claimed by them.
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

  const { data: job } = await supabase
    .from("job_instance")
    .select("id, status, assigned_to, claimed_by, household_id")
    .eq("id", body.jobInstanceId)
    .eq("household_id", session.householdId)
    .maybeSingle();

  if (!job) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const isMine = job.assigned_to === session.memberId || job.claimed_by === session.memberId;
  if (!isMine) return NextResponse.json({ error: "Not your job" }, { status: 403 });
  if (!["open", "claimed"].includes(job.status)) {
    return NextResponse.json({ error: "Already submitted" }, { status: 409 });
  }

  await supabase
    .from("job_instance")
    .update({
      status: "submitted",
      submitted_at: new Date().toISOString(),
      claimed_by: session.memberId,
    })
    .eq("id", job.id);

  const res = NextResponse.json({ ok: true });
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
