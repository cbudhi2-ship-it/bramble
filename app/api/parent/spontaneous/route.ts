/**
 * POST /api/parent/spontaneous — spontaneous recognition (spec §7.2).
 * Body: { memberId, pence, note }
 *
 * One button: pick a child, pick an amount, one line. Money lands in their
 * balance with reason='spontaneous'. This is how a child earns through their
 * actual strengths with no demand ever issued — and it MUST be universal, the
 * same for every child, visibly available to all. Never top up off-ledger.
 */
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getParent } from "@/lib/parent-auth";

export async function POST(req: Request) {
  const parent = await getParent();
  if (!parent) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const pence = Math.round(Number(body?.pence));
  if (!body?.memberId || !Number.isFinite(pence) || pence <= 0) {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }

  const supabase = await createClient();

  // confirm the child is in this parent's household (RLS also enforces it)
  const { data: member } = await supabase
    .from("member")
    .select("id")
    .eq("id", body.memberId)
    .eq("household_id", parent.householdId)
    .maybeSingle();
  if (!member) return NextResponse.json({ error: "Unknown child" }, { status: 404 });

  const { error } = await supabase.from("ledger").insert({
    household_id: parent.householdId,
    member_id: body.memberId,
    delta_pence: pence,
    reason: "spontaneous",
    note: (body.note as string) ?? null,
    created_by: parent.userId,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
