"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function Unlock({ priceLabel, ready }: { priceLabel: string; ready: boolean }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function signOut() {
    await createClient().auth.signOut();
    window.location.href = "/log-in";
  }

  async function buy() {
    setBusy(true);
    setError(null);
    const res = await fetch("/api/checkout", { method: "POST" });
    const data = await res.json().catch(() => null);
    if (res.ok && data?.url) {
      window.location.href = data.url; // off to Stripe's payment page
      return;
    }
    setBusy(false);
    setError(data?.error ?? "Something went wrong. Please try again.");
  }

  return (
    <div className="appshell app-fullwidth">
      <div className="phone" style={{ height: 760 }}>
        <div className="screen">
          <div className="scroll" style={{ display: "flex", flexDirection: "column", justifyContent: "center", textAlign: "center", gap: 14, minHeight: "70dvh" }}>
            <div style={{ fontSize: 40 }}>🫐</div>
            <h2 className="h2" style={{ fontSize: 26, margin: "0 auto" }}>
              Unlock Bramble
            </h2>
            <p style={{ fontSize: 14, color: "var(--ink-2)", lineHeight: 1.6, maxWidth: 380, margin: "0 auto" }}>
              One payment, once — then your whole family has Bramble for good. No
              subscription, nothing recurring.
            </p>

            {ready ? (
              <>
                <div style={{ fontFamily: "'Bricolage Grotesque'", fontWeight: 700, fontSize: 34, margin: "6px 0" }}>
                  {priceLabel}
                  <span style={{ fontSize: 13, fontWeight: 500, color: "var(--ink-3)" }}> · one-off</span>
                </div>
                <button className="loginbtn" style={{ maxWidth: 320, margin: "0 auto", width: "100%" }} onClick={buy} disabled={busy}>
                  {busy ? "Taking you to checkout…" : "Unlock for the family"}
                </button>
                <p style={{ fontSize: 11.5, color: "var(--ink-3)", margin: "2px auto 0" }}>
                  Secure payment by Stripe. Card details never touch Bramble.
                </p>
              </>
            ) : (
              <p style={{ fontSize: 13, color: "var(--berry)", maxWidth: 360, margin: "0 auto" }}>
                Payments aren&apos;t switched on yet. Add the Stripe keys and price to finish setup.
              </p>
            )}

            {error && <p style={{ fontSize: 12.5, color: "var(--berry)" }}>{error}</p>}

            <button
              onClick={signOut}
              style={{ background: "none", border: 0, color: "var(--ink-3)", fontSize: 12, cursor: "pointer", marginTop: 6, textDecoration: "underline" }}
            >
              Not you? Sign out
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
