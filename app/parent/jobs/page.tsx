/**
 * Parent Mode → Jobs (spec §9). The library of job_defs: add essential/everyday
 * or paid jobs, each with its 6pm fallback price set up front.
 */
import { redirect } from "next/navigation";
import { getParent } from "@/lib/parent-auth";
import { createClient } from "@/lib/supabase/server";
import ParentJobs, { type JobLite } from "./ParentJobs";

export const dynamic = "force-dynamic";

export default async function ParentJobsPage() {
  const parent = await getParent();
  if (!parent) redirect("/log-in");

  const supabase = await createClient();
  const { data } = await supabase
    .from("job_def")
    .select("id, title, kind, price_pence, fallback_pence, framing_ambient, recurrence, room, people_needed, age_min")
    .eq("household_id", parent.householdId)
    .eq("active", true)
    .order("created_at", { ascending: false });

  return <ParentJobs initialJobs={(data ?? []) as JobLite[]} />;
}
