/**
 * POST /api/kid/foods — a child records their favourite foods (up to 3).
 * Body: { foods: string[] }
 *
 * Changeable any time; this only feeds the *next* meal plan you generate — a
 * week that's already been made is stuck. Runs on the service-role client
 * behind a validated child session.
 */
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { getChildSession, buildSessionCookie, createChildToken } from "@/lib/child-session";

export async function POST(req: Request) {
  const session = await getChildSession(req);
  if (!session) return NextResponse.json({ error: "No session" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const foods = Array.isArray(body?.foods)
    ? body.foods
        .map((f: unknown) => (f ?? "").toString().trim().slice(0, 40))
        .filter((f: string) => f.length > 0)
        .slice(0, 3)
    : [];

  const supabase = createServiceClient();
  await supabase.from("member").update({ fave_foods: foods }).eq("id", session.memberId);

  const res = NextResponse.json({ ok: true, foods });
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
