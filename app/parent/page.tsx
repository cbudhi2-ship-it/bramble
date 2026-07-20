/**
 * Parent Mode — "Today" (spec §9). Server component: resolves the parent, loads
 * every job for today, and hands the whole picture to a client component that
 * groups it into Still-to-do (with owner), On-the-board, Waiting-for-review, and
 * Done — plus the dial, spontaneous recognition, and the review actions.
 */
import { redirect } from "next/navigation";
import { getParentOrBootstrap } from "@/lib/parent-auth";
import { getParentToday } from "@/lib/queries";
import ParentToday from "./ParentToday";

export const dynamic = "force-dynamic";

export default async function ParentPage() {
  const result = await getParentOrBootstrap();
  if (!result.ok) {
    if (result.reason === "unauthenticated") redirect("/log-in");
    // signed in but not on the allowlist — this is a private family app
    return (
      <div className="appshell">
        <div style={{ maxWidth: 420, textAlign: "center", padding: 24 }}>
          <h2 className="h2" style={{ fontSize: 26, margin: "0 auto 12px" }}>
            This is a private family app
          </h2>
          <p className="sub" style={{ margin: "0 auto" }}>
            Your account isn&apos;t set up for a household here. If this is your family&apos;s
            Bramble, ask whoever set it up to add your email.
          </p>
        </div>
      </div>
    );
  }
  const parent = result.parent;

  const data = await getParentToday(parent.householdId);
  const memberName: Record<string, { name: string; colour: string }> = {};
  for (const m of data.members) memberName[m.id] = { name: m.display_name, colour: m.colour_hex };

  return (
    <ParentToday
      loadState={data.household?.load_state ?? "normal"}
      members={data.members.map((m) => ({ id: m.id, name: m.display_name, colour: m.colour_hex }))}
      jobs={data.jobs.map((j) => serialise(j, memberName))}
      undistributed={data.undistributed}
      parentTasks={data.parentTasks}
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
