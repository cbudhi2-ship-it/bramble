/**
 * Presence resolution (spec §5 step 1).
 *
 * full_time members are always present. eow_and_holidays members are present
 * when today falls in their every-other-weekend pattern OR a presence_override
 * says so. An explicit override (present true/false) always wins over the
 * pattern — that is how holidays, swaps and one-off nights are expressed.
 */
import type { Member, PresenceOverride } from "./types.ts";

/** Parse "YYYY-MM-DD" as a UTC date (no timezone drift). */
export function parseDate(date: string): Date {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

/** Fri (5), Sat (6), Sun (0) count as weekend — when the weekend crew is here. */
export function isWeekend(date: string): boolean {
  const dow = parseDate(date).getUTCDay();
  return dow === 5 || dow === 6 || dow === 0;
}

/** Age in whole years at `date`, or null if dob unknown. */
export function ageAt(dob: string | null, date: string): number | null {
  if (!dob) return null;
  const b = parseDate(dob);
  const d = parseDate(date);
  let age = d.getUTCFullYear() - b.getUTCFullYear();
  const beforeBirthday =
    d.getUTCMonth() < b.getUTCMonth() ||
    (d.getUTCMonth() === b.getUTCMonth() && d.getUTCDate() < b.getUTCDate());
  if (beforeBirthday) age--;
  return age;
}

function overrideFor(
  memberId: string,
  date: string,
  overrides: PresenceOverride[]
): boolean | null {
  const hit = overrides.find(
    (o) => o.member_id === memberId && date >= o.date_from && date <= o.date_to
  );
  return hit ? hit.present : null;
}

/**
 * Resolve which members are present on `date`.
 *
 * Presence is PARENT-DRIVEN, not inferred: every active child is treated as home
 * by default, so the day's jobs deal evenly across all of them. A child who is
 * away (at their other home, on holiday) is marked absent for those days with a
 * presence_override, which always wins. (An earlier version guessed an
 * every-other-weekend pattern for "weekends/holidays" children — that guess was
 * unreliable and could pile every job onto the one full-time child.)
 */
export function resolvePresentMembers(
  members: Member[],
  date: string,
  overrides: PresenceOverride[] = []
): Member[] {
  return members.filter((m) => {
    if (!m.active) return false;
    const ov = overrideFor(m.id, date, overrides);
    if (ov !== null) return ov; // explicit away/here override wins
    return true; // everyone's home by default
  });
}
