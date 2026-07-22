/**
 * POST /api/parent/meal-ideas — the grown-ups' meal ideas (up to 6) that anchor
 * the dinners in the weekly plan.
 * Body: { ideas: string[] }
 */
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getParent } from "@/lib/parent-auth";

export async function POST(req: Request) {
  const parent = await getParent();
  if (!parent) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const ideas = Array.isArray(body?.ideas)
    ? body.ideas
        .map((f: unknown) => (f ?? "").toString().trim().slice(0, 60))
        .filter((f: string) => f.length > 0)
        .slice(0, 6)
    : [];

  const supabase = await createClient();
  const { error } = await supabase
    .from("household")
    .update({ meal_ideas: ideas })
    .eq("id", parent.householdId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, ideas });
}
