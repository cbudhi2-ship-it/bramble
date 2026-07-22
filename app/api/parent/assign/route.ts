/**
 * POST /api/parent/assign — hand a board job (one that's up for grabs) to a
 * specific child, so it lands on their "dealt to you today" list for the day
 * instead of sitting on the shared board.
 *
 * Body: { jobInstanceId, memberId }
 *   Sets assigned_to + dealt_to to the chosen child. The job stays open, so the
 *   child can still tick it off in Kid Mode and it counts towards their day.
 */
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getParent } from "@/lib/parent-auth";

export async function POST(req: Request) {
  const parent = await getParent();
  if (!parent) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body?.jobInstanceId || !body?.memberId) {
    return NextResponse.json({ error: "jobInstanceId and memberId required" }, { status: 400 });
  }

  const supabase = await createClient();

  // the child must belong to this parent's household
  const { data: member } = await supabase
    .from("member")
    .select("id")
    .eq("id", body.memberId)
    .eq("household_id", parent.householdId)
    .maybeSingle();
  if (!member) return NextResponse.json({ error: "Child not found" }, { status: 404 });

  const { data: job } = await supabase
    .from("job_instance")
    .select("id, status")
    .eq("id", body.jobInstanceId)
    .eq("household_id", parent.householdId)
    .maybeSingle();
  if (!job) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (["approved", "part_done", "expired"].includes(job.status)) {
    return NextResponse.json({ error: "Already sorted" }, { status: 409 });
  }

  await supabase
    .from("job_instance")
    .update({ assigned_to: body.memberId, dealt_to: body.memberId })
    .eq("id", job.id);

  return NextResponse.json({ ok: true });
}
