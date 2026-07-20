/**
 * GET  /api/parent/children — list the household's children.
 * POST /api/parent/children — add a child (spec §3.2: children are rows).
 * Body: { display_name, age, mode, presence, colour_hex,
 *         pin_type: 'numeric' | 'picture',
 *         pin?  (4 digits, numeric) | sequence?  (3 animal keys, picture) }
 *
 * The PIN is hashed server-side; the raw PIN is never stored.
 */
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getParent } from "@/lib/parent-auth";
import { hashPin } from "@/lib/child-pin";
import { picturePinToSecret } from "@/lib/picture-pin";

export async function GET() {
  const parent = await getParent();
  if (!parent) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const supabase = await createClient();
  const { data } = await supabase
    .from("member")
    .select("id, display_name, colour_hex, mode, presence, pin_type")
    .eq("household_id", parent.householdId)
    .eq("active", true)
    .order("created_at");
  return NextResponse.json({ children: data ?? [] });
}

const MODES = ["low_demand", "standard", "young_visual"];
const PRESENCES = ["full_time", "eow_and_holidays"];

/** age → an approximate date of birth (Jan 1 of the birth year). */
function dobFromAge(age: number): string {
  const year = new Date().getUTCFullYear() - Math.max(0, Math.min(18, Math.round(age)));
  return `${year}-01-01`;
}

export async function POST(req: Request) {
  const parent = await getParent();
  if (!parent) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const display_name = (body?.display_name ?? "").toString().trim();
  if (!display_name) return NextResponse.json({ error: "Give the child a name" }, { status: 400 });

  const mode = MODES.includes(body?.mode) ? body.mode : "standard";
  const presence = PRESENCES.includes(body?.presence) ? body.presence : "full_time";
  const pin_type = body?.pin_type === "picture" ? "picture" : "numeric";

  // build + validate the secret
  let secret: string;
  if (pin_type === "picture") {
    const seq = Array.isArray(body?.sequence) ? body.sequence.map(String) : [];
    if (seq.length < 3) return NextResponse.json({ error: "Pick three animals" }, { status: 400 });
    secret = picturePinToSecret(seq);
  } else {
    const pin = (body?.pin ?? "").toString();
    if (!/^\d{4}$/.test(pin)) return NextResponse.json({ error: "PIN must be 4 digits" }, { status: 400 });
    secret = pin;
  }

  // caps: full-timers a weekly cap, the weekend crew a per-visit cap (spec §7.3)
  const weekly_cap_pence = presence === "full_time" ? 500 : null;
  const per_visit_cap_pence = presence === "eow_and_holidays" ? 500 : null;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("member")
    .insert({
      household_id: parent.householdId,
      display_name,
      dob: dobFromAge(Number(body?.age)),
      colour_hex: (body?.colour_hex ?? "#6B2456").toString().slice(0, 9),
      mode,
      presence,
      pin_type,
      pin_hash: await hashPin(secret),
      weekly_cap_pence,
      per_visit_cap_pence,
    })
    .select("id, display_name, colour_hex, mode, presence, pin_type")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, child: data });
}
