/**
 * DELETE /api/parent/presence/[id] — remove a presence override (the child
 * reverts to home-by-default for those dates).
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

  // ensure the override belongs to a child in this parent's household
  const { data: ov } = await supabase
    .from("presence_override")
    .select("id, member!inner(household_id)")
    .eq("id", id)
    .maybeSingle();
  const member = ov?.member as unknown as { household_id: string } | null;
  if (!ov || member?.household_id !== parent.householdId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { error } = await supabase.from("presence_override").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
