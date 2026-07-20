/**
 * POST /api/parent/deal-today — deal today's jobs on demand (the same thing the
 * 6am cron does, but for this parent's household, triggered from the app so
 * there's no need to wait for 6am or run a curl). Idempotent: clears today's
 * non-bonus instances first.
 */
export const runtime = "nodejs";
export const maxDuration = 60;

import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { getParent } from "@/lib/parent-auth";
import { resolvePresentMembers } from "@/lib/presence";
import { planRota } from "@/lib/rota";
import type { JobDef, Member, PresenceOverride } from "@/lib/types";

function deadlineFor(date: string): string {
  return new Date(`${date}T18:00:00Z`).toISOString();
}
function yesterdayOf(date: string): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

export async function POST() {
  const parent = await getParent();
  if (!parent) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const supabase = createServiceClient();
  const today = new Date().toISOString().slice(0, 10);
  const yesterday = yesterdayOf(today);
  const hid = parent.householdId;

  const [{ data: household }, { data: members }, { data: jobDefs }, { data: overrides }, { data: yest }] =
    await Promise.all([
      supabase.from("household").select("load_state").eq("id", hid).maybeSingle(),
      supabase.from("member").select("*").eq("household_id", hid).eq("active", true),
      supabase.from("job_def").select("*").eq("household_id", hid).eq("active", true),
      supabase.from("presence_override").select("*, member!inner(household_id)").eq("member.household_id", hid),
      supabase.from("job_instance").select("assigned_to, job_def_id").eq("household_id", hid).eq("date", yesterday).eq("is_bonus", false),
    ]);

  const present = resolvePresentMembers((members ?? []) as Member[], today, (overrides ?? []) as PresenceOverride[]);
  const yesterdayByMember: Record<string, string[]> = {};
  for (const row of yest ?? []) {
    if (row.assigned_to) (yesterdayByMember[row.assigned_to] ??= []).push(row.job_def_id);
  }

  const plan = planRota({
    householdId: hid,
    date: today,
    loadState: (household?.load_state ?? "normal") as "normal" | "stretched" | "survival",
    presentMembers: present,
    jobDefs: (jobDefs ?? []) as JobDef[],
    yesterdayByMember,
  });

  await supabase.from("job_instance").delete().eq("household_id", hid).eq("date", today).eq("is_bonus", false);

  const rows = [
    ...plan.dealt.map((d) => ({
      household_id: hid, job_def_id: d.job_def_id, date: today,
      assigned_to: d.assigned_to, dealt_to: d.assigned_to,
      status: "open" as const, is_bonus: false, deadline_at: deadlineFor(today),
    })),
    ...plan.board.map((b) => ({
      household_id: hid, job_def_id: b.job_def_id, date: today,
      assigned_to: null, status: "open" as const, is_bonus: false, deadline_at: deadlineFor(today),
    })),
  ];
  if (rows.length) await supabase.from("job_instance").insert(rows);

  return NextResponse.json({ ok: true, dealt: plan.dealt.length, board: plan.board.length });
}
