import { test } from "node:test";
import assert from "node:assert/strict";
import { planRota, seededShuffle, type PlanInput } from "./rota.ts";
import type { JobDef, Member } from "./types.ts";

// --- fixtures --------------------------------------------------------------
function member(over: Partial<Member> & { id: string }): Member {
  return {
    id: over.id,
    household_id: "h1",
    display_name: over.display_name ?? over.id,
    dob: over.dob ?? "2015-01-01", // ~10 by 2026
    colour_hex: "#000",
    avatar_key: null,
    mode: over.mode ?? "standard",
    presence: over.presence ?? "full_time",
    pin_hash: null,
    pin_type: "numeric",
    weekly_cap_pence: null,
    per_visit_cap_pence: null,
    active: true,
    created_at: "",
    ...over,
  };
}

function job(over: Partial<JobDef> & { id: string }): JobDef {
  return {
    id: over.id,
    household_id: "h1",
    title: over.title ?? over.id,
    icon_key: null,
    kind: over.kind ?? "house_critical",
    price_pence: over.price_pence ?? 0,
    age_min: over.age_min ?? 0,
    age_max: over.age_max ?? 99,
    tier: over.tier ?? "core",
    pool: over.pool ?? "any",
    recurrence: over.recurrence ?? "daily",
    room: over.room ?? null,
    people_needed: over.people_needed ?? 1,
    low_demand_safe: over.low_demand_safe ?? false,
    framing_direct: null,
    framing_ambient: null,
    active: true,
    created_at: "",
    ...over,
  };
}

const base: Omit<PlanInput, "presentMembers" | "jobDefs"> = {
  householdId: "h1",
  date: "2026-07-15", // a Wednesday
  loadState: "normal",
  yesterdayByMember: {},
};

test("seededShuffle is deterministic for a given seed", () => {
  const a = seededShuffle([1, 2, 3, 4, 5], "seed");
  const b = seededShuffle([1, 2, 3, 4, 5], "seed");
  assert.deepEqual(a, b);
});

test("low_demand_safe=false is never dealt to a low_demand member", () => {
  const mabel = member({ id: "mabel", mode: "low_demand" });
  const nell = member({ id: "nell" });
  const j = job({ id: "dishwasher", low_demand_safe: false });
  const plan = planRota({ ...base, presentMembers: [mabel, nell], jobDefs: [j] });
  const dealtToMabel = plan.dealt.find((d) => d.assigned_to === "mabel");
  assert.equal(dealtToMabel, undefined);
  // it still lands on someone
  assert.equal(plan.dealt.length, 1);
});

test("no member is dealt the same job_def they had yesterday", () => {
  const nell = member({ id: "nell" });
  const j = job({ id: "bins" });
  const plan = planRota({
    ...base,
    presentMembers: [nell],
    jobDefs: [j],
    yesterdayByMember: { nell: ["bins"] },
  });
  // only eligible child had it yesterday → nobody gets it (becomes a fallback)
  assert.equal(plan.dealt.length, 0);
});

test("survival deals nothing to low_demand or young_visual members", () => {
  const mabel = member({ id: "mabel", mode: "low_demand" });
  const rowan = member({ id: "rowan", mode: "young_visual", dob: "2021-01-01" });
  const nell = member({ id: "nell", mode: "standard" });
  const j = job({ id: "bins", low_demand_safe: true, age_min: 0, age_max: 99 });
  const plan = planRota({
    ...base,
    loadState: "survival",
    presentMembers: [mabel, rowan, nell],
    jobDefs: [j],
  });
  assert.ok(plan.dealt.every((d) => d.assigned_to === "nell"));
});

test("stretched caps a low_demand member to one dealt job", () => {
  const mabel = member({ id: "mabel", mode: "low_demand" });
  const jobs = [
    job({ id: "a", low_demand_safe: true }),
    job({ id: "b", low_demand_safe: true }),
    job({ id: "c", low_demand_safe: true }),
  ];
  const plan = planRota({
    ...base,
    loadState: "stretched",
    presentMembers: [mabel],
    jobDefs: jobs,
  });
  const toMabel = plan.dealt.filter((d) => d.assigned_to === "mabel");
  assert.equal(toMabel.length, 1);
});

test("weekend_only jobs do not materialise without the weekend crew", () => {
  const mabel = member({ id: "mabel", presence: "full_time" });
  const paidWeekend = job({ id: "car", kind: "paid", price_pence: 200, pool: "weekend_only" });
  const plan = planRota({ ...base, presentMembers: [mabel], jobDefs: [paidWeekend] });
  assert.equal(plan.board.length, 0);
});

test("weekend_only jobs appear when an eow member is present", () => {
  const mabel = member({ id: "mabel", presence: "full_time" });
  const nell = member({ id: "nell", presence: "eow_and_holidays" });
  const paidWeekend = job({ id: "car", kind: "paid", price_pence: 200, pool: "weekend_only" });
  const plan = planRota({
    ...base,
    presentMembers: [mabel, nell],
    jobDefs: [paidWeekend],
  });
  assert.equal(plan.board.length, 1);
});

test("tier is full only when >=4 children are present", () => {
  const three = [member({ id: "a" }), member({ id: "b" }), member({ id: "c" })];
  const four = [...three, member({ id: "d" })];
  const j = job({ id: "j" });
  assert.equal(planRota({ ...base, presentMembers: three, jobDefs: [j] }).tier, "core");
  assert.equal(planRota({ ...base, presentMembers: four, jobDefs: [j] }).tier, "full");
});

test("a 2-person job is dealt to two distinct children", () => {
  const kids = [member({ id: "a" }), member({ id: "b" }), member({ id: "c" })];
  const bathroom = job({ id: "bathroom", people_needed: 2, low_demand_safe: true });
  const plan = planRota({ ...base, presentMembers: kids, jobDefs: [bathroom] });
  const takers = plan.dealt.filter((d) => d.job_def_id === "bathroom");
  assert.equal(takers.length, 2);
  assert.notEqual(takers[0].assigned_to, takers[1].assigned_to);
});

test("a 2-person job with only one eligible child deals to just that one", () => {
  const solo = [member({ id: "a" })];
  const bathroom = job({ id: "bathroom", people_needed: 2, low_demand_safe: true });
  const plan = planRota({ ...base, presentMembers: solo, jobDefs: [bathroom] });
  assert.equal(plan.dealt.filter((d) => d.job_def_id === "bathroom").length, 1);
});

test("round-robin spreads dealt jobs roughly evenly", () => {
  const kids = [member({ id: "a" }), member({ id: "b" })];
  const jobs = [job({ id: "j1" }), job({ id: "j2" }), job({ id: "j3" }), job({ id: "j4" })];
  const plan = planRota({ ...base, presentMembers: kids, jobDefs: jobs });
  const counts: Record<string, number> = { a: 0, b: 0 };
  plan.dealt.forEach((d) => counts[d.assigned_to]++);
  assert.equal(Math.abs(counts.a - counts.b) <= 1, true);
});
