/**
 * POST /api/kid/goal — a child sets what they're working towards.
 * Body: { title, target_pence }
 *
 * One active goal at a time; an empty title clears it. Runs on the service-role
 * client behind a validated child session (spec §3.4).
 */
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { getChildSession, buildSessionCookie, createChildToken } from "@/lib/child-session";

export async function POST(req: Request) {
  const session = await getChildSession(req);
  if (!session) return NextResponse.json({ error: "No session" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const title = (body?.title ?? "").toString().trim().slice(0, 80);
  const target_pence = Math.max(0, Math.round(Number(body?.target_pence) || 0));

  const supabase = createServiceClient();
  await supabase
    .from("goal")
    .update({ active: false })
    .eq("member_id", session.memberId)
    .eq("active", true);

  let goal = null;
  if (title) {
    const { data } = await supabase
      .from("goal")
      .insert({ member_id: session.memberId, title, target_pence, active: true })
      .select("id, title, target_pence")
      .single();
    goal = data;
  }

  const res = NextResponse.json({ ok: true, goal });
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
