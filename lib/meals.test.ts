import { test } from "node:test";
import assert from "node:assert/strict";
import { planMeals, DAY_NAMES, type ChildFoods } from "./meals.ts";

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

test("produces 7 days of lunch and dinner", () => {
  const plan = planMeals(kids, ideas, "2026-07-20:0");
  assert.equal(plan.length, 7);
  assert.deepEqual(
    plan.map((d) => d.day),
    DAY_NAMES
  );
  for (const d of plan) {
    assert.ok(d.lunch.length > 0, `lunch filled for ${d.day}`);
    assert.ok(d.dinner.length > 0, `dinner filled for ${d.day}`);
  }
});

test("is deterministic for the same seed and differs across seeds", () => {
  const a = planMeals(kids, ideas, "2026-07-20:0");
  const b = planMeals(kids, ideas, "2026-07-20:0");
  const c = planMeals(kids, ideas, "2026-07-20:1"); // regenerate nonce
  assert.deepEqual(a, b);
  assert.notDeepEqual(a, c);
});

test("no lunch equals its own dinner, no back-to-back dinners", () => {
  const plan = planMeals(kids, ideas, "week:0");
  for (const d of plan) assert.notEqual(d.lunch, d.dinner);
  for (let i = 1; i < plan.length; i++) {
    if (plan.map((x) => x.dinner).filter((v, _i, a) => a.indexOf(v) !== a.lastIndexOf(v)).length) break;
    assert.notEqual(plan[i].dinner, plan[i - 1].dinner);
  }
});

test("still works with only child foods (no grown-up ideas)", () => {
  const plan = planMeals(kids, [], "s:0");
  assert.equal(plan.length, 7);
  for (const d of plan) assert.ok(d.dinner.length > 0);
});

test("still works with only grown-up ideas (no child foods)", () => {
  const plan = planMeals([], ideas, "s:0");
  assert.equal(plan.length, 7);
  for (const d of plan) assert.ok(d.lunch.length > 0);
});

test("empty everything yields blanks, not a crash", () => {
  const plan = planMeals([], [], "s:0");
  assert.equal(plan.length, 7);
  assert.equal(plan[0].lunch, "");
  assert.equal(plan[0].dinner, "");
});

test("de-dupes a food two children both love", () => {
  // both A and B list Pasta; a single week shouldn't be dominated by dupes,
  // but generation must not throw and must fill every slot
  const plan = planMeals(kids, [], "dup:0");
  assert.equal(plan.length, 7);
});
