/**
 * POST /api/stripe/webhook — Stripe tells us when a payment completes.
 *
 * Verifies the signature with STRIPE_WEBHOOK_SECRET, then on
 * `checkout.session.completed` flips the paying household to paid = true. Runs
 * on the service-role client (no user session on a webhook). The raw request
 * body is required for signature verification — do not parse it first.
 */
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { createServiceClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  const stripe = getStripe();
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripe || !secret) {
    return NextResponse.json({ error: "Payments aren't set up yet." }, { status: 503 });
  }

  const sig = req.headers.get("stripe-signature");
  if (!sig) return NextResponse.json({ error: "Missing signature" }, { status: 400 });

  const body = await req.text();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, secret);
  } catch (err) {
    console.error("stripe webhook signature failed", err);
    return NextResponse.json({ error: "Bad signature" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const householdId = session.client_reference_id ?? session.metadata?.householdId;
    if (householdId && (session.payment_status === "paid" || session.status === "complete")) {
      const supabase = createServiceClient();
      await supabase.from("household").update({ paid: true }).eq("id", householdId);
    }
  }

  return NextResponse.json({ received: true });
}
