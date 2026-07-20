/**
 * Next.js 16 Proxy (formerly Middleware) — spec §2 keeps the Kinnect name.
 *
 * Two isolated session namespaces, matching the three device states (spec §3.3):
 *
 * 1. Parent routes (/parent/*)
 *    → protected by the Supabase Auth session cookie
 *    → redirects to /log-in when unauthenticated
 *
 * 2. Kid routes (/kid/home)
 *    → protected by the bramble-child-session cookie (HMAC-signed token)
 *    → redirects to /kid (the profile picker) when unauthenticated
 *    → a logged-in parent is NOT admitted here on their auth cookie; the child
 *      session is validated independently, so there is no path from Kid Mode up
 *      to Parent Mode without the parent PIN/biometric.
 *
 * /, /log-in, /kid (picker) and /api/* are public to the proxy (API routes do
 * their own session checks).
 */
import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { SESSION_COOKIE } from "@/lib/child-session";

const PARENT_PROTECTED = ["/parent"];
const CHILD_PROTECTED = ["/kid/home"];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (CHILD_PROTECTED.some((p) => pathname.startsWith(p))) {
    const cookie = request.cookies.get(SESSION_COOKIE);
    if (!cookie?.value) {
      const url = request.nextUrl.clone();
      url.pathname = "/kid";
      return NextResponse.redirect(url);
    }
    return NextResponse.next({ request });
  }

  if (PARENT_PROTECTED.some((p) => pathname.startsWith(p))) {
    return updateSession(request);
  }

  return NextResponse.next({ request });
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
