"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PICTURE_PIN_ANIMALS, PICTURE_PIN_LENGTH } from "@/lib/picture-pin";

interface KidMember {
  id: string;
  display_name: string;
  colour_hex: string;
  pin_type: "numeric" | "picture";
  mode: string;
}

export default function KidPicker() {
  const router = useRouter();
  const [members, setMembers] = useState<KidMember[] | null>(null);
  const [chosen, setChosen] = useState<KidMember | null>(null);
  const [digits, setDigits] = useState("");
  const [seq, setSeq] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/kid/members")
      .then((r) => (r.ok ? r.json() : Promise.reject(r)))
      .then((d) => setMembers(d.members))
      .catch(() => setMembers([]));
  }, []);

  async function attempt(payload: Record<string, unknown>) {
    setError(null);
    const res = await fetch("/api/kid/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ memberId: chosen!.id, ...payload }),
    });
    if (res.ok) {
      router.push("/kid/home");
    } else {
      setError("That wasn't quite right. Try again.");
      setDigits("");
      setSeq([]);
    }
  }

  function pressDigit(d: string) {
    if (digits.length >= 4) return;
    const next = digits + d;
    setDigits(next);
    if (next.length === 4) attempt({ pin: next });
  }

  function pressAnimal(key: string) {
    const next = [...seq, key];
    setSeq(next);
    if (next.length === PICTURE_PIN_LENGTH) attempt({ sequence: next });
  }

  // --- profile picker -----------------------------------------------------
  if (!chosen) {
    return (
      <div className="appshell app-fullwidth">
        <div className="phone">
          <div className="screen">
            <div className="statusbar">
              <span>9:41</span>
              <span>🔒 Kid Mode</span>
            </div>
            <div className="picker">
              <h3>Who&apos;s this?</h3>
              <p>Tap your face</p>
              {members === null ? (
                <p style={{ fontSize: 13, color: "var(--ink-3)" }}>…</p>
              ) : members.length === 0 ? (
                <div style={{ textAlign: "center" }}>
                  <p style={{ fontSize: 13, color: "var(--ink-3)" }}>
                    No children yet, or the phone hasn&apos;t been handed over. A grown-up signs in
                    and taps &quot;Hand the phone over&quot;.
                  </p>
                  <a
                    href="/demo"
                    style={{
                      display: "inline-block",
                      marginTop: 16,
                      fontSize: 13,
                      fontWeight: 650,
                      color: "var(--berry)",
                      textDecoration: "none",
                    }}
                  >
                    Just looking? Take a live tour →
                  </a>
                </div>
              ) : (
                <div className="avatars">
                  {members.map((m) => (
                    <button className="av" key={m.id} onClick={() => setChosen(m)}>
                      <i style={{ background: m.colour_hex }}>{m.display_name[0]}</i>
                      <b>{m.display_name}</b>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --- PIN entry ----------------------------------------------------------
  return (
    <div className="appshell app-fullwidth">
      <div className="phone">
        <div className="screen">
          <div className="statusbar">
            <span>9:41</span>
            <span>🔒 Kid Mode</span>
          </div>
          <div className="pinwrap">
            <i className="pinface" style={{ background: chosen.colour_hex }}>
              {chosen.display_name[0]}
            </i>
            <div className="pinname">Hello {chosen.display_name}</div>

            {chosen.pin_type === "numeric" ? (
              <>
                <div className="pindots">
                  {[0, 1, 2, 3].map((i) => (
                    <i key={i} className={i < digits.length ? "f" : ""} />
                  ))}
                </div>
                <div className="keys">
                  {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (
                    <button key={d} onClick={() => pressDigit(d)}>
                      {d}
                    </button>
                  ))}
                  <button style={{ visibility: "hidden" }} />
                  <button onClick={() => pressDigit("0")}>0</button>
                  <button style={{ fontSize: 15 }} onClick={() => setDigits(digits.slice(0, -1))}>
                    ⌫
                  </button>
                </div>
              </>
            ) : (
              <>
                <div style={{ fontSize: 12, color: "var(--ink-3)", marginTop: -10 }}>
                  Tap your three animals ({seq.length}/{PICTURE_PIN_LENGTH})
                </div>
                <div className="picpin">
                  {PICTURE_PIN_ANIMALS.map((a) => (
                    <button
                      key={a.key}
                      className={seq.includes(a.key) ? "sel" : ""}
                      onClick={() => pressAnimal(a.key)}
                    >
                      {a.emoji}
                    </button>
                  ))}
                </div>
              </>
            )}

            {error && <p style={{ color: "var(--berry)", fontSize: 12 }}>{error}</p>}
            <button
              onClick={() => {
                setChosen(null);
                setDigits("");
                setSeq([]);
                setError(null);
              }}
              style={{
                background: "none",
                border: 0,
                color: "var(--ink-3)",
                fontSize: 12,
                cursor: "pointer",
              }}
            >
              ← not me
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
