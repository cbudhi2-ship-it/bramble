/**
 * Parent Mode → Meals. The grown-ups' meal ideas, each child's favourite foods,
 * and a button to generate (and re-shuffle) a stuck 7-day plan for the week.
 */
import { redirect } from "next/navigation";
import { getParent } from "@/lib/parent-auth";
import { createClient } from "@/lib/supabase/server";
import { weekStart } from "@/lib/money";
import type { MealDay } from "@/lib/meals";
import type { Member } from "@/lib/types";
import MealsManager from "./MealsManager";

export const dynamic = "force-dynamic";

function label(monday: string): string {
  const start = new Date(monday + "T00:00:00Z");
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 6);
  const fmt = (d: Date) =>
    d.toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
  return `This week · ${fmt(start)} – ${fmt(end)}`;
}

export default async function MealsPage() {
  const parent = await getParent();
  if (!parent) redirect("/log-in");

  const supabase = await createClient();
  const monday = weekStart(new Date().toISOString().slice(0, 10));

  const [{ data: household }, { data: members }, { data: mealPlan }] = await Promise.all([
    supabase.from("household").select("meal_ideas").eq("id", parent.householdId).maybeSingle(),
    supabase
      .from("member")
      .select("*")
      .eq("household_id", parent.householdId)
      .eq("active", true)
      .order("created_at"),
    supabase
      .from("meal_plan")
      .select("plan")
      .eq("household_id", parent.householdId)
      .eq("week_start", monday)
      .maybeSingle(),
  ]);

  const mem = (members ?? []) as Member[];

  return (
    <MealsManager
      ideas={(household?.meal_ideas ?? []) as string[]}
      children={mem.map((m) => ({
        id: m.id,
        name: m.display_name,
        colour: m.colour_hex,
        foods: m.fave_foods ?? [],
      }))}
      plan={(mealPlan?.plan ?? null) as MealDay[] | null}
      weekLabel={label(monday)}
    />
  );
}
