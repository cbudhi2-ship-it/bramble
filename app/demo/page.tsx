/**
 * /demo — a signed-out visitor can click through the real screens with a
 * fictional family (no Supabase session needed). Pick a person, see their live
 * screen. The screens are the actual KidHome / ParentToday components running
 * in demo mode, so this is a true preview, not a mockup.
 */
import Link from "next/link";
import { DEMO_PEOPLE } from "@/lib/demo-data";

export const metadata = { title: "Bramble — take a tour" };

export default function DemoHub() {
  return (
    <div className="wrap" style={{ paddingTop: 48, paddingBottom: 64, maxWidth: 720 }}>
      <a href="/" className="logo" style={{ textDecoration: "none", marginBottom: 30 }}>
        <svg width="26" height="26" viewBox="0 0 100 100" fill="none" aria-hidden="true">
          <ellipse cx="66" cy="24" rx="12" ry="7" fill="#3F7A54" transform="rotate(-26 66 24)" />
          <path d="M57 30 C53 37 51 43 51 48" stroke="#3F7A54" strokeWidth="4.5" strokeLinecap="round" fill="none" />
          <circle cx="37" cy="54" r="17" fill="#6B2456" />
          <circle cx="63" cy="52" r="15" fill="#9B3F7E" />
          <circle cx="50" cy="74" r="16" fill="#6B2456" />
        </svg>
        Bramble
      </a>
      <p className="eyebrow">A live tour</p>
      <h1 className="h2" style={{ fontSize: "clamp(28px,4vw,40px)" }}>
        See it through everyone&apos;s eyes.
      </h1>
      <p className="sub" style={{ marginBottom: 8 }}>
        The same Tuesday, seen five ways by the children and one way by the grown-ups. Tap anyone to
        open their real screen — it&apos;s the actual app, filled with a made-up family.
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: 14,
          marginTop: 32,
        }}
      >
        {DEMO_PEOPLE.map((p) => (
          <Link
            key={p.slug}
            href={`/demo/${p.slug}`}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 13,
              background: "var(--card)",
              border: "1px solid var(--line)",
              borderRadius: 14,
              padding: "16px 18px",
              textDecoration: "none",
              color: "var(--ink)",
            }}
          >
            <span
              style={{
                width: 46,
                height: 46,
                borderRadius: "50%",
                background: p.colour,
                color: "#fff",
                display: "grid",
                placeItems: "center",
                fontFamily: "'Bricolage Grotesque'",
                fontWeight: 700,
                fontSize: 18,
                flex: "none",
              }}
            >
              {p.kind === "parent" ? "✦" : p.name[0]}
            </span>
            <span style={{ minWidth: 0 }}>
              <b style={{ fontFamily: "'Bricolage Grotesque'", fontSize: 16, display: "block" }}>
                {p.name}
              </b>
              <span style={{ fontSize: 12.5, color: "var(--ink-3)" }}>{p.tag}</span>
            </span>
          </Link>
        ))}
      </div>

      <p className="micro" style={{ marginTop: 26 }}>
        Fictional example family — no real children&apos;s data. Ready for the real thing?{" "}
        <Link href="/log-in" style={{ color: "var(--berry)", fontWeight: 650 }}>
          Sign in
        </Link>
        .
      </p>
    </div>
  );
}
