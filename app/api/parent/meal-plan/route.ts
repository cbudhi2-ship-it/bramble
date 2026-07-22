/**
 * POST /api/parent/meal-plan — generate (or regenerate) this week's meal plan
 * from the children's favourite foods + the grown-ups' ideas, and save it.
 *
 * The plan is keyed by the Monday of the current week, so it's "stuck": saved
 * once and unchanged if a child later edits a favourite. Regenerating reshuffles
 * (a stored nonce bumps the seed) and overwrites the same week.
 */
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getParent } from "@/lib/parent-auth";
import { planMeals, type ChildFoods } from "@/lib/meals";
import { weekStart } from "@/lib/money";

export async function POST() {
  const parent = await getParent();
  if (!parent) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const supabase = await createClient();
  const monday = weekStart(new Date().toISOString().slice(0, 10));

  const [{ data: household }, { data: members }, { data: existing }] = await Promise.all([
    supabase.from("household").select("meal_ideas").eq("id", parent.householdId).maybeSingle(),
    supabase
      .from("member")
      .select("display_name, fave_foods")
      .eq("household_id", parent.householdId)
      .eq("active", true)
      .order("created_at"),
    supabase
      .from("meal_plan")
      .select("id")
      .eq("household_id", parent.householdId)
      .eq("week_start", monday)
      .maybeSingle(),
  ]);

  const ideas = (household?.meal_ideas ?? []) as string[];
  const children: ChildFoods[] = ((members ?? []) as { display_name: string; fave_foods: string[] }[]).map(
    (m) => ({ name: m.display_name, foods: m.fave_foods ?? [] })
  );

  if (ideas.length === 0 && children.every((c) => c.foods.length === 0)) {
    return NextResponse.json(
      { error: "Add some favourite foods or meal ideas first." },
      { status: 400 }
    );
  }

  // regenerating gives a fresh but reproducible shuffle
  const nonce = existing ? Date.now().toString(36) : "0";
  const plan = planMeals(children, ideas, `${parent.householdId}:${monday}:${nonce}`);

  const { error } = await supabase
    .from("meal_plan")
    .upsert(
      {
        household_id: parent.householdId,
        week_start: monday,
        plan,
        created_by: parent.userId,
      },
      { onConflict: "household_id,week_start" }
    );
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, week_start: monday, plan });
}
