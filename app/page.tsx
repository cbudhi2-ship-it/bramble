"use client";

import { useEffect, useState } from "react";

// Bramble mark — "The Sprig" (simplified variant, matches public/favicon.svg)
const BrambleLogo = ({ size = 26 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 100 100" fill="none" aria-hidden="true">
    <ellipse cx="66" cy="24" rx="12" ry="7" fill="#3F7A54" transform="rotate(-26 66 24)" />
    <path d="M57 30 C53 37 51 43 51 48" stroke="#3F7A54" strokeWidth="4.5" strokeLinecap="round" fill="none" />
    <circle cx="37" cy="54" r="17" fill="#6B2456" />
    <circle cx="63" cy="52" r="15" fill="#9B3F7E" />
    <circle cx="50" cy="74" r="16" fill="#6B2456" />
  </svg>
);

const JOBCARDS = [
  { x: "-108px", y: "120px", r: "-7deg", d: ".05s", e: "🍽️", t: "Dishwasher" },
  { x: "-54px", y: "128px", r: "4deg", d: ".15s", e: "🐈", t: "Cat food" },
  { x: "0px", y: "122px", r: "-3deg", d: ".25s", e: "🗑️", t: "Bins" },
  { x: "54px", y: "128px", r: "6deg", d: ".35s", e: "🧺", t: "Washing" },
  { x: "108px", y: "120px", r: "-5deg", d: ".45s", e: "👟", t: "Shoes away" },
];

// Fictional example family — no real children's names on the public site.
const FACES = [
  { c: "var(--kid-purple)", l: "M", n: "Mabel" },
  { c: "var(--kid-orange)", l: "R", n: "Rowan" },
  { c: "var(--kid-teal)", l: "N", n: "Nell" },
  { c: "var(--kid-pink)", l: "P", n: "Posy" },
  { c: "var(--kid-green)", l: "B", n: "Bo" },
];

const DIAL = [
  {
    c: "#E6F0E9",
    t: "#3F7A54",
    n: "Normal",
    b: "Everything on.",
    p: "Full board, full rota, jobs dealt to all five. The extras are there, the life skills are there, the prices are normal.",
  },
  {
    c: "#FBEFD9",
    t: "#8A5F14",
    n: "Stretched",
    b: "Only the things that actually matter.",
    p: "Extras disappear. Just the jobs the house cannot skip. Mabel drops to one. Bonus prices go up, so anything undone gets hoovered faster. Nobody is told anything changed.",
  },
  {
    c: "#F7E7E6",
    t: "#C4453D",
    n: "Survival",
    b: "The house runs itself for a day.",
    p: "Nothing is dealt to Mabel or Rowan at all. Everything goes straight onto the board as paid work at raised prices. If Nell and Posy are here, they will clear it. If they are not, it waits — and that is fine.",
  },
];

export default function Landing() {
  const [run, setRun] = useState(false);
  const [clock, setClock] = useState("06:00");
  const [dial, setDial] = useState(0);
  const [price, setPrice] = useState<{ label: string; ready: boolean } | null>(null);

  useEffect(() => {
    fetch("/api/price")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setPrice(d))
      .catch(() => {});
  }, []);

  function runDeal() {
    setRun(false);
    setClock("05:59");
    setTimeout(() => {
      setClock("06:00");
      setRun(true);
    }, 420);
  }

  useEffect(() => {
    const t = setTimeout(runDeal, 500);
    return () => clearTimeout(t);
  }, []);

  const d = DIAL[dial];

  return (
    <div className="wrap">
      <div className="nav">
        <div className="logo">
          <BrambleLogo /> Bramble
        </div>
        <div className="navlinks">
          <a href="#how">How it works</a>
          <a href="#demand">Low-demand mode</a>
          <a href="/log-in">Sign in</a>
        </div>
      </div>

      {/* HERO */}
      <div className="hero">
        <div>
          <h1>
            The house asks.
            <br />
            <em>Not you.</em>
          </h1>
          <p className="lede">
            Bramble deals the day&apos;s jobs at six in the morning — randomly, evenly, to
            whoever&apos;s actually in the house. Nobody gets nagged. Nothing gets assigned by a
            parent. And when a job doesn&apos;t get done, it quietly turns into paid work somebody
            else can grab.
          </p>
          <div className="btnrow">
            <a className="btn btn-1" href="/demo">
              See a live demo
            </a>
            <a className="btn btn-2" href="/log-in">
              Sign in
            </a>
          </div>
          <p className="micro">Built by a parent of five, for a house with a PDA profile in it.</p>
        </div>

        <div className={`deal${run ? " run" : ""}`}>
          <button className="replay" onClick={runDeal}>
            Deal again
          </button>
          <div className="deal-top">Tuesday</div>
          <div className="clock">{clock}</div>
          <div className="deal-stage">
            {JOBCARDS.map((j) => (
              <div
                key={j.t}
                className="jobcard"
                style={
                  {
                    "--x": j.x,
                    "--y": j.y,
                    "--r": j.r,
                    transitionDelay: j.d,
                  } as React.CSSProperties
                }
              >
                <span>{j.e}</span>
                {j.t}
              </div>
            ))}
          </div>
          <div className="deal-cap">Dealt by the app. Not by a parent.</div>
          <div className="faces">
            {FACES.map((f) => (
              <div className="face" key={f.n}>
                <i style={{ background: f.c }}>{f.l}</i>
                <b>{f.n}</b>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* HOW */}
      <div className="sec" id="how">
        <p className="eyebrow">The problem with every other chore app</p>
        <h2 className="h2">They&apos;re built on streaks. A streak is a demand.</h2>
        <p className="sub">
          Points, badges, &quot;you&apos;re on a roll!&quot; — it works fine right up until
          you&apos;ve got a child who can&apos;t be told, or one who&apos;s only home every other
          weekend and gets punished by a counter they never had a chance to keep alive. Bramble
          throws all of it out.
        </p>
        <div className="grid3">
          <div className="tile">
            <h3>Jobs get dealt, not given</h3>
            <p>
              At six the app shuffles the day&apos;s essential jobs and deals them across whoever&apos;s
              home, evenly, by the same rule for everyone. No child was singled out. No parent asked.
              That is a completely different thing to be handed.
            </p>
          </div>
          <div className="tile">
            <h3>Undone jobs become paid work</h3>
            <p>
              Six in the evening and the dishwasher&apos;s still full? It leaves that child&apos;s
              list and lands on the paid board with a price on it. Someone else grabs it. The plates
              get done and nobody had a row.
            </p>
          </div>
          <div className="tile">
            <h3>You stop being the reminder</h3>
            <p>
              The kitchen tile sits green when it&apos;s sorted and turns amber when it isn&apos;t.
              That&apos;s the house asking, quietly, in the corner of a screen — instead of you
              asking, out loud, for the fourth time.
            </p>
          </div>
        </div>
      </div>

      {/* DEMAND */}
      <div className="sec" id="demand">
        <div className="split">
          <div>
            <p className="eyebrow">Low-demand mode</p>
            <h2 className="h2">Built around a child who can&apos;t be told.</h2>
            <p className="sub">
              If there&apos;s a PDA profile in your house, you already know what happens when an app
              cheerfully tells your child what to do. Low-demand mode changes the grammar of the
              whole thing: jobs are phrased as the state of the house, never as an instruction.{" "}
              <b>&quot;The dishwasher is full&quot;</b> — not &quot;Empty the dishwasher.&quot;
            </p>
            <p className="sub">
              No notifications. No badges. No red dots. No streak to break. Downtime sits at the top
              of the screen, not underneath as a reward for finishing. Her balance is there whenever
              she taps it — never announced, never waved at her.
            </p>
            <p className="sub">
              And she is never the single point of failure on anything. If she doesn&apos;t do it,
              the fallback catches it. Declining isn&apos;t an event. Nobody has to enforce anything.
            </p>
          </div>
          <div className="phone" style={{ height: 560 }}>
            <div className="screen">
              <div className="statusbar">
                <span>9:41</span>
                <span>▮▮▮</span>
              </div>
              <div className="scroll">
                <div className="appbar">
                  <h4 style={{ color: "var(--kid-purple)" }}>Mabel</h4>
                  <span className="pill" style={{ background: "#F0E9F7", color: "var(--kid-purple)" }}>
                    Quiet mode
                  </span>
                </div>
                <div className="downtime">
                  <b>Your time</b>
                  <span>Nothing&apos;s expected of you until teatime.</span>
                </div>
                <div className="goalcard" style={{ background: "var(--kid-purple)" }}>
                  <div className="gl">Saving for</div>
                  <div className="gt">Sylvanian caravan</div>
                  <div className="bar">
                    <i style={{ width: "64%" }} />
                  </div>
                  <div className="gm">
                    <span>Tap to see the number</span>
                    <span>64%</span>
                  </div>
                </div>
                <div className="grouphead">How the house is</div>
                <div className="ambient">
                  <span className="ic">🍽️</span>
                  <div>
                    <b>The dishwasher is full</b>
                    <span>Nobody&apos;s done it yet</span>
                  </div>
                </div>
                <div className="ambient">
                  <span className="ic">🐈</span>
                  <div>
                    <b>Nutmeg&apos;s bowl is empty</b>
                  </div>
                </div>
                <div className="grouphead">Jobs with money on them</div>
                <div className="jobrow">
                  <span className="ic">🧦</span>
                  <div className="tx">
                    <b>Match the socks</b>
                    <span>60p · anyone</span>
                  </div>
                  <button className="go" style={{ background: "#F0E9F7", color: "var(--kid-purple)" }}>
                    I&apos;ll do it
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* DIAL */}
      <div className="sec">
        <div className="split">
          <div>
            <p className="eyebrow">The dial</p>
            <h2 className="h2">Some days you haven&apos;t got it in you.</h2>
            <p className="sub">
              Illness, a bad night, a partner who needs more care than usual. One control reshapes
              the whole system, so the house keeps running on the days your capacity doesn&apos;t.
            </p>
            <p className="sub">Nobody gets told the dial moved. The day just quietly looks different.</p>
          </div>
          <div className="dial">
            <div className="dial-track">
              {DIAL.map((x, i) => (
                <button key={x.n} aria-current={dial === i} onClick={() => setDial(i)}>
                  {x.n}
                </button>
              ))}
            </div>
            <div className="dial-out">
              <span className="dial-chip" style={{ background: d.c, color: d.t }}>
                {d.n}
              </span>
              <br />
              <b>{d.b}</b> {d.p}
            </div>
          </div>
        </div>
      </div>

      {/* LITTLE STANDOFFS */}
      <div className="sec">
        <p className="eyebrow">The little standoffs</p>
        <h2 className="h2">The rows that were never really about chores.</h2>
        <p className="sub">
          A lot of the daily friction in a busy house has nothing to do with jobs at all. Bramble
          quietly settles a couple of the big ones before they even start.
        </p>
        <div className="split" style={{ alignItems: "stretch", gap: 20, marginTop: 44 }}>
          <div className="tile">
            <h3>🚗 Who sits in the front</h3>
            <p>
              Every trip used to open with the same argument. Now Bramble just decides — one child,
              or two if your car has room — picked at random each morning and settled for the whole
              day. It&apos;s the same rule for everyone, there&apos;s nothing to barter over, and
              it&apos;s sorted before anyone&apos;s even found their shoes.
            </p>
          </div>
          <div className="tile">
            <h3>🍽️ What&apos;s for tea</h3>
            <p>
              Everyone likes something different and someone always ends up disappointed. Each child
              adds three favourite foods, you add a few ideas, and Bramble dreams up a whole week of
              brand-new recipes that weave everyone&apos;s favourites together — so no single dish
              &quot;wins,&quot; nobody waits their turn, and you stop having to think of something
              that&apos;ll please the whole table.
            </p>
          </div>
        </div>
      </div>

      {/* NEVER */}
      <div className="sec">
        <p className="eyebrow">On principle</p>
        <h2 className="h2">What Bramble will never do.</h2>
        <div className="never">
          {[
            ["Streaks.", "They punish the child whose schedule isn't theirs to control."],
            ["Leaderboards.", "Nobody sees anybody else's money. Ever."],
            ["Notify a child.", "No badges, no red dots, nothing buzzing at a kid."],
            ["Say “you're behind.”", "That copy doesn't exist anywhere in the app."],
            ["Gate downtime.", "Rest you have to earn is just another demand."],
            ["Pay differently per child.", "Same job, same price. It's the constitutional bit."],
          ].map(([b, t]) => (
            <div key={b}>
              <span className="x">✕</span>
              <span className="t">
                <b>{b}</b> {t}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* PRICE */}
      <div className="sec price">
        <p className="eyebrow">Price</p>
        <h2 className="h2" style={{ margin: "0 auto" }}>
          Pay once. Keep it for good.
        </h2>
        <div className="pricecard">
          <div className="pricebig">
            {price?.ready ? price.label : "One payment"}
            <small> · one-off</small>
          </div>
          <ul className="plist">
            <li>One payment for the whole household — never a subscription</li>
            <li>Unlimited children, two grown-ups</li>
            <li>Low-demand mode for as many as need it</li>
            <li>Two-home schedules, holiday planning, the weekly meal planner</li>
            <li>The six o&apos;clock deal, the fallback board, the dial</li>
            <li>No child ever needs a device or an account</li>
          </ul>
          <a className="btn btn-1" href="/sign-up" style={{ width: "100%", textAlign: "center" }}>
            Get Bramble for the family
          </a>
          <p className="micro">
            One-off payment, no recurring charge. Your family&apos;s data is never sold, and
            there&apos;s nothing in here to advertise to.
          </p>
        </div>
      </div>

      <div className="foot">
        <span>Bramble · made in Cambridgeshire</span>
        <span>
          <a href="/privacy" style={{ color: "inherit" }}>Privacy</a>
          {" · "}
          <a href="/terms" style={{ color: "inherit" }}>Terms</a>
          {" · "}
          <a href="mailto:hello@familybramble.online" style={{ color: "inherit" }}>Contact</a>
        </span>
      </div>
    </div>
  );
}
