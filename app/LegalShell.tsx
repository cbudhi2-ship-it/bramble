/** Shared, readable page shell for the Privacy and Terms pages. */
import type { ReactNode } from "react";

const BrambleLogo = ({ size = 24 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 100 100" fill="none" aria-hidden="true">
    <ellipse cx="66" cy="24" rx="12" ry="7" fill="#3F7A54" transform="rotate(-26 66 24)" />
    <path d="M57 30 C53 37 51 43 51 48" stroke="#3F7A54" strokeWidth="4.5" strokeLinecap="round" fill="none" />
    <circle cx="37" cy="54" r="17" fill="#6B2456" />
    <circle cx="63" cy="52" r="15" fill="#9B3F7E" />
    <circle cx="50" cy="74" r="16" fill="#6B2456" />
  </svg>
);

export default function LegalShell({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: ReactNode;
}) {
  return (
    <div style={{ minHeight: "100dvh", background: "var(--paper)", padding: "clamp(28px, 6vw, 72px) 20px" }}>
      <article
        style={{
          maxWidth: 680,
          margin: "0 auto",
          background: "var(--card)",
          borderRadius: 20,
          padding: "clamp(24px, 5vw, 48px)",
          boxShadow: "0 1px 2px rgba(36,22,32,.05), 0 24px 60px -30px rgba(36,22,32,.28)",
          lineHeight: 1.62,
          color: "var(--ink-2)",
        }}
      >
        <a
          href="/"
          style={{ display: "inline-flex", alignItems: "center", gap: 8, textDecoration: "none", color: "var(--ink)", fontFamily: "'Bricolage Grotesque'", fontWeight: 700, fontSize: 18 }}
        >
          <BrambleLogo /> Bramble
        </a>
        <h1 style={{ fontFamily: "'Bricolage Grotesque'", fontSize: "clamp(28px, 5vw, 38px)", color: "var(--ink)", margin: "22px 0 4px" }}>
          {title}
        </h1>
        <p style={{ fontSize: 13, color: "var(--ink-3)", marginBottom: 22 }}>Last updated {updated}</p>

        <div className="legalbody">{children}</div>

        <p style={{ marginTop: 30, fontSize: 13 }}>
          <a href="/" style={{ color: "var(--berry)", fontWeight: 650 }}>
            ← Back to Bramble
          </a>
        </p>
      </article>

      <style>{`
        .legalbody h3 { font-family: 'Bricolage Grotesque'; color: var(--ink); font-size: 18px; margin: 26px 0 8px; }
        .legalbody p { margin: 0 0 12px; }
        .legalbody ul { margin: 0 0 12px; padding-left: 20px; }
        .legalbody li { margin: 0 0 8px; }
        .legalbody a { color: var(--berry); font-weight: 600; }
      `}</style>
    </div>
  );
}
