/**
 * Picture PIN for the fives (Rowan, Bo) — spec §3.2.
 *
 * A five-year-old will not reliably remember four digits, and a forgotten PIN
 * becomes a meltdown. So the youngest children authenticate by tapping three
 * animals in order. Under the hood this is just a short ordered sequence of
 * stable keys, joined into a string and hashed exactly like a numeric PIN
 * (lib/child-pin.ts) — nothing special stored, nothing reversible.
 */

/** The animal grid shown on the picture-PIN pad, in a fixed order. */
export const PICTURE_PIN_ANIMALS = [
  { key: "fox", emoji: "🦊" },
  { key: "frog", emoji: "🐸" },
  { key: "octopus", emoji: "🐙" },
  { key: "owl", emoji: "🦉" },
  { key: "bee", emoji: "🐝" },
  { key: "dino", emoji: "🦕" },
  { key: "snail", emoji: "🐌" },
  { key: "hedgehog", emoji: "🦔" },
  { key: "whale", emoji: "🐳" },
] as const;

export type AnimalKey = (typeof PICTURE_PIN_ANIMALS)[number]["key"];

export const PICTURE_PIN_LENGTH = 3;

/**
 * Turn an ordered list of animal taps into the canonical secret string that
 * gets hashed. Order matters — ["fox","octopus","bee"] !== ["bee","octopus","fox"].
 */
export function picturePinToSecret(sequence: string[]): string {
  return `pic:${sequence.join("-")}`;
}

export function emojiForAnimal(key: string): string {
  return PICTURE_PIN_ANIMALS.find((a) => a.key === key)?.emoji ?? "❓";
}
