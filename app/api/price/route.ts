/**
 * GET /api/price — the one-off unlock price, formatted, for the public landing
 * page. Reads it straight from Stripe so the figure always matches the dashboard.
 * Cached in memory for an hour so a busy landing page doesn't hammer Stripe.
 */
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getStripe, STRIPE_PRICE_ID } from "@/lib/stripe";

let cache: { label: string; ready: boolean; at: number } | null = null;
const TTL = 60 * 60 * 1000;

export async function GET() {
  if (cache && Date.now() - cache.at < TTL) {
    return NextResponse.json({ label: cache.label, ready: cache.ready });
  }

  const stripe = getStripe();
  let result = { label: "", ready: false };
  if (stripe && STRIPE_PRICE_ID) {
    try {
      const price = await stripe.prices.retrieve(STRIPE_PRICE_ID);
      const amount = (price.unit_amount ?? 0) / 100;
      const label = new Intl.NumberFormat("en-GB", {
        style: "currency",
        currency: (price.currency ?? "gbp").toUpperCase(),
        minimumFractionDigits: amount % 1 === 0 ? 0 : 2,
      }).format(amount);
      result = { label, ready: true };
    } catch {
      result = { label: "", ready: false };
    }
  }

  cache = { ...result, at: Date.now() };
  return NextResponse.json(result);
}
