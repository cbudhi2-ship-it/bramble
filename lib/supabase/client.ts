/**
 * Browser-side Supabase client (Parent Mode only).
 *
 * Uses the publishable anon key. The anon client is NEVER used in Kid Mode —
 * all child reads/writes go through server routes on the service-role client
 * (spec §3.4).
 */
import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
