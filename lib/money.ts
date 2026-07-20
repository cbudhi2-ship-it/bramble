/**
 * Money helpers (spec §7).
 *
 * Balance is never a stored column — it is always SUM(delta_pence) over the
 * append-only ledger. Caps are how presence fairness works without ever varying
 * the rate: full-timers have a weekly cap (resets Monday), the weekend crew a
 * per-visit cap (resets on arrival).
 */
import type { LedgerReason, Member } from "./types.ts";

export interface LedgerRow {
  member_id: string;
  delta_pence: number;
  reason: LedgerReason;
  created_at: string;
}

/** Balance for one member = sum of their ledger deltas. */
export function balancePence(rows: Pick<LedgerRow, "delta_pence">[]): number {
  return rows.reduce((sum, r) => sum + r.delta_pence, 0);
}

export function formatPence(pence: number): string {
  const sign = pence < 0 ? "-" : "";
  const abs = Math.abs(pence);
  if (abs < 100) return `${sign}${abs}p`;
  return `${sign}£${(abs / 100).toFixed(2)}`;
}

/** Monday 00:00 UTC of the week containing `date` (weekly-cap window start). */
export function weekStart(date: string): string {
  const d = new Date(date + "T00:00:00Z");
  const dow = d.getUTCDay(); // 0 = Sun
  const diff = (dow + 6) % 7; // days since Monday
  d.setUTCDate(d.getUTCDate() - diff);
  return d.toISOString().slice(0, 10);
}

/**
 * How much earning headroom a member has left before their cap. Returns null
 * when the member has no cap set (uncapped). `earnedThisWindow` is the sum of
 * their job/bonus earnings within the current cap window.
 *
 * Full-timers use weekly_cap_pence; the weekend crew use per_visit_cap_pence.
 */
export function capRemainingPence(member: Member, earnedThisWindowPence: number): number | null {
  const cap =
    member.presence === "full_time" ? member.weekly_cap_pence : member.per_visit_cap_pence;
  if (cap === null || cap === undefined) return null;
  return Math.max(0, cap - earnedThisWindowPence);
}

/** Has the member maxed out their cap for this window? */
export function isCapped(member: Member, earnedThisWindowPence: number): boolean {
  const remaining = capRemainingPence(member, earnedThisWindowPence);
  return remaining !== null && remaining <= 0;
}

/**
 * The award for a part-done job: a percentage (0–100) of the full price,
 * rounded to the nearest penny. Part-done must always pay for genuine partial
 * effort (spec §6).
 */
export function partDoneAward(pricePence: number, percent: number): number {
  const clamped = Math.max(0, Math.min(100, percent));
  return Math.round((pricePence * clamped) / 100);
}
