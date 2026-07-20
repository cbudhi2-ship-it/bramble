/**
 * PIN hashing and verification using PBKDF2 via the Web Crypto API.
 * No npm dependency — works in Node.js 18+ and the Edge runtime.
 *
 * Both numeric PINs (Mabel, Nell, Posy) and picture PINs (Rowan, Bo) hash
 * through the same path: a picture PIN is just a string of animal keys joined
 * with "-" (see lib/picture-pin.ts), so it is hashed like any other secret.
 *
 * Format stored in DB:  "<saltHex>:<hashHex>"
 */

const ITERATIONS = 100_000;
const KEY_LENGTH_BITS = 256;

function hexToUint8(hex: string): Uint8Array<ArrayBuffer> {
  const pairs = hex.match(/.{2}/g) ?? [];
  return new Uint8Array(pairs.map((b) => parseInt(b, 16))) as Uint8Array<ArrayBuffer>;
}

function uint8ToHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function hashPin(pin: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const saltHex = uint8ToHex(salt.buffer as ArrayBuffer);
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey("raw", enc.encode(pin), "PBKDF2", false, [
    "deriveBits",
  ]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations: ITERATIONS, hash: "SHA-256" },
    keyMaterial,
    KEY_LENGTH_BITS
  );
  return `${saltHex}:${uint8ToHex(bits)}`;
}

export async function verifyPin(pin: string, stored: string): Promise<boolean> {
  const [saltHex, storedHash] = stored.split(":");
  if (!saltHex || !storedHash) return false;
  const salt = hexToUint8(saltHex);
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey("raw", enc.encode(pin), "PBKDF2", false, [
    "deriveBits",
  ]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations: ITERATIONS, hash: "SHA-256" },
    keyMaterial,
    KEY_LENGTH_BITS
  );
  return uint8ToHex(bits) === storedHash;
}

/** Generate a random 4-digit numeric PIN string (zero-padded). */
export function generatePin(): string {
  const n = Math.floor(Math.random() * 10000);
  return n.toString().padStart(4, "0");
}
