/**
 * Parent Mode → Who's here. A calendar for two-home / custody schedules: mark
 * which children are here or away over date ranges, and see who the day's jobs
 * will deal to for the next two weeks.
 */
import { redirect } from "next/navigation";
import { getParent } from "@/lib/parent-auth";
import { createClient } from "@/lib/supabase/server";
import { resolvePresentMembers } from "@/lib/presence";
import type { Member, PresenceOverride } from "@/lib/types";
import PresenceManager from "./PresenceManager";

export const dynamic = "force-dynamic";

function addDays(iso: string, n: number): string {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export default async function PresencePage() {
  const parent = await getParent();
  if (!parent) redirect("/log-in");

  const supabase = await createClient();
  const [{ data: members }, { data: overrides }] = await Promise.all([
    supabase
      .from("member")
      .select("*")
      .eq("household_id", parent.householdId)
      .eq("active", true)
      .order("created_at"),
    supabase
      .from("presence_override")
      .select("id, member_id, date_from, date_to, present, member!inner(household_id)")
      .eq("member.household_id", parent.householdId)
      .order("date_from", { ascending: true }),
  ]);

  const mem = (members ?? []) as Member[];
  const ovs = (overrides ?? []) as unknown as PresenceOverride[];

  // next 14 days: who's present each day
  const today = new Date().toISOString().slice(0, 10);
  const preview = Array.from({ length: 14 }).map((_, i) => {
    const date = addDays(today, i);
    const present = resolvePresentMembers(mem, date, ovs).map((m) => m.id);
    return { date, presentIds: present };
  });

  return (
    <PresenceManager
      members={mem.map((m) => ({ id: m.id, name: m.display_name, colour: m.colour_hex }))}
      overrides={ovs.map((o) => ({
        id: o.id,
        member_id: o.member_id,
        date_from: o.date_from,
        date_to: o.date_to,
        present: o.present,
      }))}
      preview={preview}
      today={today}
    />
  );
}
