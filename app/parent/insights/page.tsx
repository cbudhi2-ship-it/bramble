/**
 * Parent Mode → Insights. Consistency over the last week: who clears their own
 * dealt jobs vs who leaves them to become paid bonuses.
 */
import { redirect } from "next/navigation";
import { getParent } from "@/lib/parent-auth";
import { getInsights } from "@/lib/queries";
import ParentInsights from "./ParentInsights";

export const dynamic = "force-dynamic";

export default async function ParentInsightsPage() {
  const parent = await getParent();
  if (!parent) redirect("/log-in");

  const { days, insights } = await getInsights(parent.householdId, 7);
  return <ParentInsights insights={insights} days={days} />;
}
