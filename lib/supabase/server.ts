/**
 * Server-side Supabase client for Server Components, Server Actions, and Route
 * Handlers (Parent Mode).
 *
 * Pass `useServiceRole: true` in any route that writes on behalf of a child or
 * across users — the rota generator, the fallback sweep, and every Kid-Mode
 * write (spec §2, §3.4). The service-role key bypasses RLS, so it must only
 * ever run server-side behind a validated session.
 */
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient({ useServiceRole = false } = {}) {
  const cookieStore = await cookies();

  const supabaseKey = useServiceRole
    ? process.env.SUPABASE_SERVICE_ROLE_KEY!
    : process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    supabaseKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Server Components cannot set cookies; the proxy handles refresh.
          }
        },
      },
    }
  );
}

/**
 * A bare service-role client with no cookie context — for cron routes, which
 * have no request session but must write rows for every child. Never import
 * this into anything reachable from the browser bundle.
 */
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

export function createServiceClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}
