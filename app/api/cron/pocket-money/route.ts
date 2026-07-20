/**
 * GET /api/cron/pocket-money  — weekly base pocket money (spec §7.1).
 *
 * Vercel cron, Monday 00:00. Unconditional: every active child gets the
 * household base as a ledger entry with reason='base'. Age-scaled if you like —
 * scale by age only, never by behaviour. Monday is also the weekly-cap reset,
 * so this is the natural place to top up.
 */
export const runtime = "nodejs";
export const maxDuration = 60;

import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { ageAt } from "@/lib/presence";
import type { Member } from "@/lib/types";

function unauthorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return req.headers.get("authorization") !== `Bearer ${secret}`;
}

/** Base scaled gently by age (never by behaviour). ~10p per year over the base. */
function baseFor(basePence: number, member: Member, date: string): number {
  const age = ageAt(member.dob, date);
  if (age === null) return basePence;
  return basePence + Math.max(0, age) * 10;
}

export async function GET(req: Request) {
  if (unauthorized(req)) return new NextResponse("Unauthorized", { status: 401 });

  const supabase = createServiceClient();
  const today = new Date().toISOString().slice(0, 10);

  const { data: households } = await supabase
    .from("household")
    .select("id, base_pocket_money_pence");
  if (!households) return NextResponse.json({ ok: true, paid: 0 });

  let paid = 0;

  for (const household of households) {
    const { data: members } = await supabase
      .from("member")
      .select("*")
      .eq("household_id", household.id)
      .eq("active", true);

    const rows = (members ?? []).map((m) => ({
      household_id: household.id,
      member_id: m.id,
      delta_pence: baseFor(household.base_pocket_money_pence, m as Member, today),
      reason: "base" as const,
      note: "Weekly pocket money",
    }));

    if (rows.length) {
      const { error } = await supabase.from("ledger").insert(rows);
      if (!error) paid += rows.length;
    }
  }

  return NextResponse.json({ ok: true, paid });
}
