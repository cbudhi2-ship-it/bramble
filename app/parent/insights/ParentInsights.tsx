"use client";

import { useState } from "react";
import { formatPence } from "@/lib/money";

export interface TodayItem {
  title: string;
  icon: string;
  pence: number;
}

export interface Insight {
  id: string;
  name: string;
  colour: string;
  dealt: number;
  didOnTime: number;
  lapsed: number;
  grabbed: number;
  consistencyPct: number | null;
  today?: TodayItem[];
  todayPence?: number;
}

interface Props {
  insights: Insight[];
  days: number;
  demo?: boolean;
  basePocketMoneyPence?: number;
}

/**
 * Insights panel. Shows, per child, whether they clear their own dealt jobs or
 * leave them to become paid bonuses — and tap a child to reveal what they've
 * actually done and been paid for today.
 */
export default function ParentInsights({ insights, days, demo = false }: Props) {
  const [open, setOpen] = useState<string | null>(null);
  return (
    <div className={`appshell${demo ? "" : " app-fullwidth"}`}>
      <div className="phone" style={{ height: 720 }}>
        <div className="screen">
          <div className="statusbar">
            <span>18:12</span>
            <span>Parent Mode</span>
          </div>
          <div className="scroll">
            <div className="appbar">
              <h4>Insights</h4>
              <a
                href={demo ? "/demo/parent" : "/parent"}
                className="pill"
                style={{ background: "var(--paper-2)", color: "var(--ink-2)", textDecoration: "none" }}
              >
                ← Today
              </a>
            </div>

            <p style={{ fontSize: 12.5, color: "var(--ink-2)", marginBottom: 4, lineHeight: 1.5 }}>
              Last {days} days. Do they clear their own decks, or wait for jobs to become paid?
            </p>
            <p style={{ fontSize: 11, color: "var(--ink-3)", marginBottom: 16, lineHeight: 1.5 }}>
              The bar is jobs they were dealt and finished before 6pm. Everything is fair-of-process —
              this is for you, never shown to the children.
            </p>

            {insights.map((m) => {
              const pct = m.consistencyPct;
              return (
                <div
                  key={m.id}
                  style={{
                    border: "1px solid var(--line)",
                    borderRadius: 13,
                    padding: 13,
                    marginBottom: 9,
                    background: "#fff",
                  }}
                >
                  <button
                    onClick={() => setOpen(open === m.id ? null : m.id)}
                    style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 10, width: "100%", background: "none", border: 0, padding: 0, cursor: "pointer", fontFamily: "inherit", textAlign: "left" }}
                  >
                    <span
                      style={{
                        width: 30,
                        height: 30,
                        borderRadius: "50%",
                        background: m.colour,
                        color: "#fff",
                        display: "grid",
                        placeItems: "center",
                        fontFamily: "'Bricolage Grotesque'",
                        fontWeight: 700,
                        fontSize: 13,
                        flex: "none",
                      }}
                    >
                      {m.name[0]}
                    </span>
                    <b style={{ fontSize: 14, fontWeight: 650, flex: 1 }}>{m.name}</b>
                    {pct !== null && (
                      <span style={{ fontSize: 14, fontWeight: 700, color: m.colour }}>{pct}%</span>
                    )}
                    <span style={{ fontSize: 11, color: "var(--ink-3)", transform: open === m.id ? "rotate(90deg)" : "none", transition: "transform .15s" }} aria-hidden>
                      ›
                    </span>
                  </button>

                  {m.dealt === 0 ? (
                    <p style={{ fontSize: 12, color: "var(--ink-3)" }}>
                      No jobs dealt to them yet this week.
                    </p>
                  ) : (
                    <>
                      <div
                        style={{
                          height: 8,
                          background: "var(--paper-2)",
                          borderRadius: 99,
                          overflow: "hidden",
                        }}
                      >
                        <i
                          style={{
                            display: "block",
                            height: "100%",
                            width: `${pct}%`,
                            background: m.colour,
                            borderRadius: 99,
                          }}
                        />
                      </div>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          fontSize: 11,
                          color: "var(--ink-3)",
                          marginTop: 7,
                        }}
                      >
                        <span>
                          Cleared {m.didOnTime} of {m.dealt} dealt jobs
                        </span>
                        {m.lapsed > 0 && (
                          <span style={{ color: "var(--warning, #9C6B2E)" }}>
                            {m.lapsed} left to the board
                          </span>
                        )}
                      </div>
                    </>
                  )}

                  {m.grabbed > 0 && (
                    <div style={{ fontSize: 11, color: "var(--leaf)", marginTop: 7, fontWeight: 600 }}>
                      + grabbed {m.grabbed} paid {m.grabbed === 1 ? "job" : "jobs"} off the board
                    </div>
                  )}

                  {open === m.id && (
                    <div style={{ marginTop: 12, borderTop: "1px solid var(--paper-2)", paddingTop: 11 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
                        <span style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: ".04em", textTransform: "uppercase", color: "var(--ink-3)" }}>
                          Today
                        </span>
                        {(m.todayPence ?? 0) > 0 && (
                          <span style={{ fontSize: 13, fontWeight: 700, color: "var(--leaf)" }}>
                            {formatPence(m.todayPence ?? 0)} earned
                          </span>
                        )}
                      </div>
                      {(m.today ?? []).length === 0 ? (
                        <p style={{ fontSize: 12, color: "var(--ink-3)" }}>
                          Nothing done or paid yet today.
                        </p>
                      ) : (
                        (m.today ?? []).map((it, i) => (
                          <div key={i} style={{ display: "flex", alignItems: "center", gap: 9, padding: "6px 0", borderBottom: "1px solid var(--paper)" }}>
                            <span style={{ fontSize: 16, width: 22, textAlign: "center", flex: "none" }} aria-hidden>
                              {it.icon}
                            </span>
                            <span style={{ fontSize: 13, flex: 1 }}>{it.title}</span>
                            <span style={{ fontSize: 12.5, fontWeight: 700, color: it.pence > 0 ? "var(--leaf)" : "var(--ink-3)" }}>
                              {it.pence > 0 ? formatPence(it.pence) : "done"}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            <div className="note" style={{ marginTop: 16, fontSize: 12 }}>
              <b>Reading this fairly.</b> A low bar for a weekend child isn&apos;t unfairness — they
              were simply here fewer days. Compare like with like, and remember the point of the
              board is that undone work still gets done, by someone, for money.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
