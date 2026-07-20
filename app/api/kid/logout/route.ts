/**
 * POST /api/kid/logout — drop the child session back to the profile picker.
 * Also fired by the client on inactivity timeout / backgrounding (Away Lock).
 */
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { clearSessionCookie } from "@/lib/child-session";

export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.headers.set("Set-Cookie", clearSessionCookie());
  return res;
}
