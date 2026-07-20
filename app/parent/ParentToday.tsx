"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatPence } from "@/lib/money";

interface Member {
  id: string;
  name: string;
  colour: string;
}
interface Job {
  id: string;
  status: string;
  title: string;
  icon: string;
  kind: string;
  price_pence: number;
  fallback_pence: number;
  is_bonus: boolean;
  parent_note: string | null;
  whoName: string | null; // null = on the board, nobody's taken it
  whoColour: string;
}
interface Undistributed {
  id: string;
  title: string;
  icon: string;
  fallback_pence: number;
}
interface ParentTask {
  id: string;
  title: string;
  done: boolean;
}
interface Props {
  loadState: "normal" | "stretched" | "survival";
  members: Member[];
  jobs: Job[];
  undistributed?: Undistributed[];
  parentTasks?: ParentTask[];
  demo?: boolean;
}

const DIAL: { key: Props["loadState"]; label: string }[] = [
  { key: "normal", label: "Normal" },
  { key: "stretched", label: "Stretched" },
  { key: "survival", label: "Survival" },
];

export default function ParentToday({
  loadState,
  members,
  jobs,
  undistributed = [],
  parentTasks = [],
  demo = false,
}: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [load, setLoad] = useState(loadState);
  const [thanksFor, setThanksFor] = useState<Member | null>(null);
  const [amount, setAmount] = useState("50");
  const [note, setNote] = useState("");
  const [demoTip, setDemoTip] = useState(false);
  const [tasks, setTasks] = useState<ParentTask[]>(parentTasks);
  const [newTask, setNewTask] = useState("");

  async function addTask() {
    const title = newTask.trim();
    if (!title) return;
    if (demo) {
      setTasks((t) => [{ id: `demo-${Date.now()}`, title, done: false }, ...t]);
      setNewTask("");
      return tip();
    }
    setNewTask("");
    const res = await fetch("/api/parent/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
    });
    if (res.ok) {
      const { task } = await res.json();
      setTasks((t) => [task, ...t]);
    }
  }

  async function completeTask(id: string) {
    setTasks((t) => t.filter((x) => x.id !== id));
    if (demo) return;
    await fetch(`/api/parent/tasks/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ done: true }),
    });
  }

  function tip() {
    setDemoTip(true);
    setTimeout(() => setDemoTip(false), 1800);
  }

  async function review1(jobInstanceId: string, action: string, percent?: number) {
    if (demo) return tip();
    setBusy(true);
    await fetch("/api/parent/review", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jobInstanceId, action, percent }),
    });
    setBusy(false);
    router.refresh();
  }

  async function setDial(next: Props["loadState"]) {
    setLoad(next); // the dial visual still moves in the demo
    if (demo) return;
    await fetch("/api/parent/load-state", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ loadState: next }),
    });
  }

  async function dealToday() {
    if (demo) return tip();
    setBusy(true);
    await fetch("/api/parent/deal-today", { method: "POST" });
    setBusy(false);
    router.refresh();
  }

  async function sendThanks() {
    if (!thanksFor) return;
    if (demo) {
      setThanksFor(null);
      return tip();
    }
    setBusy(true);
    await fetch("/api/parent/spontaneous", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ memberId: thanksFor.id, pence: Math.round(Number(amount)), note }),
    });
    setBusy(false);
    setThanksFor(null);
    setNote("");
    setAmount("50");
    router.refresh();
  }

  // group the day (spec §9 "Today"): what needs you, whose job is outstanding,
  // what's on the board for anyone, and what's already done.
  const review = jobs.filter((j) => j.status === "submitted");
  const outstanding = jobs.filter((j) => j.status === "open" || j.status === "claimed");
  const stillToDo = outstanding.filter((j) => j.whoName); // someone owns it
  const board = outstanding.filter((j) => !j.whoName); // nobody's taken it
  const done = jobs.filter((j) => j.status === "approved" || j.status === "part_done");

  // calm end-of-day summary (spec §5.1: one line, never a notification)
  const outstandingN = stillToDo.length + board.length;
  const allClear = outstandingN === 0 && review.length === 0 && undistributed.length === 0;

  // onboarding / first-run state
  const noChildren = !demo && members.length === 0;
  const nothingDealt = !demo && members.length > 0 && jobs.length === 0;

  return (
    <div className={`appshell${demo ? "" : " app-fullwidth"}`}>
      <div className="phone" style={{ height: 720 }}>
        <div className="screen">
          <div className="statusbar">
            <span>18:12</span>
            <span>Parent Mode</span>
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
              <h4>Today</h4>
              <a href={demo ? "/demo" : "/kid"} className="pill" style={{ background: "var(--paper-2)", color: "var(--ink-2)", textDecoration: "none" }}>
                {demo ? "All screens" : "Hand over"}
              </a>
            </div>
            <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 12 }}>
              {!demo && (
                <a href="/parent/family" className="pill" style={{ background: "var(--paper-2)", color: "var(--ink-2)", textDecoration: "none", flex: "none" }}>
                  Family
                </a>
              )}
              <a href={demo ? "/demo/jobs" : "/parent/jobs"} className="pill" style={{ background: "var(--berry)", color: "#fff", textDecoration: "none", flex: "none" }}>
                + Jobs
              </a>
              <a href={demo ? "/demo/insights" : "/parent/insights"} className="pill" style={{ background: "var(--paper-2)", color: "var(--ink-2)", textDecoration: "none", flex: "none" }}>
                Insights
              </a>
            </div>

            {/* the dial */}
            <div style={{ background: "var(--paper)", borderRadius: 14, padding: 14, marginBottom: 14 }}>
              <div className="grouphead" style={{ margin: "0 0 10px" }}>
                How today&apos;s going
              </div>
              <div className="dial-track" style={{ background: "#fff" }}>
                {DIAL.map((d) => (
                  <button
                    key={d.key}
                    aria-current={load === d.key}
                    style={{ fontSize: 12 }}
                    onClick={() => setDial(d.key)}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>

            {/* onboarding — add children before anything can be dealt */}
            {noChildren && (
              <a
                href="/parent/family"
                style={{
                  display: "block",
                  background: "var(--berry)",
                  color: "#fff",
                  borderRadius: 12,
                  padding: "14px 16px",
                  marginBottom: 14,
                  textDecoration: "none",
                }}
              >
                <b style={{ fontFamily: "'Bricolage Grotesque'", fontSize: 16, display: "block" }}>
                  Add your children to get started →
                </b>
                <span style={{ fontSize: 12.5, opacity: 0.85 }}>
                  Then Bramble can deal the day&apos;s jobs to whoever&apos;s home.
                </span>
              </a>
            )}

            {/* nothing dealt yet today — deal on demand instead of waiting for 6am */}
            {nothingDealt && (
              <button className="loginbtn" style={{ marginBottom: 14 }} onClick={dealToday} disabled={busy}>
                {busy ? "…" : "Deal today's jobs now"}
              </button>
            )}

            {/* calm end-of-day summary — one line, no chasing */}
            {!noChildren && (
              <div
                style={{
                  background: allClear ? "var(--leaf-2)" : "var(--sun-2)",
                  border: `1px solid ${allClear ? "#C9E0D1" : "#EBD3A4"}`,
                  borderRadius: 12,
                  padding: "11px 13px",
                  marginBottom: 14,
                }}
              >
                <div style={{ fontSize: 13, fontWeight: 650, color: allClear ? "var(--leaf)" : "#8A5F14" }}>
                  {allClear
                    ? "Everything's sorted today. Nice."
                    : `${done.length} done · ${outstandingN} still out there${
                        undistributed.length ? ` · ${undistributed.length} on your list` : ""
                      }`}
                </div>
                {!allClear && (
                  <div style={{ fontSize: 11.5, color: "var(--ink-3)", marginTop: 3, lineHeight: 1.45 }}>
                    Anything undone becomes a paid bonus at 6pm — no need to chase. Unclaimed board
                    jobs just wait till tomorrow.
                  </div>
                )}
              </div>
            )}

            {/* waiting for you — the review queue */}
            <div className="grouphead">Waiting for you · {review.length}</div>
            {review.length === 0 && (
              <p style={{ fontSize: 12.5, color: "var(--ink-3)", marginBottom: 12 }}>
                Nothing to approve right now.
              </p>
            )}
            {review.map((j) => (
              <div className="review" key={j.id}>
                <div className="rh">
                  <i style={{ background: j.whoColour }}>{(j.whoName ?? "?")[0]}</i>
                  <b>{j.title}</b>
                  <span>{formatPence(j.price_pence)}</span>
                </div>
                {j.parent_note && (
                  <div style={{ fontSize: 11.5, color: "var(--ink-3)", margin: "-5px 0 10px 39px" }}>
                    {j.parent_note}
                  </div>
                )}
                <div className="acts">
                  <button className="yes" disabled={busy} onClick={() => review1(j.id, "approve")}>
                    ✓ Done
                  </button>
                  <button className="part" disabled={busy} onClick={() => review1(j.id, "part_done", 50)}>
                    ~ Part done
                  </button>
                  <button disabled={busy} onClick={() => review1(j.id, "not_yet")}>
                    ↻ Not yet
                  </button>
                </div>
              </div>
            ))}

            {/* still to do — someone's job, so you know not to do it yourself */}
            <div className="grouphead">Still to do · {stillToDo.length}</div>
            {stillToDo.length === 0 ? (
              <p style={{ fontSize: 12.5, color: "var(--ink-3)", marginBottom: 12 }}>
                Nothing outstanding that&apos;s been dealt out.
              </p>
            ) : (
              stillToDo.map((j) => (
                <div className="jobrow" key={j.id}>
                  <span className="ic">{j.icon}</span>
                  <div className="tx">
                    <b>{j.title}</b>
                    <span>
                      <b style={{ color: j.whoColour, fontWeight: 700 }}>{j.whoName}&apos;s job</b>
                      {!j.is_bonus && j.fallback_pence > 0
                        ? ` · ${formatPence(j.fallback_pence)} bonus at 6pm if not done`
                        : ""}
                    </span>
                  </div>
                </div>
              ))
            )}

            {/* on the board — not assigned to anyone, up for grabs */}
            {board.length > 0 && (
              <>
                <div className="grouphead">On the board · anyone can grab · {board.length}</div>
                {board.map((j) => (
                  <div
                    className="jobrow"
                    key={j.id}
                    style={j.is_bonus ? { borderColor: "var(--sun)", background: "var(--sun-2)" } : undefined}
                  >
                    <span className="ic" style={j.is_bonus ? { background: "#fff" } : undefined}>
                      {j.is_bonus ? "⚡" : j.icon}
                    </span>
                    <div className="tx">
                      <b>{j.title}</b>
                      <span>
                        {formatPence(j.price_pence)}
                        {j.is_bonus ? " · nobody did it by 6pm" : " · anyone"}
                      </span>
                    </div>
                  </div>
                ))}
              </>
            )}

            {/* on your list — essential jobs nobody could be dealt */}
            {undistributed.length > 0 && (
              <>
                <div className="grouphead" style={{ color: "var(--berry)" }}>
                  On your list · {undistributed.length}
                </div>
                <p style={{ fontSize: 11.5, color: "var(--ink-3)", margin: "-4px 0 9px" }}>
                  Nobody at home could be dealt these today, so they&apos;re yours.
                </p>
                {undistributed.map((j) => (
                  <div className="jobrow" key={j.id} style={{ borderColor: "var(--berry-2)" }}>
                    <span className="ic">{j.icon}</span>
                    <div className="tx">
                      <b>{j.title}</b>
                      <span>Not distributed · you&apos;ve got it</span>
                    </div>
                  </div>
                ))}
              </>
            )}

            {/* the parent's own to-do — separate from the children's jobs */}
            <div className="grouphead">Your to-do · {tasks.length}</div>
            <div style={{ display: "flex", gap: 6, marginBottom: 9 }}>
              <input
                value={newTask}
                onChange={(e) => setNewTask(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") addTask();
                }}
                placeholder="Add something for you to do…"
                style={{
                  flex: 1,
                  font: "inherit",
                  fontSize: 13,
                  padding: "9px 11px",
                  border: "1.5px solid var(--line)",
                  borderRadius: 9,
                  background: "#fff",
                  color: "var(--ink)",
                  minWidth: 0,
                }}
              />
              <button
                onClick={addTask}
                className="go"
                style={{ background: "var(--berry)", color: "#fff", padding: "0 16px" }}
              >
                Add
              </button>
            </div>
            {tasks.map((t) => (
              <div className="jobrow" key={t.id}>
                <button
                  onClick={() => completeTask(t.id)}
                  aria-label={`Mark "${t.title}" done`}
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: "50%",
                    border: "2px solid var(--line)",
                    background: "#fff",
                    color: "var(--ink-3)",
                    cursor: "pointer",
                    flex: "none",
                    fontSize: 13,
                  }}
                >
                  ✓
                </button>
                <div className="tx">
                  <b>{t.title}</b>
                </div>
              </div>
            ))}

            {/* done today */}
            {done.length > 0 && (
              <>
                <div className="grouphead">Done today · {done.length}</div>
                {done.map((j) => (
                  <div className="jobrow" key={j.id} style={{ opacity: 0.6 }}>
                    <span className="ic">{j.icon}</span>
                    <div className="tx">
                      <b>{j.title}</b>
                      <span>{j.whoName ?? "—"}</span>
                    </div>
                    <span style={{ color: "var(--leaf)", fontSize: 14 }}>✓</span>
                  </div>
                ))}
              </>
            )}

            {/* spontaneous recognition */}
            <div className="grouphead">Noticed something?</div>
            {!thanksFor && (
              <div
                className="ambient"
                style={{ borderStyle: "solid", background: "#fff", borderColor: "var(--berry-2)" }}
              >
                <span className="ic">✨</span>
                <div style={{ flex: 1 }}>
                  <b>Say thanks with money</b>
                  <span>Anyone. Any amount. For something they just did.</span>
                </div>
              </div>
            )}
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
              {members.map((m) => (
                <button
                  key={m.id}
                  onClick={() => setThanksFor(m)}
                  className="pill"
                  style={{
                    background: thanksFor?.id === m.id ? m.colour : "var(--paper-2)",
                    color: thanksFor?.id === m.id ? "#fff" : "var(--ink-2)",
                    border: 0,
                    cursor: "pointer",
                    padding: "6px 12px",
                  }}
                >
                  {m.name}
                </button>
              ))}
            </div>
            {thanksFor && (
              <div style={{ marginTop: 10 }}>
                <div className="field">
                  <label>Amount (pence)</label>
                  <input value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="numeric" />
                </div>
                <div className="field" style={{ marginTop: 8 }}>
                  <label>What for</label>
                  <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Fed the cat without being asked" />
                </div>
                <button className="loginbtn" disabled={busy} onClick={sendThanks}>
                  Send {formatPence(Math.round(Number(amount)) || 0)} to {thanksFor.name}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
