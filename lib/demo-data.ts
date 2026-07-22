/**
 * Fictional demo family (Mabel, Rowan, Nell, Posy, Bo + the grown-ups) used by
 * the /demo routes so a signed-out visitor can click through the real screens
 * without a Supabase session. No real children's data ever appears here.
 *
 * The shapes deliberately match the props of app/kid/home/KidHome.tsx and
 * app/parent/ParentToday.tsx so the demo reuses the actual components.
 */

const PURPLE = "#7B4FA8";
const ORANGE = "#E07A2F";
const TEAL = "#2E8B8B";
const PINK = "#D4568A";
const GREEN = "#4A9E4A";
const BERRY = "#6B2456";

export interface DemoPerson {
  slug: string;
  name: string;
  colour: string;
  tag: string;
  kind: "kid" | "parent";
}

export const DEMO_PEOPLE: DemoPerson[] = [
  { slug: "mabel", name: "Mabel", colour: PURPLE, tag: "10 · low-demand", kind: "kid" },
  { slug: "rowan", name: "Rowan", colour: ORANGE, tag: "5 · young / visual", kind: "kid" },
  { slug: "nell", name: "Nell", colour: TEAL, tag: "10 · standard", kind: "kid" },
  { slug: "posy", name: "Posy", colour: PINK, tag: "8 · standard", kind: "kid" },
  { slug: "bo", name: "Bo", colour: GREEN, tag: "5 · young / visual", kind: "kid" },
  { slug: "parent", name: "Parent · Today", colour: BERRY, tag: "The grown-ups", kind: "parent" },
  { slug: "jobs", name: "Parent · Jobs", colour: BERRY, tag: "Add a job", kind: "parent" },
  { slug: "insights", name: "Parent · Insights", colour: BERRY, tag: "Over time", kind: "parent" },
  { slug: "meals", name: "Parent · Meals", colour: BERRY, tag: "Week's food plan", kind: "parent" },
];

/** Sample job library for the /demo jobs screen. */
export function getDemoJobs() {
  return [
    { id: "j1", title: "Empty the dishwasher", kind: "house_critical" as const, price_pence: 0, fallback_pence: 100, framing_ambient: "The dishwasher is full", recurrence: "daily", room: "Kitchen", people_needed: 1, age_min: 5 },
    { id: "j2", title: "Wipe the sides", kind: "house_critical" as const, price_pence: 0, fallback_pence: 75, framing_ambient: "The sides need a wipe", recurrence: "daily", room: "Kitchen", people_needed: 1, age_min: 5 },
    { id: "j5", title: "Clean the bathroom", kind: "house_critical" as const, price_pence: 0, fallback_pence: 200, framing_ambient: "The bathroom needs doing", recurrence: "weekly", room: "Bathroom", people_needed: 2, age_min: 5 },
    { id: "j3", title: "Hoover the car", kind: "paid" as const, price_pence: 200, fallback_pence: 200, framing_ambient: "The car's full of crumbs", recurrence: "weekly", room: "Outside", people_needed: 1, age_min: 5 },
    { id: "j4", title: "Water the plants", kind: "paid" as const, price_pence: 50, fallback_pence: 50, framing_ambient: "The plants look thirsty", recurrence: "monthly", room: null, people_needed: 1, age_min: 5 },
  ];
}

interface KidJob {
  id: string;
  status: string;
  is_bonus: boolean;
  award_pence: number | null;
  price_pence: number;
  kind: string;
  icon: string;
  title: string;
  framing_direct: string;
  framing_ambient: string;
}

function job(p: Partial<KidJob> & { id: string; title: string; icon: string }): KidJob {
  return {
    status: "open",
    is_bonus: false,
    award_pence: null,
    price_pence: 0,
    kind: "paid",
    framing_direct: p.title,
    framing_ambient: p.title,
    ...p,
  };
}

export interface DemoKidHome {
  name: string;
  colour: string;
  mode: "low_demand" | "standard" | "young_visual";
  balancePence: number;
  goal: { title: string; target_pence: number } | null;
  foods: string[];
  dealt: KidJob[];
  board: KidJob[];
}

const KIDS: Record<string, DemoKidHome> = {
  mabel: {
    name: "Mabel",
    colour: PURPLE,
    mode: "low_demand",
    balancePence: 1600,
    goal: { title: "Sylvanian caravan", target_pence: 2500 },
    foods: ["Pasta pesto", "Halloumi", "Pancakes"],
    dealt: [
      job({ id: "m1", title: "Empty the dishwasher", icon: "🍽️", kind: "house_critical", framing_ambient: "The dishwasher is full" }),
      job({ id: "m2", title: "Feed the cat", icon: "🐈", kind: "house_critical", framing_ambient: "Nutmeg's bowl is empty" }),
    ],
    board: [
      job({ id: "m3", title: "Match the socks", icon: "🧦", price_pence: 60 }),
      job({ id: "m4", title: "Water the plants", icon: "🪴", price_pence: 50 }),
    ],
  },
  rowan: {
    name: "Rowan",
    colour: ORANGE,
    mode: "young_visual",
    balancePence: 140,
    goal: null,
    foods: ["Fish fingers", "Peas", "Yoghurt"],
    dealt: [
      job({ id: "r1", title: "Feed Nutmeg", icon: "🐈", kind: "house_critical" }),
      job({ id: "r2", title: "Shoes away", icon: "👟", kind: "house_critical" }),
    ],
    board: [job({ id: "r3", title: "Socks", icon: "🧦", price_pence: 60 })],
  },
  nell: {
    name: "Nell",
    colour: TEAL,
    mode: "standard",
    balancePence: 1640,
    goal: { title: "Roller skates", target_pence: 4000 },
    foods: ["Chicken curry", "Rice", "Mango"],
    dealt: [job({ id: "n1", title: "Bins out", icon: "🗑️", kind: "house_critical" })],
    board: [
      job({ id: "n2", title: "Dishwasher", icon: "⚡", price_pence: 100, is_bonus: true, award_pence: 100 }),
      job({ id: "n3", title: "Hoover the car", icon: "🚗", price_pence: 200 }),
    ],
  },
  posy: {
    name: "Posy",
    colour: PINK,
    mode: "standard",
    balancePence: 1330,
    goal: { title: "Squishmallow", target_pence: 1700 },
    foods: ["Pizza", "Sweetcorn", "Strawberries"],
    dealt: [job({ id: "p1", title: "Washing in", icon: "🧺", kind: "house_critical" })],
    board: [
      job({ id: "p2", title: "Sweep the patio", icon: "🍂", price_pence: 150 }),
      job({ id: "p3", title: "Windowsills", icon: "🪟", price_pence: 100 }),
    ],
  },
  bo: {
    name: "Bo",
    colour: GREEN,
    mode: "young_visual",
    balancePence: 80,
    goal: null,
    foods: ["Sausages", "Mash", "Beans"],
    dealt: [
      job({ id: "b1", title: "Toys in the box", icon: "🧸", kind: "house_critical" }),
      job({ id: "b2", title: "Spoons away", icon: "🥄", kind: "house_critical" }),
    ],
    board: [job({ id: "b3", title: "Plants", icon: "🪴", price_pence: 50 })],
  },
};

export function getDemoKid(slug: string): DemoKidHome | null {
  return KIDS[slug] ?? null;
}

// ---- parent ---------------------------------------------------------------
interface ParentJob {
  id: string;
  status: string;
  title: string;
  icon: string;
  kind: string;
  price_pence: number;
  fallback_pence: number;
  is_bonus: boolean;
  parent_note: string | null;
  whoName: string | null;
  whoColour: string;
}

export function getDemoParent() {
  return {
    loadState: "normal" as const,
    members: [
      { id: "mabel", name: "Mabel", colour: PURPLE },
      { id: "rowan", name: "Rowan", colour: ORANGE },
      { id: "nell", name: "Nell", colour: TEAL },
      { id: "posy", name: "Posy", colour: PINK },
      { id: "bo", name: "Bo", colour: GREEN },
    ],
    jobs: [
      // waiting for review
      { id: "v1", status: "submitted", title: "Washing in", icon: "🧺", kind: "house_critical", price_pence: 100, fallback_pence: 75, is_bonus: false, parent_note: null, whoName: "Posy", whoColour: PINK },
      { id: "v2", status: "submitted", title: "Match the socks", icon: "🧦", kind: "paid", price_pence: 60, fallback_pence: 60, is_bonus: false, parent_note: "Bottom half of the basket only", whoName: "Rowan", whoColour: ORANGE },
      // still to do — someone's job (so you don't do it yourself)
      { id: "s1", status: "open", title: "Empty the dishwasher", icon: "🍽️", kind: "house_critical", price_pence: 0, fallback_pence: 100, is_bonus: false, parent_note: null, whoName: "Mabel", whoColour: PURPLE },
      { id: "s2", status: "open", title: "Bins out", icon: "🗑️", kind: "house_critical", price_pence: 0, fallback_pence: 75, is_bonus: false, parent_note: null, whoName: "Nell", whoColour: TEAL },
      // on the board — not assigned, up for grabs
      { id: "b1", status: "open", title: "Water the plants", icon: "🪴", kind: "paid", price_pence: 50, fallback_pence: 50, is_bonus: false, parent_note: null, whoName: null, whoColour: "#999" },
      { id: "b2", status: "open", title: "Sweep the patio", icon: "🍂", kind: "paid", price_pence: 150, fallback_pence: 150, is_bonus: true, parent_note: null, whoName: null, whoColour: "#999" },
      // done
      { id: "d1", status: "approved", title: "Feed Nutmeg", icon: "🐈", kind: "house_critical", price_pence: 0, fallback_pence: 75, is_bonus: false, parent_note: null, whoName: "Rowan", whoColour: ORANGE },
    ] as ParentJob[],
    undistributed: [
      { id: "u1", title: "Clean the bathroom", icon: "🛁", fallback_pence: 150 },
    ],
    parentTasks: [
      { id: "t1", title: "Book the dentist", done: false },
      { id: "t2", title: "Order Nell's birthday present", done: false },
    ],
  };
}

/** Sample data for the /demo meals screen (grown-up ideas + children's foods). */
export function getDemoMeals() {
  return {
    ideas: [
      "Spaghetti bolognese",
      "Roast chicken",
      "Veggie stir fry",
      "Chilli con carne",
      "Fish pie",
      "Fajitas",
    ],
    children: [
      { id: "mabel", name: "Mabel", colour: PURPLE, foods: KIDS.mabel.foods },
      { id: "rowan", name: "Rowan", colour: ORANGE, foods: KIDS.rowan.foods },
      { id: "nell", name: "Nell", colour: TEAL, foods: KIDS.nell.foods },
      { id: "posy", name: "Posy", colour: PINK, foods: KIDS.posy.foods },
      { id: "bo", name: "Bo", colour: GREEN, foods: KIDS.bo.foods },
    ],
    weekLabel: "This week",
  };
}

/** Sample consistency insights for the /demo insights screen. */
export function getDemoInsights() {
  return {
    days: 7,
    insights: [
      { id: "mabel", name: "Mabel", colour: PURPLE, dealt: 4, didOnTime: 3, lapsed: 1, grabbed: 2, consistencyPct: 75 },
      { id: "rowan", name: "Rowan", colour: ORANGE, dealt: 6, didOnTime: 6, lapsed: 0, grabbed: 1, consistencyPct: 100 },
      { id: "nell", name: "Nell", colour: TEAL, dealt: 5, didOnTime: 3, lapsed: 2, grabbed: 4, consistencyPct: 60 },
      { id: "posy", name: "Posy", colour: PINK, dealt: 4, didOnTime: 4, lapsed: 0, grabbed: 1, consistencyPct: 100 },
      { id: "bo", name: "Bo", colour: GREEN, dealt: 3, didOnTime: 1, lapsed: 2, grabbed: 0, consistencyPct: 33 },
    ],
  };
}
