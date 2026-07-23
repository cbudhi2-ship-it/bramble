/**
 * Parent Mode → Unlock. Shown to a household that hasn't paid the one-off fee.
 * Pulls the price straight from Stripe so the figure is always whatever you set
 * in the dashboard — no amount hard-coded here.
 */
import { redirect } from "next/navigation";
import { getParent } from "@/lib/parent-auth";
import { createClient } from "@/lib/supabase/server";
import { getStripe, STRIPE_PRICE_ID } from "@/lib/stripe";
import Unlock from "./Unlock";

export const dynamic = "force-dynamic";

async function priceLabel(): Promise<{ label: string; ready: boolean }> {
  const stripe = getStripe();
  if (!stripe || !STRIPE_PRICE_ID) return { label: "", ready: false };
  try {
    const price = await stripe.prices.retrieve(STRIPE_PRICE_ID);
    const amount = (price.unit_amount ?? 0) / 100;
    const label = new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency: (price.currency ?? "gbp").toUpperCase(),
      minimumFractionDigits: amount % 1 === 0 ? 0 : 2,
    }).format(amount);
    return { label, ready: true };
  } catch {
    return { label: "", ready: false };
  }
}

export default async function UnlockPage() {
  const parent = await getParent();
  if (!parent) redirect("/log-in");

  // already unlocked → straight to the app
  const supabase = await createClient();
  const { data: household } = await supabase
    .from("household")
    .select("paid")
    .eq("id", parent.householdId)
    .maybeSingle();
  if (household?.paid) redirect("/parent");

  const { label, ready } = await priceLabel();
  return <Unlock priceLabel={label} ready={ready} />;
}
