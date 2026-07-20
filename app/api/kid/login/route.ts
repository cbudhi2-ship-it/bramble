/**
 * POST /api/kid/login  — a child "logs in" by tapping their face + PIN.
 *
 * Body: { memberId, pin }         for numeric children (Mabel, Nell, Posy)
 *       { memberId, sequence[] }  for picture-PIN children (Rowan, Bo)
 *
 * On success an HMAC child-session cookie is set (spec §3.2). The anon client
 * is never used here — everything runs on the service-role client server-side.
 */
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { verifyPin } from "@/lib/child-pin";
import { picturePinToSecret } from "@/lib/picture-pin";
import { buildSessionCookie, createChildToken } from "@/lib/child-session";
import type { Member } from "@/lib/types";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body?.memberId) return NextResponse.json({ error: "memberId required" }, { status: 400 });

  const supabase = createServiceClient();
  const { data: member } = await supabase
    .from("member")
    .select("*")
    .eq("id", body.memberId)
    .eq("active", true)
    .maybeSingle();

  if (!member || !member.pin_hash) {
    return NextResponse.json({ error: "Unknown child" }, { status: 404 });
  }
  const m = member as Member;

  const secret =
    m.pin_type === "picture"
      ? picturePinToSecret(Array.isArray(body.sequence) ? body.sequence : [])
      : String(body.pin ?? "");

  const ok = await verifyPin(secret, m.pin_hash!);
  if (!ok) return NextResponse.json({ error: "Wrong PIN" }, { status: 401 });

  const token = await createChildToken({
    memberId: m.id,
    householdId: m.household_id,
    displayName: m.display_name,
    colourHex: m.colour_hex,
    mode: m.mode,
  });

  const res = NextResponse.json({
    ok: true,
    member: { id: m.id, name: m.display_name, mode: m.mode, colour: m.colour_hex },
  });
  res.headers.set("Set-Cookie", buildSessionCookie(token));
  return res;
}
