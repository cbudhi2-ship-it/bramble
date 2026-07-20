/**
 * Room name normalisation. Rooms are free text, so "Bedroom", "bedroom" and
 * "BEDROOM" would otherwise become three different rooms. Canonicalise to a
 * single Title-Case form (trimmed, single-spaced) so they all merge.
 */
export function normalizeRoom(s: string | null | undefined): string | null {
  const t = (s ?? "").trim().replace(/\s+/g, " ").toLowerCase();
  if (!t) return null;
  return t.replace(/\b\w/g, (c) => c.toUpperCase());
}
