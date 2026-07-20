/**
 * PATCH  /api/parent/tasks/[id] — mark a to-do done (Body: { done }).
 * DELETE /api/parent/tasks/[id] — remove it.
 */
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getParent } from "@/lib/parent-auth";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const parent = await getParent();
  if (!parent) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const done = Boolean(body?.done);

  const supabase = await createClient();
  const { error } = await supabase
    .from("parent_task")
    .update({ done, done_at: done ? new Date().toISOString() : null })
    .eq("id", id)
    .eq("household_id", parent.householdId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const parent = await getParent();
  if (!parent) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const { id } = await params;
  const supabase = await createClient();
  const { error } = await supabase
    .from("parent_task")
    .delete()
    .eq("id", id)
    .eq("household_id", parent.householdId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
