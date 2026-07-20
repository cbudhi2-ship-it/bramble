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
  const { data } = await supabase
    .from("member")
    .select("id, display_name, colour_hex, mode, presence, pin_type")
    .eq("household_id", parent.householdId)
    .eq("active", true)
    .order("created_at");

  return <FamilyManager initialChildren={(data ?? []) as ChildLite[]} />;
}
