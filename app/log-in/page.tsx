"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LogIn() {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [signedIn, setSignedIn] = useState(false);
  const [busy, setBusy] = useState(false);

  async function signIn(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) return setError(error.message);
    setSignedIn(true);
  }

  async function handOver() {
    setBusy(true);
    const res = await fetch("/api/parent/handover", { method: "POST" });
    setBusy(false);
    if (res.ok) router.push("/kid");
    else setError("Could not hand over — try signing in again.");
  }

  return (
    <div className="appshell">
      <div className="phone">
        <div className="screen">
          <div className="statusbar">
            <span>9:41</span>
            <span>▮▮▮</span>
          </div>
          <div className="login">
            <div className="logo" style={{ marginBottom: 6 }}>
              <svg width="24" height="24" viewBox="0 0 100 100" fill="none" aria-hidden="true">
                <ellipse cx="66" cy="24" rx="12" ry="7" fill="#3F7A54" transform="rotate(-26 66 24)" />
                <path d="M57 30 C53 37 51 43 51 48" stroke="#3F7A54" strokeWidth="4.5" strokeLinecap="round" fill="none" />
                <circle cx="37" cy="54" r="17" fill="#6B2456" />
                <circle cx="63" cy="52" r="15" fill="#9B3F7E" />
                <circle cx="50" cy="74" r="16" fill="#6B2456" />
              </svg>
              Bramble
            </div>
            <h3>Welcome back</h3>
            <p className="s">Signed in as a grown-up.</p>

            {!signedIn ? (
              <form onSubmit={signIn}>
                <div className="field">
                  <label>Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                  />
                </div>
                <div className="field" style={{ marginTop: 12 }}>
                  <label>Password</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                  />
                </div>
                {error && (
                  <p style={{ color: "var(--berry)", fontSize: 12, marginTop: 8 }}>{error}</p>
                )}
                <button className="loginbtn" disabled={busy}>
                  {busy ? "…" : "Sign in"}
                </button>
              </form>
            ) : (
              <>
                <p style={{ fontSize: 13, color: "var(--leaf)", fontWeight: 650 }}>
                  ✓ Signed in.
                </p>
                <a className="loginbtn" href="/parent" style={{ textAlign: "center", display: "block", textDecoration: "none" }}>
                  Go to Parent Mode
                </a>
              </>
            )}

            <div className="handover">
              <button onClick={handOver} disabled={!signedIn || busy}>
                👋 Hand the phone over
              </button>
              <p className="lockstate">
                Puts Bramble into Kid Mode. Coming back needs your PIN or your face.
              </p>
              <p className="lockstate" style={{ marginTop: 12 }}>
                Just looking?{" "}
                <a href="/demo" style={{ color: "var(--berry)", fontWeight: 650 }}>
                  Take a live tour
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
