/**
 * POST /api/checkout — start the one-off unlock payment.
 *
 * Creates a Stripe Checkout Session (mode: payment) for the single one-time
 * price and returns its URL for the browser to redirect to. The household is
 * carried on client_reference_id/metadata so the webhook knows who paid.
 */
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getParent } from "@/lib/parent-auth";
import { createClient } from "@/lib/supabase/server";
import { getStripe, STRIPE_PRICE_ID, appUrl } from "@/lib/stripe";

export async function POST() {
  const parent = await getParent();
  if (!parent) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const stripe = getStripe();
  if (!stripe || !STRIPE_PRICE_ID) {
    return NextResponse.json({ error: "Payments aren't set up yet." }, { status: 503 });
  }

  // already unlocked? nothing to buy.
  const supabase = await createClient();
  const { data: household } = await supabase
    .from("household")
    .select("paid")
    .eq("id", parent.householdId)
    .maybeSingle();
  if (household?.paid) return NextResponse.json({ error: "Already unlocked" }, { status: 409 });

  const base = appUrl();
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [{ price: STRIPE_PRICE_ID, quantity: 1 }],
    client_reference_id: parent.householdId,
    metadata: { householdId: parent.householdId },
    success_url: `${base}/parent?unlocked=1`,
    cancel_url: `${base}/parent/unlock?cancelled=1`,
    allow_promotion_codes: true,
  });

  return NextResponse.json({ url: session.url });
}
