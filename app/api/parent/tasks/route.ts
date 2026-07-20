/**
 * GET  /api/parent/tasks — the parent's own open to-do items.
 * POST /api/parent/tasks — add one. Body: { title }
 *
 * The grown-ups' personal list, separate from the children's job library.
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
    .from("parent_task")
    .select("id, title, done")
    .eq("household_id", parent.householdId)
    .eq("done", false)
    .order("created_at", { ascending: false });
  return NextResponse.json({ tasks: data ?? [] });
}

export async function POST(req: Request) {
  const parent = await getParent();
  if (!parent) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const title = (body?.title ?? "").toString().trim();
  if (!title) return NextResponse.json({ error: "Give the task a name" }, { status: 400 });

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("parent_task")
    .insert({ household_id: parent.householdId, title, created_by: parent.userId })
    .select("id, title, done")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, task: data });
}
