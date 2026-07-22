import { test } from "node:test";
import assert from "node:assert/strict";
import { planMealsFallback, DAY_NAMES, cleanList, type ChildFoods } from "./meals.ts";

const kids: ChildFoods[] = [
  { name: "A", foods: ["Pasta", "Sausages", "Pizza"] },
  { name: "B", foods: ["Fish fingers", "Pasta", "Curry"] },
  { name: "C", foods: ["Jacket potato"] },
];
const ideas = [
  "Spaghetti bolognese",
  "Roast chicken",
  "Stir fry",
  "Chilli",
  "Fajitas",
  "Shepherd's pie",
];

test("fallback produces 7 days of lunch and dinner", () => {
  const plan = planMealsFallback(kids, ideas, "2026-07-20:0");
  assert.equal(plan.length, 7);
  assert.deepEqual(
    plan.map((d) => d.day),
    DAY_NAMES
  );
  for (const d of plan) {
    assert.ok(d.lunch.name.length > 0, `lunch filled for ${d.day}`);
    assert.ok(d.dinner.name.length > 0, `dinner filled for ${d.day}`);
  }
});

test("fallback is deterministic for the same seed and differs across seeds", () => {
  const a = planMealsFallback(kids, ideas, "2026-07-20:0");
  const b = planMealsFallback(kids, ideas, "2026-07-20:0");
  const c = planMealsFallback(kids, ideas, "2026-07-20:1");
  assert.deepEqual(a, b);
  assert.notDeepEqual(a, c);
});

test("no lunch equals its own dinner", () => {
  const plan = planMealsFallback(kids, ideas, "week:0");
  for (const d of plan) assert.notEqual(d.lunch.name, d.dinner.name);
});

test("fallback works with only child foods (no grown-up ideas)", () => {
  const plan = planMealsFallback(kids, [], "s:0");
  assert.equal(plan.length, 7);
  for (const d of plan) assert.ok(d.dinner.name.length > 0);
});

test("fallback works with only grown-up ideas (no child foods)", () => {
  const plan = planMealsFallback([], ideas, "s:0");
  assert.equal(plan.length, 7);
  for (const d of plan) assert.ok(d.lunch.name.length > 0);
});

test("empty everything yields blanks, not a crash", () => {
  const plan = planMealsFallback([], [], "s:0");
  assert.equal(plan.length, 7);
  assert.equal(plan[0].lunch.name, "");
  assert.equal(plan[0].dinner.name, "");
});

test("cleanList de-dupes case-insensitively and drops blanks", () => {
  assert.deepEqual(cleanList([" Pasta", "pasta", "", "Pizza"]), ["Pasta", "Pizza"]);
});
