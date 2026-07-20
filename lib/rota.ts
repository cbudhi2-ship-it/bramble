/**
 * The rota engine (spec §5) — pure and deterministic, so it can be tested
 * without a database. The cron route (app/api/cron/rota) resolves presence,
 * loads job_defs and yesterday's deals, calls planRota(), and writes the rows
 * with the service-role client.
 *
 * Determinism matters: the shuffle is seeded with household_id + date, so a
 * re-run on the same day produces the same deal rather than re-rolling.
 */
import type { JobDef, LoadState, Member } from "./types.ts";
import { ageAt, isWeekend } from "./presence.ts";

// ---------------------------------------------------------------------------
// Seeded RNG (mulberry32 over a string hash) — no dependency, reproducible.
// ---------------------------------------------------------------------------
function hashString(s: string): number {
  let h = 1779033703 ^ s.length;
  for (let i = 0; i < s.length; i++) {
    h = Math.imul(h ^ s.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return h >>> 0;
}

function mulberry32(seed: number): () => number {
  let a = seed;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Deterministic Fisher–Yates shuffle for the given seed. */
export function seededShuffle<T>(items: T[], seed: string): T[] {
  const rng = mulberry32(hashString(seed));
  const a = items.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ---------------------------------------------------------------------------
// Recurrence
// ---------------------------------------------------------------------------
export function recurrenceFires(def: JobDef, date: string): boolean {
  const d = new Date(date + "T00:00:00Z");
  switch (def.recurrence) {
    case "daily":
      return true;
    case "weekdays":
      return !isWeekend(date);
    case "weekly":
      // fire on Saturdays — the weekend is when there are the most hands for
      // bigger, whole-room jobs
      return d.getUTCDay() === 6;
    case "monthly":
      // fire on the 1st of the month
      return d.getUTCDate() === 1;
    case "on_demand":
      return false;
    default:
      return false;
  }
}

// ---------------------------------------------------------------------------
// Plan
// ---------------------------------------------------------------------------
export interface DealtJob {
  job_def_id: string;
  assigned_to: string;
}

export interface BoardJob {
  job_def_id: string;
}

export interface RotaPlan {
  tier: "core" | "full";
  dealt: DealtJob[]; // house_critical jobs assigned to a specific child
  board: BoardJob[]; // paid jobs, assigned_to = null, status = open
}

export interface PlanInput {
  householdId: string;
  date: string;
  loadState: LoadState;
  presentMembers: Member[];
  jobDefs: JobDef[];
  /** job_def_ids each member was dealt yesterday, to enforce no-repeat. */
  yesterdayByMember: Record<string, string[]>;
}

function eligibleFor(def: JobDef, members: Member[], date: string): Member[] {
  return members.filter((m) => {
    const age = ageAt(m.dob, date);
    if (age === null) return true; // unknown dob → treat as eligible
    return age >= def.age_min && age <= def.age_max;
  });
}

/**
 * Per load-state, how many jobs may be dealt to a low_demand member.
 *   normal    → unlimited (their fair share of the round-robin)
 *   stretched → 1  (spec §9: "Mabel's deal drops to 1 job")
 *   survival  → 0  (spec §9: "Nothing is dealt to Mabel or Rowan")
 */
function lowDemandCap(load: LoadState): number {
  if (load === "survival") return 0;
  if (load === "stretched") return 1;
  return Infinity;
}

/** young_visual members are also spared the deal in survival. */
function dealsToMember(m: Member, load: LoadState): boolean {
  if (load === "survival") return m.mode === "standard";
  return true;
}

export function planRota(input: PlanInput): RotaPlan {
  const { householdId, date, loadState, presentMembers, jobDefs, yesterdayByMember } = input;

  const weekendCrewPresent = presentMembers.some((m) => m.presence === "eow_and_holidays");

  // Step 2 — tier
  const tier: "core" | "full" = presentMembers.length >= 4 ? "full" : "core";
  // stretched & survival both collapse to core-only house-critical dealing.
  const dealTier: "core" | "full" = loadState === "normal" ? tier : "core";

  const activeDefs = jobDefs.filter((d) => d.active && recurrenceFires(d, date));

  // ----- Step 3/4: house_critical jobs get dealt to children --------------
  const criticalDefs = activeDefs.filter((d) => {
    if (d.kind !== "house_critical") return false;
    if (dealTier === "core" && d.tier !== "core") return false;
    if (d.pool === "weekend_only" && !weekendCrewPresent) return false;
    return true;
  });

  // round-robin bookkeeping
  const dealtCount: Record<string, number> = {};
  const lowDemandDealt: Record<string, number> = {};
  presentMembers.forEach((m) => {
    dealtCount[m.id] = 0;
    lowDemandDealt[m.id] = 0;
  });

  const dealt: DealtJob[] = [];
  // Deal the highest-constraint jobs first for a fairer spread.
  const orderedCritical = seededShuffle(criticalDefs, `${householdId}:${date}:defs`);

  for (const def of orderedCritical) {
    const pool = eligibleFor(def, presentMembers, date).filter((m) => {
      if (!dealsToMember(m, loadState)) return false;
      // low_demand_safe = false must never be dealt to a low_demand member
      if (!def.low_demand_safe && m.mode === "low_demand") return false;
      // respect the low-demand per-day cap under load
      if (m.mode === "low_demand" && lowDemandDealt[m.id] >= lowDemandCap(loadState)) return false;
      // no member gets the same job_def they had yesterday
      if ((yesterdayByMember[m.id] ?? []).includes(def.id)) return false;
      return true;
    });

    if (pool.length === 0) continue; // becomes a fallback opportunity at 18:05

    // shuffle then pick the least-loaded eligible children (round-robin even).
    // A whole-room job may need more than one person — deal it to that many
    // distinct children (or as many as are eligible).
    const shuffled = seededShuffle(pool, `${householdId}:${date}:${def.id}`);
    shuffled.sort((a, b) => dealtCount[a.id] - dealtCount[b.id]);
    const need = Math.max(1, def.people_needed ?? 1);
    const winners = shuffled.slice(0, Math.min(need, shuffled.length));

    for (const winner of winners) {
      dealt.push({ job_def_id: def.id, assigned_to: winner.id });
      dealtCount[winner.id]++;
      if (winner.mode === "low_demand") lowDemandDealt[winner.id]++;
    }
  }

  // ----- Step 5: the paid board ------------------------------------------
  // In survival, house_critical work also goes on the board as paid bonus, but
  // the cron layer handles re-pricing; here we surface the ordinary paid pool.
  const board: BoardJob[] = activeDefs
    .filter((d) => {
      if (d.kind !== "paid") return false;
      if (d.pool === "weekend_only" && !weekendCrewPresent) return false;
      // stretched shrinks the board to essentials: drop optional weekend extras
      if (loadState === "stretched" && d.pool === "weekend_only") return false;
      return true;
    })
    .map((d) => ({ job_def_id: d.id }));

  return { tier, dealt, board };
}
