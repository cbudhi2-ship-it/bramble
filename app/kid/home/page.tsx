/**
 * Kid Mode home (spec §8). Server component: reads the child session cookie,
 * loads the child's day, and hands it to a client component that renders the
 * right "grammar" for the child's mode and handles claim/submit + Away Lock.
 */
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE, verifyChildToken } from "@/lib/child-session";
import { getMemberHome } from "@/lib/queries";
import KidHome from "./KidHome";

export const dynamic = "force-dynamic";

export default async function KidHomePage() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  const session = token ? await verifyChildToken(token) : null;
  if (!session) redirect("/kid");

  const home = await getMemberHome(session.memberId, session.householdId);

  return (
    <KidHome
      name={session.displayName}
      colour={session.colourHex}
      mode={session.mode}
      balancePence={home.balancePence}
      goal={home.goal}
      dealt={home.dealt.map(serialiseJob)}
      board={home.board.map(serialiseJob)}
    />
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function serialiseJob(j: any) {
  return {
    id: j.id,
    status: j.status,
    is_bonus: j.is_bonus,
    award_pence: j.award_pence,
    price_pence: j.job_def?.price_pence ?? 0,
    kind: j.job_def?.kind ?? "paid",
    icon: j.job_def?.icon_key ?? "•",
    title: j.job_def?.title ?? "Job",
    framing_direct: j.job_def?.framing_direct ?? j.job_def?.title ?? "Job",
    framing_ambient: j.job_def?.framing_ambient ?? j.job_def?.title ?? "Job",
  };
}
