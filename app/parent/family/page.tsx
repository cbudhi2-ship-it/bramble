/**
 * Parent Mode → Family. Add and manage the children in the app — no seed script
 * or SQL needed.
 */
import { redirect } from "next/navigation";
import { getParent } from "@/lib/parent-auth";
import { createClient } from "@/lib/supabase/server";
import FamilyManager, { type ChildLite } from "./FamilyManager";

export const dynamic = "force-dynamic";

export default async function FamilyPage() {
  const parent = await getParent();
  if (!parent) redirect("/log-in");

  const supabase = await createClient();
  const [{ data: members }, { data: goals }] = await Promise.all([
    supabase
      .from("member")
      .select("id, display_name, colour_hex, mode, presence, pin_type")
      .eq("household_id", parent.householdId)
      .eq("active", true)
      .order("created_at"),
    supabase
      .from("goal")
      .select("member_id, title, target_pence")
      .eq("active", true),
  ]);

  // one active goal per child → look up by member_id
  const goalByMember: Record<string, { title: string; target_pence: number }> = {};
  for (const g of goals ?? []) goalByMember[g.member_id] = { title: g.title, target_pence: g.target_pence };

  return (
    <FamilyManager initialChildren={(members ?? []) as ChildLite[]} initialGoals={goalByMember} />
  );
}
