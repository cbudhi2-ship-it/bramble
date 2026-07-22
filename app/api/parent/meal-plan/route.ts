/**
 * POST /api/parent/meal-plan — generate (or regenerate) this week's meal plan.
 *
 * Asks Claude to *invent* a week of new recipes (lunch + dinner × 7) inspired by
 * the children's favourite foods and the grown-ups' ideas — deliberately NOT
 * serving any one child's exact dish, so no one waits their turn. The plan is
 * saved against the Monday of the current week, so it's "stuck": editing a
 * favourite later only affects the next week you generate. Regenerating asks
 * for a fresh week.
 *
 * Falls back to a simple offline planner (names only, no recipes) if the AI key
 * isn't configured or the call fails, so the button always does something.
 */
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import { getParent } from "@/lib/parent-auth";
import { planMealsFallback, DAY_NAMES, cleanList, type ChildFoods, type MealDay } from "@/lib/meals";
import { weekStart } from "@/lib/money";

const MEAL_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    days: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          day: { type: "string" },
          lunch: {
            type: "object",
            additionalProperties: false,
            properties: {
              name: { type: "string" },
              recipe: { type: "string" },
            },
            required: ["name", "recipe"],
          },
          dinner: {
            type: "object",
            additionalProperties: false,
            properties: {
              name: { type: "string" },
              recipe: { type: "string" },
            },
            required: ["name", "recipe"],
          },
        },
        required: ["day", "lunch", "dinner"],
      },
    },
  },
  required: ["days"],
} as const;

async function generateWithClaude(
  children: ChildFoods[],
  ideas: string[]
): Promise<MealDay[] | null> {
  if (!process.env.ANTHROPIC_API_KEY) return null;

  const client = new Anthropic();
  const likes = children
    .filter((c) => c.foods.length > 0)
    .map((c) => `- ${c.name} loves: ${c.foods.join(", ")}`)
    .join("\n");
  const ideasList = ideas.length ? ideas.map((i) => `- ${i}`).join("\n") : "(none given)";

  const prompt = `Plan a week of family meals — lunch and dinner for all 7 days (Monday to Sunday).

The children's favourite foods:
${likes || "(none given)"}

The grown-ups' meal ideas:
${ideasList}

Invent NEW recipes inspired by these favourites — do NOT simply serve one child's exact favourite as a whole meal, because then that child "wins" and the others wait. Instead, combine and reinvent so that across the week every child recognises things they love, woven into dishes the whole family eats together. Use the grown-ups' ideas as anchors where they fit.

Rules:
- Real, cookable home cooking for a busy family. Nothing fancy or expensive.
- Lunches are lighter/quicker; dinners are more substantial.
- Don't repeat the same main dish twice in the week.
- For each meal give a short appealing name and a 1–2 sentence method (the key ingredients and how it's made).
- Return exactly 7 days, Monday first.`;

  const res = await client.messages.create({
    model: "claude-opus-4-8",
    max_tokens: 8000,
    output_config: { format: { type: "json_schema", schema: MEAL_SCHEMA }, effort: "low" },
    messages: [{ role: "user", content: prompt }],
  });

  const text = res.content.find((b) => b.type === "text");
  if (!text || text.type !== "text") return null;
  const parsed = JSON.parse(text.text) as { days?: MealDay[] };
  const days = Array.isArray(parsed?.days) ? parsed.days : [];
  if (days.length === 0) return null;

  // normalise to exactly 7 days with our day names
  return DAY_NAMES.map((day, i) => {
    const d = days[i];
    return {
      day,
      lunch: { name: d?.lunch?.name?.trim() || "", recipe: d?.lunch?.recipe?.trim() || "" },
      dinner: { name: d?.dinner?.name?.trim() || "", recipe: d?.dinner?.recipe?.trim() || "" },
    };
  });
}

export async function POST() {
  const parent = await getParent();
  if (!parent) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const supabase = await createClient();
  const monday = weekStart(new Date().toISOString().slice(0, 10));

  const [{ data: household }, { data: members }] = await Promise.all([
    supabase.from("household").select("meal_ideas").eq("id", parent.householdId).maybeSingle(),
    supabase
      .from("member")
      .select("display_name, fave_foods")
      .eq("household_id", parent.householdId)
      .eq("active", true)
      .order("created_at"),
  ]);

  const ideas = cleanList((household?.meal_ideas ?? []) as string[]);
  const children: ChildFoods[] = (
    (members ?? []) as { display_name: string; fave_foods: string[] }[]
  ).map((m) => ({ name: m.display_name, foods: cleanList(m.fave_foods ?? []) }));

  if (ideas.length === 0 && children.every((c) => c.foods.length === 0)) {
    return NextResponse.json(
      { error: "Add some favourite foods or meal ideas first." },
      { status: 400 }
    );
  }

  let plan: MealDay[];
  let ai = false;
  try {
    const aiPlan = await generateWithClaude(children, ideas);
    if (aiPlan) {
      plan = aiPlan;
      ai = true;
    } else {
      plan = planMealsFallback(children, ideas, `${parent.householdId}:${monday}`);
    }
  } catch (err) {
    console.error("meal-plan AI generation failed", err);
    plan = planMealsFallback(children, ideas, `${parent.householdId}:${monday}:${Date.now()}`);
  }

  const { error } = await supabase.from("meal_plan").upsert(
    {
      household_id: parent.householdId,
      week_start: monday,
      plan,
      created_by: parent.userId,
    },
    { onConflict: "household_id,week_start" }
  );
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, week_start: monday, plan, ai });
}
