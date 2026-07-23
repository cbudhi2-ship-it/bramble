/**
 * POST /api/parent/front-seats — set how many seats are up for grabs in the
 * front of the car (1 or 2). The daily pick itself is computed automatically;
 * this just says how many riders to choose.
 * Body: { seats: 1 | 2 }
 */
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getParent } from "@/lib/parent-auth";

export async function POST(req: Request) {
  const parent = await getParent();
  if (!parent) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const seats = Math.min(2, Math.max(1, Math.round(Number(body?.seats) || 1)));

  const { error } = await supabaseUpdate(parent.householdId, seats);
  if (error) return NextResponse.json({ error }, { status: 500 });

  return NextResponse.json({ ok: true, seats });
}

async function supabaseUpdate(householdId: string, seats: number): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("household")
    .update({ front_seats: seats })
    .eq("id", householdId);
  return { error: error?.message ?? null };
}
