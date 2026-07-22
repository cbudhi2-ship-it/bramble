/**
 * GET  /api/parent/presence — the household's presence overrides (who's here /
 *      away on which dates), upcoming first.
 * POST /api/parent/presence — set a range.
 *   Body: { memberIds: string[], date_from, date_to, present: boolean, note? }
 *
 * Everyone is home by default (spec §5). An override marks a child away (at their
 * other home, etc.) or explicitly here for a range — the rota engine reads these
 * when it deals the day's jobs.
 */
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getParent } from "@/lib/parent-auth";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export async function GET() {
  const parent = await getParent();
  if (!parent) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const supabase = await createClient();
  const { data } = await supabase
    .from("presence_override")
    .select("id, member_id, date_from, date_to, present, member!inner(household_id)")
    .eq("member.household_id", parent.householdId)
    .order("date_from", { ascending: true });

  return NextResponse.json({ overrides: data ?? [] });
}

export async function POST(req: Request) {
  const parent = await getParent();
  if (!parent) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const memberIds: string[] = Array.isArray(body?.memberIds) ? body.memberIds : [];
  const date_from = (body?.date_from ?? "").toString();
  const date_to = (body?.date_to ?? "").toString();
  const present = Boolean(body?.present);

  if (!memberIds.length) return NextResponse.json({ error: "Pick at least one child" }, { status: 400 });
  if (!DATE_RE.test(date_from) || !DATE_RE.test(date_to)) {
    return NextResponse.json({ error: "Pick a start and end date" }, { status: 400 });
  }
  const [from, to] = date_from <= date_to ? [date_from, date_to] : [date_to, date_from];

  const supabase = await createClient();

  // only children in this household
  const { data: valid } = await supabase
    .from("member")
    .select("id")
    .eq("household_id", parent.householdId)
    .in("id", memberIds);
  const ids = (valid ?? []).map((m) => m.id);
  if (!ids.length) return NextResponse.json({ error: "Unknown child" }, { status: 404 });

  const rows = ids.map((member_id) => ({
    member_id,
    date_from: from,
    date_to: to,
    present,
    note: (body?.note ?? "").toString().slice(0, 200) || null,
  }));

  const { data, error } = await supabase.from("presence_override").insert(rows).select("id, member_id, date_from, date_to, present");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, overrides: data });
}
