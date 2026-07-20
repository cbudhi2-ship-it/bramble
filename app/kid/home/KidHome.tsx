"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { formatPence } from "@/lib/money";

interface Job {
  id: string;
  status: string;
  is_bonus: boolean;
  award_pence: number | null;
  price_pence: number;
  kind: string;
  icon: string;
  title: string;
  framing_direct: string;
  framing_ambient: string;
}

interface Goal {
  title: string;
  target_pence: number;
}

interface Props {
  name: string;
  colour: string;
  mode: "low_demand" | "standard" | "young_visual";
  balancePence: number;
  goal: Goal | null;
  dealt: Job[];
  board: Job[];
  demo?: boolean;
}

const INACTIVITY_MS = 3 * 60 * 1000; // drop to picker after 3 min idle (spec §3.2)
const BACKGROUND_MS = 60 * 1000; // Away Lock after 60s backgrounded (spec §3.3)

function speak(text: string) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(new SpeechSynthesisUtterance(text));
}

function priceLabel(j: Job): string {
  const p = j.is_bonus ? j.award_pence ?? 0 : j.price_pence;
  return p > 0 ? formatPence(p) : "";
}

export default function KidHome({ name, colour, mode, balancePence, goal, dealt, board, demo = false }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [showBalance, setShowBalance] = useState(mode !== "low_demand");
  const [locked, setLocked] = useState(false);
  const [demoTip, setDemoTip] = useState(false);
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const endSession = useCallback(async () => {
    if (demo) return; // the demo never logs out or redirects
    await fetch("/api/kid/logout", { method: "POST" });
    router.push("/kid");
  }, [router, demo]);

  // --- inactivity → picker ------------------------------------------------
  const resetIdle = useCallback(() => {
    if (idleTimer.current) clearTimeout(idleTimer.current);
    idleTimer.current = setTimeout(endSession, INACTIVITY_MS);
  }, [endSession]);

  useEffect(() => {
    resetIdle();
    const evs = ["pointerdown", "keydown", "scroll"];
    evs.forEach((e) => window.addEventListener(e, resetIdle));
    return () => {
      evs.forEach((e) => window.removeEventListener(e, resetIdle));
      if (idleTimer.current) clearTimeout(idleTimer.current);
    };
  }, [resetIdle]);

  // --- backgrounded → Away Lock ------------------------------------------
  useEffect(() => {
    let bgTimer: ReturnType<typeof setTimeout> | null = null;
    function onVis() {
      if (document.visibilityState === "hidden") {
        bgTimer = setTimeout(() => setLocked(true), BACKGROUND_MS);
      } else if (bgTimer) {
        clearTimeout(bgTimer);
      }
    }
    document.addEventListener("visibilitychange", onVis);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      if (bgTimer) clearTimeout(bgTimer);
    };
  }, []);

  async function act(url: string, jobId: string) {
    if (demo) {
      setDemoTip(true);
      setTimeout(() => setDemoTip(false), 1800);
      return;
    }
    setBusy(jobId);
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jobInstanceId: jobId }),
    });
    setBusy(null);
    if (res.ok) router.refresh();
  }

  const light = `${colour}22`;
  const pct = goal ? Math.min(100, Math.round((balancePence / goal.target_pence) * 100)) : 0;

  // ---- Away Lock screen (read-only) -------------------------------------
  if (locked) {
    return (
      <div className="appshell">
        <div className="phone">
          <div className="screen">
            <div className="statusbar">
              <span>9:41</span>
              <span>🔒 Locked</span>
            </div>
            <div className="scroll" style={{ paddingTop: 12 }}>
              <div
                style={{
                  background: "var(--paper)",
                  border: "1px solid var(--line)",
                  borderRadius: 14,
                  padding: 16,
                  textAlign: "center",
                  marginBottom: 14,
                }}
              >
                <div style={{ fontSize: 26 }}>🔒</div>
                <div
                  style={{
                    fontFamily: "'Bricolage Grotesque'",
                    fontSize: 16,
                    fontWeight: 650,
                    margin: "5px 0 4px",
                  }}
                >
                  Bramble&apos;s having a rest
                </div>
                <div style={{ fontSize: 12, color: "var(--ink-3)", lineHeight: 1.5 }}>
                  Look at anything you like. Ticking jobs off needs a grown-up nearby.
                </div>
              </div>
              {goal && (
                <div className="goalcard" style={{ background: colour }}>
                  <div className="gl">Saving for</div>
                  <div className="gt">{goal.title}</div>
                  <div className="bar">
                    <i style={{ width: `${pct}%` }} />
                  </div>
                  <div className="gm">
                    <span>Still here when you&apos;re back</span>
                    <span>{pct}%</span>
                  </div>
                </div>
              )}
              <button
                className="loginbtn"
                style={{ marginTop: 10 }}
                onClick={() => setLocked(false)}
              >
                A grown-up&apos;s here
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const isYoung = mode === "young_visual";
  const isLow = mode === "low_demand";

  return (
    <div className="appshell">
      <div className="phone">
        <div className="screen">
          <div className="statusbar">
            <span>9:41</span>
            <span>▮▮▮</span>
          </div>
          {demoTip && (
            <div
              style={{
                position: "absolute",
                left: 16,
                right: 16,
                bottom: 16,
                background: "var(--ink)",
                color: "#fff",
                fontSize: 12,
                textAlign: "center",
                padding: "10px 12px",
                borderRadius: 10,
                zIndex: 5,
              }}
            >
              This is a demo — sign in to do it for real.
            </div>
          )}
          <div className="scroll">
            <div className="appbar">
              <h4 style={{ color: colour }}>{name}</h4>
              {isYoung ? (
                <button className="spk" onClick={() => speak(`Hello ${name}`)}>
                  🔊
                </button>
              ) : (
                <span className="pill" style={{ background: light, color: colour }}>
                  {isLow ? "Quiet mode" : "Here today"}
                </span>
              )}
            </div>

            {/* low-demand: downtime sits ABOVE the jobs */}
            {isLow && (
              <div className="downtime">
                <b>Your time</b>
                <span>Nothing&apos;s expected of you until teatime.</span>
              </div>
            )}

            {/* young/visual: token jar instead of money */}
            {isYoung ? (
              <div className="jar">
                <div className="jt">Your jar</div>
                <div className="tokens">
                  {Array.from({ length: 10 }).map((_, i) =>
                    i < Math.min(10, Math.floor(balancePence / 20)) ? "🟠" : "⚪"
                  )}
                </div>
                <div className="js">Tokens turn into pocket money on payday.</div>
              </div>
            ) : (
              goal && (
                <div className="goalcard" style={{ background: colour }}>
                  <div className="gl">Saving for</div>
                  <div className="gt">{goal.title}</div>
                  <div className="bar">
                    <i style={{ width: `${pct}%` }} />
                  </div>
                  <div className="gm">
                    {isLow ? (
                      <button
                        onClick={() => setShowBalance((s) => !s)}
                        style={{ background: "none", border: 0, color: "#fff", opacity: 0.8, fontSize: 11, cursor: "pointer" }}
                      >
                        {showBalance ? formatPence(balancePence) : "Tap to see the number"}
                      </button>
                    ) : (
                      <span>
                        {formatPence(balancePence)} of {formatPence(goal.target_pence)}
                      </span>
                    )}
                    <span>{pct}%</span>
                  </div>
                </div>
              )
            )}

            {/* dealt jobs */}
            {dealt.length > 0 && (
              <>
                <div className="grouphead">{isLow ? "How the house is" : "Dealt to you today"}</div>
                {dealt.map((j) =>
                  isLow ? (
                    <div className="ambient" key={j.id}>
                      <span className="ic">{j.icon}</span>
                      <div style={{ flex: 1 }}>
                        <b>{j.framing_ambient}</b>
                        {j.status === "submitted" ? (
                          <span>Waiting for a grown-up</span>
                        ) : (
                          <button
                            onClick={() => act("/api/kid/submit", j.id)}
                            disabled={busy === j.id}
                            style={{ background: "none", border: 0, color: "var(--kid-purple)", fontSize: 11, cursor: "pointer", padding: 0 }}
                          >
                            I did this
                          </button>
                        )}
                      </div>
                    </div>
                  ) : isYoung ? (
                    <div className="bigjob" key={j.id}>
                      <span className="ic">{j.icon}</span>
                      <b>{j.title}</b>
                      <button className="spk" onClick={() => speak(j.title)}>
                        🔊
                      </button>
                      {j.status !== "submitted" && (
                        <button
                          className="go"
                          style={{ background: colour, color: "#fff" }}
                          onClick={() => act("/api/kid/submit", j.id)}
                          disabled={busy === j.id}
                        >
                          Done
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="jobrow" key={j.id}>
                      <span className="ic">{j.icon}</span>
                      <div className="tx">
                        <b>{j.framing_direct}</b>
                        <span>{j.status === "submitted" ? "Waiting for a grown-up" : "By 6pm"}</span>
                      </div>
                      {j.status !== "submitted" && (
                        <button
                          className="go"
                          style={{ background: colour, color: "#fff" }}
                          onClick={() => act("/api/kid/submit", j.id)}
                          disabled={busy === j.id}
                        >
                          Done
                        </button>
                      )}
                    </div>
                  )
                )}
              </>
            )}

            {/* the public paid board */}
            {board.length > 0 && (
              <>
                <div className="grouphead">
                  {isYoung ? "Extra jobs" : "Jobs with money on them"}
                </div>
                {board.map((j) => {
                  const bonus = j.is_bonus;
                  return isYoung ? (
                    <div className="bigjob" key={j.id} style={{ borderColor: colour }}>
                      <span className="ic">{j.icon}</span>
                      <b>{j.title}</b>
                      <button className="spk" onClick={() => speak(j.title)}>
                        🔊
                      </button>
                    </div>
                  ) : (
                    <div
                      className="jobrow"
                      key={j.id}
                      style={bonus ? { borderColor: "var(--sun)", background: "var(--sun-2)" } : undefined}
                    >
                      <span className="ic" style={bonus ? { background: "#fff" } : undefined}>
                        {bonus ? "⚡" : j.icon}
                      </span>
                      <div className="tx">
                        <b>{isLow ? j.title : `${j.title}${bonus ? " — bonus" : ""}`}</b>
                        <span>
                          {priceLabel(j)}
                          {bonus ? " · nobody did it by six" : " · anyone"}
                        </span>
                      </div>
                      <button
                        className="go"
                        style={bonus ? { background: "var(--sun)", color: "#fff" } : { background: light, color: colour }}
                        onClick={() => act("/api/kid/claim", j.id)}
                        disabled={busy === j.id}
                      >
                        {isLow ? "I'll do it" : bonus ? "Grab it" : "Claim"}
                      </button>
                    </div>
                  );
                })}
              </>
            )}

            {dealt.length === 0 && board.length === 0 && (
              <p style={{ fontSize: 13, color: "var(--ink-3)", textAlign: "center", marginTop: 24 }}>
                Nothing on today. The six o&apos;clock deal fills this in each morning.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
