/**
 * POST /api/parent/goals — set (or clear) what a child is saving towards.
 * Body: { memberId, title, target_pence }
 *   A non-empty title replaces the child's current goal (there's one active goal
 *   at a time). An empty title clears it. The goal shows in the child's Kid Mode
 *   space (spec §8: the goal bar is the primary artefact).
 */
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getParent } from "@/lib/parent-auth";

export async function POST(req: Request) {
  const parent = await getParent();
  if (!parent) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const memberId = body?.memberId;
  if (!memberId) return NextResponse.json({ error: "memberId required" }, { status: 400 });

  const supabase = await createClient();

  // confirm the child is in this parent's household (RLS also enforces it)
  const { data: member } = await supabase
    .from("member")
    .select("id")
    .eq("id", memberId)
    .eq("household_id", parent.householdId)
    .maybeSingle();
  if (!member) return NextResponse.json({ error: "Unknown child" }, { status: 404 });

  // one active goal at a time — retire any existing ones first
  await supabase.from("goal").update({ active: false }).eq("member_id", memberId).eq("active", true);

  const title = (body?.title ?? "").toString().trim();
  if (!title) return NextResponse.json({ ok: true, goal: null }); // cleared

  const target_pence = Math.max(0, Math.round(Number(body?.target_pence) || 0));
  const { data, error } = await supabase
    .from("goal")
    .insert({ member_id: memberId, title, target_pence, active: true })
    .select("id, title, target_pence")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, goal: data });
}
