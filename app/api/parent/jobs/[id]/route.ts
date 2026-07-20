/**
 * PATCH  /api/parent/jobs/[id] — edit a job in the library.
 * DELETE /api/parent/jobs/[id] — retire a job (soft delete, so past instances
 * and ledger entries keep their reference).
 */
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getParent } from "@/lib/parent-auth";
import { normalizeRoom } from "@/lib/rooms";

const FREQUENCIES = ["daily", "weekdays", "weekly", "monthly"];

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const parent = await getParent();
  if (!parent) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const { id } = await params;
  const body = await req.json().catch(() => null);
  const title = (body?.title ?? "").toString().trim();
  if (!title) return NextResponse.json({ error: "Give the job a name" }, { status: 400 });

  const kind = body?.kind === "paid" ? "paid" : "house_critical";
  const price_pence = kind === "paid" ? Math.max(0, Math.round(Number(body?.price_pence) || 0)) : 0;

  const update = {
    title,
    kind,
    price_pence,
    fallback_pence: Math.max(0, Math.round(Number(body?.fallback_pence) || 0)),
    age_min: Math.max(0, Math.round(Number(body?.age_min) || 0)),
    tier: kind === "house_critical" ? "core" : "full",
    recurrence: FREQUENCIES.includes(body?.recurrence) ? body.recurrence : "daily",
    room: normalizeRoom(body?.room),
    people_needed: Math.min(4, Math.max(1, Math.round(Number(body?.people_needed) || 1))),
    framing_direct: title,
    framing_ambient: (body?.framing_ambient ?? "").toString().trim() || title,
  };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("job_def")
    .update(update)
    .eq("id", id)
    .eq("household_id", parent.householdId)
    .select("id, title, kind, price_pence, fallback_pence, framing_ambient, recurrence, room, people_needed, age_min")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, job: data });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const parent = await getParent();
  if (!parent) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const { id } = await params;
  const supabase = await createClient();
  const { error } = await supabase
    .from("job_def")
    .update({ active: false })
    .eq("id", id)
    .eq("household_id", parent.householdId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
