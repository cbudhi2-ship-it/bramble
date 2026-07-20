/**
 * Parent Mode — "Today" (spec §9). Server component: resolves the parent, loads
 * every job for today, and hands the whole picture to a client component that
 * groups it into Still-to-do (with owner), On-the-board, Waiting-for-review, and
 * Done — plus the dial, spontaneous recognition, and the review actions.
 */
import { redirect } from "next/navigation";
import { getParent } from "@/lib/parent-auth";
import { getParentToday } from "@/lib/queries";
import ParentToday from "./ParentToday";

export const dynamic = "force-dynamic";

export default async function ParentPage() {
  const parent = await getParent();
  if (!parent) redirect("/log-in");

  const data = await getParentToday(parent.householdId);
  const memberName: Record<string, { name: string; colour: string }> = {};
  for (const m of data.members) memberName[m.id] = { name: m.display_name, colour: m.colour_hex };

  return (
    <ParentToday
      loadState={data.household?.load_state ?? "normal"}
      members={data.members.map((m) => ({ id: m.id, name: m.display_name, colour: m.colour_hex }))}
      jobs={data.jobs.map((j) => serialise(j, memberName))}
      undistributed={data.undistributed}
    />
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function serialise(j: any, names: Record<string, { name: string; colour: string }>) {
  const who = j.claimed_by ?? j.assigned_to;
  return {
    id: j.id,
    status: j.status,
    title: j.job_def?.title ?? "Job",
    icon: j.job_def?.icon_key ?? "•",
    kind: j.job_def?.kind ?? "paid",
    price_pence: j.is_bonus ? j.award_pence ?? 0 : j.job_def?.price_pence ?? 0,
    fallback_pence: j.job_def?.fallback_pence ?? 0,
    is_bonus: j.is_bonus,
    parent_note: j.parent_note,
    // whoName is null for unclaimed board jobs — that's what "not assigned" means
    whoName: who ? names[who]?.name ?? "—" : null,
    whoColour: who ? names[who]?.colour ?? "#999" : "#999",
  };
}
