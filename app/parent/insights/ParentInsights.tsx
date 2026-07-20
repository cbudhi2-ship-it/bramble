export interface Insight {
  id: string;
  name: string;
  colour: string;
  dealt: number;
  didOnTime: number;
  lapsed: number;
  grabbed: number;
  consistencyPct: number | null;
}

interface Props {
  insights: Insight[];
  days: number;
  demo?: boolean;
  basePocketMoneyPence?: number;
}

/**
 * Presentational insights panel (no interactivity, so it renders on the server
 * and in the demo alike). Shows, per child, whether they clear their own dealt
 * jobs or leave them to become paid bonuses, plus opportunistic paid work.
 */
export default function ParentInsights({ insights, days, demo = false }: Props) {
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
                  <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 10 }}>
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
                  </div>

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
