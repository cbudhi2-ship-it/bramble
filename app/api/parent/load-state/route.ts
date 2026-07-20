/**
 * POST /api/parent/load-state — the dial (spec §9).
 * Body: { loadState: 'normal' | 'stretched' | 'survival' }
 *
 * One control reshapes the whole system: it changes how tomorrow's 6am rota
 * deals and how the 18:05 fallback prices undone work. Nobody is told the dial
 * moved — the day just quietly looks different.
 */
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getParent } from "@/lib/parent-auth";

const VALID = ["normal", "stretched", "survival"];

export async function POST(req: Request) {
  const parent = await getParent();
  if (!parent) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!VALID.includes(body?.loadState)) {
    return NextResponse.json({ error: "Bad load state" }, { status: 400 });
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("household")
    .update({ load_state: body.loadState })
    .eq("id", parent.householdId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, loadState: body.loadState });
}
