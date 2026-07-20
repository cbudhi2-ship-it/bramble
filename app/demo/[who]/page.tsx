/**
 * /demo/[who] — renders the real KidHome or ParentToday component in demo mode
 * with the fictional family's data. A slim demo ribbon sits above so the visitor
 * always knows it's a preview and can hop between screens or sign in.
 */
import Link from "next/link";
import { notFound } from "next/navigation";
import { getDemoKid, getDemoParent, getDemoJobs, getDemoInsights, DEMO_PEOPLE } from "@/lib/demo-data";
import KidHome from "@/app/kid/home/KidHome";
import ParentToday from "@/app/parent/ParentToday";
import ParentJobs from "@/app/parent/jobs/ParentJobs";
import ParentInsights from "@/app/parent/insights/ParentInsights";

export function generateStaticParams() {
  return DEMO_PEOPLE.map((p) => ({ who: p.slug }));
}

export default async function DemoScreen({ params }: { params: Promise<{ who: string }> }) {
  const { who } = await params;

  let screen: React.ReactNode;
  if (who === "parent") {
    const d = getDemoParent();
    screen = <ParentToday {...d} demo />;
  } else if (who === "jobs") {
    screen = <ParentJobs initialJobs={getDemoJobs()} demo />;
  } else if (who === "insights") {
    screen = <ParentInsights {...getDemoInsights()} demo />;
  } else {
    const kid = getDemoKid(who);
    if (!kid) notFound();
    screen = <KidHome {...kid} demo />;
  }

  return (
    <div>
      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 20,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          padding: "10px 16px",
          background: "var(--ink)",
          color: "#fff",
          fontSize: 13,
        }}
      >
        <Link href="/demo" style={{ color: "rgba(255,255,255,.85)", textDecoration: "none", fontWeight: 600 }}>
          ← All screens
        </Link>
        <span style={{ color: "rgba(255,255,255,.55)", fontSize: 11, letterSpacing: ".08em", textTransform: "uppercase", fontWeight: 700 }}>
          Live demo
        </span>
        <Link href="/log-in" style={{ color: "#fff", textDecoration: "none", fontWeight: 650 }}>
          Sign in →
        </Link>
      </div>
      {screen}
    </div>
  );
}
