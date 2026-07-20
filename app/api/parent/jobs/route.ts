/**
 * POST /api/parent/jobs — add a job to the library (spec §9 "Jobs").
 * Body: {
 *   title, kind: 'house_critical' | 'paid',
 *   price_pence,        // board reward for a paid job (0 for essential)
 *   fallback_pence,     // what it pays if it's still not done at 6pm
 *   framing_ambient?,   // how the low-demand child sees it ("The bin is full")
 *   age_min?, recurrence?
 * }
 *
 * The 6pm price is captured here, at creation — never decided at the deadline.
 *
 * GET /api/parent/jobs — list the household's active jobs.
 */
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getParent } from "@/lib/parent-auth";

export async function GET() {
  const parent = await getParent();
  if (!parent) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const supabase = await createClient();
  const { data } = await supabase
    .from("job_def")
    .select("*")
    .eq("household_id", parent.householdId)
    .eq("active", true)
    .order("created_at", { ascending: false });

  return NextResponse.json({ jobs: data ?? [] });
}

export async function POST(req: Request) {
  const parent = await getParent();
  if (!parent) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const title = (body?.title ?? "").toString().trim();
  const kind = body?.kind === "paid" ? "paid" : "house_critical";
  if (!title) return NextResponse.json({ error: "Give the job a name" }, { status: 400 });

  const price_pence = kind === "paid" ? Math.max(0, Math.round(Number(body?.price_pence) || 0)) : 0;
  const fallback_pence = Math.max(0, Math.round(Number(body?.fallback_pence) || 0));

  const FREQUENCIES = ["daily", "weekdays", "weekly", "monthly"];
  const recurrence = FREQUENCIES.includes(body?.recurrence) ? body.recurrence : "daily";
  const room = (body?.room ?? "").toString().trim() || null;
  const people_needed = Math.min(4, Math.max(1, Math.round(Number(body?.people_needed) || 1)));

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("job_def")
    .insert({
      household_id: parent.householdId,
      title,
      icon_key: (body?.icon_key ?? "•").toString().slice(0, 8),
      kind,
      price_pence,
      fallback_pence,
      age_min: Math.max(0, Math.round(Number(body?.age_min) || 0)),
      age_max: 99,
      // essential jobs get dealt on their schedule; paid jobs materialise on the
      // board for anyone to claim
      tier: kind === "house_critical" ? "core" : "full",
      pool: "any",
      recurrence,
      room,
      people_needed,
      low_demand_safe: Boolean(body?.low_demand_safe),
      framing_direct: title,
      framing_ambient: (body?.framing_ambient ?? "").toString().trim() || title,
      active: true,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, job: data });
}
