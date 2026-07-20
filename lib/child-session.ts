/**
 * Kid-Mode session management (spec §3.2, §3.3).
 *
 * Children have no Supabase Auth account. After the parent taps "Hand over" and
 * a child taps their face + enters their PIN, an HMAC-signed token is stored in
 * an httpOnly cookie in a namespace completely isolated from the parent auth
 * cookie. Every Kid-Mode server route validates this token before it touches
 * the service-role client.
 *
 * The token TTL is deliberately short: child sessions expire after 3 minutes of
 * inactivity (each authenticated request re-issues the cookie), and the client
 * additionally drops to Away Lock after 60s backgrounded. There is no path from
 * Kid Mode to Parent Mode without the parent PIN/biometric — that gate lives in
 * the parent-auth cookie, which Kid Mode never holds.
 */

const SESSION_COOKIE = "bramble-child-session";
const SESSION_TTL_MS = 3 * 60 * 1000; // 3 minutes of inactivity

export interface ChildSession {
  memberId: string;
  householdId: string;
  displayName: string;
  colourHex: string;
  mode: "low_demand" | "standard" | "young_visual";
  exp: number;
}

// ---------------------------------------------------------------------------
// HMAC helpers (Web Crypto — no npm dependency)
// ---------------------------------------------------------------------------

async function getKey(): Promise<CryptoKey> {
  const secret = process.env.CHILD_SESSION_SECRET;
  if (!secret) throw new Error("CHILD_SESSION_SECRET env var is not set");
  const enc = new TextEncoder();
  return crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

async function signPayload(payload: string): Promise<string> {
  const key = await getKey();
  const enc = new TextEncoder();
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(payload));
  return Buffer.from(sig).toString("base64url");
}

async function verifySignature(payload: string, sig: string): Promise<boolean> {
  const key = await getKey();
  const enc = new TextEncoder();
  const sigBuf = Buffer.from(sig, "base64url");
  return crypto.subtle.verify("HMAC", key, sigBuf, enc.encode(payload));
}

// ---------------------------------------------------------------------------
// Token creation / validation
// ---------------------------------------------------------------------------

export async function createChildToken(session: Omit<ChildSession, "exp">): Promise<string> {
  const payload: ChildSession = { ...session, exp: Date.now() + SESSION_TTL_MS };
  const b64 = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = await signPayload(b64);
  return `${b64}.${sig}`;
}

export async function verifyChildToken(token: string): Promise<ChildSession | null> {
  try {
    const [b64, sig] = token.split(".");
    if (!b64 || !sig) return null;
    const ok = await verifySignature(b64, sig);
    if (!ok) return null;
    const session: ChildSession = JSON.parse(Buffer.from(b64, "base64url").toString());
    if (session.exp < Date.now()) return null;
    return session;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Cookie helpers (used in Route Handlers)
// ---------------------------------------------------------------------------

// Secure only in production so http://localhost still works in dev.
const SECURE = process.env.NODE_ENV === "production" ? " Secure;" : "";

export function buildSessionCookie(token: string): string {
  const maxAge = Math.floor(SESSION_TTL_MS / 1000);
  return `${SESSION_COOKIE}=${token}; HttpOnly;${SECURE} SameSite=Lax; Path=/; Max-Age=${maxAge}`;
}

export function clearSessionCookie(): string {
  return `${SESSION_COOKIE}=; HttpOnly;${SECURE} SameSite=Lax; Path=/; Max-Age=0`;
}

/** Parse the child session from an incoming Request's cookie header. */
export async function getChildSession(request: Request): Promise<ChildSession | null> {
  const cookieHeader = request.headers.get("cookie") ?? "";
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${SESSION_COOKIE}=([^;]+)`));
  if (!match) return null;
  return verifyChildToken(decodeURIComponent(match[1]));
}

export { SESSION_COOKIE, SESSION_TTL_MS };
