/**
 * Handover cookie (spec §3.3). When a signed-in parent taps "Hand the phone
 * over", we drop a short-lived, HMAC-signed cookie naming the household. The Kid
 * Mode profile picker reads it to know whose children to list — WITHOUT relying
 * on the parent auth cookie, which keeps the two session namespaces isolated and
 * means there is no path back up to Parent Mode without a fresh sign-in.
 */

const HANDOVER_COOKIE = "bramble-kid-household";
const HANDOVER_TTL_MS = 12 * 60 * 60 * 1000; // 12h — a handed-over device for the day

interface HandoverPayload {
  householdId: string;
  exp: number;
}

async function getKey(): Promise<CryptoKey> {
  const secret = process.env.CHILD_SESSION_SECRET;
  if (!secret) throw new Error("CHILD_SESSION_SECRET env var is not set");
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

export async function createHandoverToken(householdId: string): Promise<string> {
  const payload: HandoverPayload = { householdId, exp: Date.now() + HANDOVER_TTL_MS };
  const b64 = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = await crypto.subtle.sign("HMAC", await getKey(), new TextEncoder().encode(b64));
  return `${b64}.${Buffer.from(sig).toString("base64url")}`;
}

export async function verifyHandoverToken(token: string): Promise<string | null> {
  try {
    const [b64, sig] = token.split(".");
    if (!b64 || !sig) return null;
    const ok = await crypto.subtle.verify(
      "HMAC",
      await getKey(),
      Buffer.from(sig, "base64url"),
      new TextEncoder().encode(b64)
    );
    if (!ok) return null;
    const payload: HandoverPayload = JSON.parse(Buffer.from(b64, "base64url").toString());
    if (payload.exp < Date.now()) return null;
    return payload.householdId;
  } catch {
    return null;
  }
}

export function buildHandoverCookie(token: string): string {
  const maxAge = Math.floor(HANDOVER_TTL_MS / 1000);
  const secure = process.env.NODE_ENV === "production" ? " Secure;" : "";
  return `${HANDOVER_COOKIE}=${token}; HttpOnly;${secure} SameSite=Lax; Path=/; Max-Age=${maxAge}`;
}

export async function getHandoverHousehold(request: Request): Promise<string | null> {
  const cookieHeader = request.headers.get("cookie") ?? "";
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${HANDOVER_COOKIE}=([^;]+)`));
  if (!match) return null;
  return verifyHandoverToken(decodeURIComponent(match[1]));
}

export { HANDOVER_COOKIE };
