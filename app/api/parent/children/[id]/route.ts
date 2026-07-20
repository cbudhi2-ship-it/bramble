/**
 * DELETE /api/parent/children/[id] — remove a child (soft delete, so past
 * ledger/goal rows keep their reference).
 */
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getParent } from "@/lib/parent-auth";

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const parent = await getParent();
  if (!parent) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const { id } = await params;
  const supabase = await createClient();
  const { error } = await supabase
    .from("member")
    .update({ active: false })
    .eq("id", id)
    .eq("household_id", parent.householdId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
