/**
 * Weekly meal planner types + a deterministic fallback.
 *
 * The real planner (app/api/parent/meal-plan) asks Claude to *invent* a week of
 * new recipes that blend everyone's favourite foods — so no child's exact dish
 * is "picked" over another's. This module holds the shared types and a simple
 * offline fallback used only when the AI isn't configured or a call fails, so
 * the feature degrades to something rather than nothing.
 */
import { seededShuffle } from "./rota.ts";

export interface ChildFoods {
  name: string;
  foods: string[];
}

export interface Meal {
  name: string;
  recipe: string;
}

export interface MealDay {
  day: string;
  lunch: Meal;
  dinner: Meal;
}

export const DAY_NAMES = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

/** Trim, drop blanks, and de-dupe case-insensitively (keeping first spelling). */
export function cleanList(items: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of items) {
    const v = (raw ?? "").trim();
    if (!v) continue;
    const key = v.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(v);
  }
  return out;
}

/** Interleave the children's favourites round-robin: everyone's first choice,
 * then everyone's second, and so on — so no single child dominates the week. */
function interleaveChildFoods(children: ChildFoods[], seed: string): string[] {
  const lists = children.map((c) => cleanList(c.foods)).filter((l) => l.length > 0);
  if (lists.length === 0) return [];
  const order = seededShuffle(
    lists.map((_, i) => i),
    `${seed}:kids`
  );
  const maxLen = Math.max(...lists.map((l) => l.length));
  const out: string[] = [];
  for (let round = 0; round < maxLen; round++) {
    for (const i of order) {
      if (round < lists[i].length) out.push(lists[i][round]);
    }
  }
  return cleanList(out);
}

/** Fill `n` slots by walking a pre-ordered sequence, avoiding an immediate
 * repeat and (optionally) clashing with a same-day companion slot. */
function fillFromOrder(n: number, order: string[], avoidSameDay?: string[]): string[] {
  if (order.length === 0) return Array.from({ length: n }, () => "");
  const out: string[] = [];
  let idx = 0;
  for (let day = 0; day < n; day++) {
    let pick = order[idx % order.length];
    let tries = 0;
    while (
      order.length > 1 &&
      tries < order.length &&
      (pick === out[day - 1] || (avoidSameDay && pick === avoidSameDay[day]))
    ) {
      idx++;
      pick = order[idx % order.length];
      tries++;
    }
    out.push(pick);
    idx++;
  }
  return out;
}

/**
 * Offline fallback: slot the family's actual foods into 7 days (no invented
 * recipes — just the names). Used only when the AI planner is unavailable.
 */
export function planMealsFallback(
  children: ChildFoods[],
  parentIdeas: string[],
  seed: string
): MealDay[] {
  const ideas = cleanList(parentIdeas);
  const childPool = interleaveChildFoods(children, seed);

  const dinnerOrder = [
    ...seededShuffle(ideas, `${seed}:dinner`),
    ...seededShuffle(childPool, `${seed}:dinner-fill`),
  ];
  const lunchOrder = [...childPool, ...seededShuffle(ideas, `${seed}:lunch-fill`)];

  const dinners = fillFromOrder(7, dinnerOrder);
  const lunches = fillFromOrder(7, lunchOrder, dinners);

  return DAY_NAMES.map((day, i) => ({
    day,
    lunch: { name: lunches[i] ?? "", recipe: "" },
    dinner: { name: dinners[i] ?? "", recipe: "" },
  }));
}
