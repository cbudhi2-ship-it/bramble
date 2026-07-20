/**
 * GET /api/kid/members — the faces on the profile picker (spec §3.2).
 *
 * Scoped by the handover cookie the parent set on this device, so it exposes
 * only first names + avatar colour for one household — no balances, no PII.
 * Runs on the service-role client because Kid Mode has no auth context.
 */
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { getHandoverHousehold } from "@/lib/handover";

export async function GET(req: Request) {
  const householdId = await getHandoverHousehold(req);
  if (!householdId) return NextResponse.json({ error: "Hand over first" }, { status: 401 });

  const supabase = createServiceClient();
  const { data } = await supabase
    .from("member")
    .select("id, display_name, colour_hex, avatar_key, pin_type, mode")
    .eq("household_id", householdId)
    .eq("active", true)
    .order("created_at");

  return NextResponse.json({ members: data ?? [] });
}
