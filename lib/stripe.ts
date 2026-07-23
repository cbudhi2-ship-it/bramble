/**
 * Stripe client + config, read from the environment. Constructed lazily so a
 * missing key (e.g. in a preview build before keys are set) never crashes the
 * app — callers get null and can show a friendly "not set up yet" state.
 *
 * Env vars (set in Vercel):
 *   STRIPE_SECRET_KEY      — sk_test_… then sk_live_…
 *   STRIPE_PRICE_ID        — price_… for the one-off unlock fee
 *   STRIPE_WEBHOOK_SECRET  — whsec_… from the webhook endpoint
 *   NEXT_PUBLIC_APP_URL    — https://www.familybramble.online (for redirects)
 */
import Stripe from "stripe";

let cached: Stripe | null = null;

export function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  if (!cached) cached = new Stripe(key);
  return cached;
}

export const STRIPE_PRICE_ID = process.env.STRIPE_PRICE_ID ?? "";

export function appUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL ?? "https://www.familybramble.online").replace(/\/$/, "");
}
