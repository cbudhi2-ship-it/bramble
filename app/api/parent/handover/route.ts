/**
 * POST /api/parent/handover — parent taps "Hand the phone over" (spec §3.3).
 * Sets the signed household cookie so the Kid Mode picker knows whose children
 * to list, then the client navigates to /kid.
 */
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getParent } from "@/lib/parent-auth";
import { buildHandoverCookie, createHandoverToken } from "@/lib/handover";

export async function POST() {
  const parent = await getParent();
  if (!parent) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const token = await createHandoverToken(parent.householdId);
  const res = NextResponse.json({ ok: true });
  res.headers.set("Set-Cookie", buildHandoverCookie(token));
  return res;
}
