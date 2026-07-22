/**
 * Weekly meal planner (spec: family food option).
 *
 * The family gives two things:
 *   - each child's favourite foods (up to 3 each), and
 *   - the grown-ups' meal ideas (up to 6).
 * From that collective pot this builds lunch + dinner for 7 days.
 *
 * It's deterministic — seeded by the week plus a nonce — so a generated week is
 * stable ("stuck") once saved, and pressing the button again gives a fresh,
 * reproducible shuffle rather than a random one. No external service, no cost.
 *
 * The mental model: the grown-ups' ideas anchor the dinners (proper meals), and
 * the children's favourites drive the lunches — but each pool backs the other
 * up, so it always produces a full week from whatever it's given. Lunches are
 * built by interleaving the children round-robin, so everyone's favourites turn
 * up across the week rather than one child's taking over.
 */
import { seededShuffle } from "./rota.ts";

export interface ChildFoods {
  name: string;
  foods: string[];
}

export interface MealDay {
  day: string;
  lunch: string;
  dinner: string;
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
function clean(items: string[]): string[] {
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
  const lists = children
    .map((c) => clean(c.foods))
    .filter((l) => l.length > 0);
  if (lists.length === 0) return [];
  // shuffle which child goes first each round, but keep it reproducible
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
  return clean(out); // a food two children both love only needs to appear once
}

/** Fill `n` slots by walking a pre-ordered sequence (primary picks first, then
 * a backup pool), avoiding an immediate repeat and (optionally) clashing with a
 * same-day companion slot. Cycles the sequence only once the whole run is used. */
function fillFromOrder(
  n: number,
  order: string[],
  avoidSameDay?: string[]
): string[] {
  if (order.length === 0) return Array.from({ length: n }, () => "");
  const out: string[] = [];
  let idx = 0;
  for (let day = 0; day < n; day++) {
    let pick = order[idx % order.length];
    let tries = 0;
    // skip if it repeats yesterday's pick or clashes with the same day's other meal
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
 * Build a 7-day plan. `seed` should encode the week (so it's stable) plus any
 * regenerate nonce (so "shuffle again" differs). Returns 7 { day, lunch, dinner }.
 */
export function planMeals(
  children: ChildFoods[],
  parentIdeas: string[],
  seed: string
): MealDay[] {
  const ideas = clean(parentIdeas);
  const childPool = interleaveChildFoods(children, seed);

  // Dinners exhaust the grown-ups' proper meals first (shuffled, so distinct),
  // and only spill into child favourites for any slots left over. Lunches lead
  // with the children's favourites (already fairly interleaved), backed by the
  // ideas. Each pool backs the other so a week always fills.
  const dinnerOrder = [
    ...seededShuffle(ideas, `${seed}:dinner`),
    ...seededShuffle(childPool, `${seed}:dinner-fill`),
  ];
  const lunchOrder = [...childPool, ...seededShuffle(ideas, `${seed}:lunch-fill`)];

  const dinners = fillFromOrder(7, dinnerOrder);
  const lunches = fillFromOrder(7, lunchOrder, dinners);

  return DAY_NAMES.map((day, i) => ({
    day,
    lunch: lunches[i] ?? "",
    dinner: dinners[i] ?? "",
  }));
}
