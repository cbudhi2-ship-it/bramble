"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { MealDay } from "@/lib/meals";

interface Child {
  id: string;
  name: string;
  colour: string;
  foods: string[];
}
interface Props {
  ideas: string[];
  children: Child[];
  plan: MealDay[] | null;
  weekLabel: string;
  demo?: boolean;
  demoSamples?: MealDay[][];
}

const IDEA_SLOTS = 6;

export default function MealsManager({
  ideas,
  children,
  plan,
  weekLabel,
  demo = false,
  demoSamples = [],
}: Props) {
  const router = useRouter();
  const [ideaList, setIdeaList] = useState<string[]>(() => {
    const a = [...ideas];
    while (a.length < IDEA_SLOTS) a.push("");
    return a.slice(0, IDEA_SLOTS);
  });
  const [curPlan, setCurPlan] = useState<MealDay[] | null>(plan);
  const [busy, setBusy] = useState(false);
  const [tip, setTip] = useState<string | null>(null);
  const [demoNonce, setDemoNonce] = useState(0);

  function flash(m: string) {
    setTip(m);
    setTimeout(() => setTip(null), 2600);
  }

  const hasInput =
    ideaList.some((i) => i.trim()) || children.some((c) => c.foods.some((f) => f.trim()));

  async function saveIdeas() {
    const clean = ideaList.map((i) => i.trim()).filter(Boolean);
    if (demo) return flash("Demo — sign in to save your ideas.");
    setBusy(true);
    const res = await fetch("/api/parent/meal-ideas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ideas: clean }),
    });
    setBusy(false);
    flash(res.ok ? "Ideas saved." : "Couldn't save.");
    if (res.ok) router.refresh();
  }

  async function generate() {
    if (!hasInput) return flash("Add some foods or ideas first.");
    if (demo) {
      if (demoSamples.length) {
        setCurPlan(demoSamples[demoNonce % demoSamples.length]);
        setDemoNonce((n) => n + 1);
      }
      flash("A sample week — sign in to cook up your own.");
      return;
    }
    setBusy(true);
    const res = await fetch("/api/parent/meal-plan", { method: "POST" });
    const data = await res.json().catch(() => null);
    setBusy(false);
    if (res.ok && data?.plan) {
      setCurPlan(data.plan);
      flash(data.ai ? "Fresh recipes, made for your family." : "Week planned.");
    } else {
      flash(data?.error ?? "Couldn't make a plan.");
    }
  }

  const slot = (label: string, meal: MealDay["lunch"]) => (
    <div style={{ marginBottom: 6 }}>
      <div style={{ display: "flex", gap: 8, alignItems: "baseline" }}>
        <span style={{ fontSize: 11, color: "var(--ink-3)", width: 52, flex: "none" }}>{label}</span>
        <span style={{ fontSize: 13.5, color: "var(--ink)", fontWeight: 600 }}>
          {meal.name || "—"}
        </span>
      </div>
      {meal.recipe && (
        <p style={{ fontSize: 12, color: "var(--ink-2)", lineHeight: 1.5, margin: "3px 0 0 60px" }}>
          {meal.recipe}
        </p>
      )}
    </div>
  );

  return (
    <div className={`appshell${demo ? "" : " app-fullwidth"}`}>
      <div className="phone" style={{ height: 760 }}>
        <div className="screen">
          <div className="statusbar">
            <span>Parent Mode</span>
            <span>Meals</span>
          </div>
          {tip && (
            <div style={{ position: "absolute", left: 16, right: 16, bottom: 16, background: "var(--ink)", color: "#fff", fontSize: 12, textAlign: "center", padding: "10px 12px", borderRadius: 10, zIndex: 5 }}>
              {tip}
            </div>
          )}
          <div className="scroll">
            <div className="appbar">
              <h4>Meals</h4>
              <a href={demo ? "/demo" : "/parent"} className="pill" style={{ background: "var(--paper-2)", color: "var(--ink-2)", textDecoration: "none" }}>
                {demo ? "All screens" : "← Today"}
              </a>
            </div>

            <p style={{ fontSize: 12.5, color: "var(--ink-2)", lineHeight: 1.55, marginBottom: 14 }}>
              New recipes for the week, dreamt up from what everyone loves — so no
              one&apos;s dish gets picked and the rest wait. Make it once and it&apos;s set.
            </p>

            <button
              className="loginbtn"
              style={{ marginTop: 0, width: "100%" }}
              onClick={generate}
              disabled={busy || !hasInput}
            >
              {busy ? "Cooking up a week…" : curPlan ? "↻ Give us a fresh week" : "🍽️ Give us a week's meal planner"}
            </button>

            {curPlan && (
              <>
                <div className="grouphead" style={{ marginTop: 18 }}>
                  {weekLabel}
                </div>
                {curPlan.map((d) => (
                  <div
                    key={d.day}
                    style={{ background: "var(--paper)", borderRadius: 12, padding: "11px 13px", marginBottom: 8 }}
                  >
                    <div style={{ fontFamily: "'Bricolage Grotesque'", fontWeight: 700, fontSize: 13.5, marginBottom: 6 }}>
                      {d.day}
                    </div>
                    {slot("🥪 Lunch", d.lunch)}
                    {slot("🍽️ Dinner", d.dinner)}
                  </div>
                ))}
              </>
            )}

            {/* grown-ups' ideas */}
            <div className="grouphead" style={{ marginTop: 20 }}>
              Your meal ideas · up to 6
            </div>
            <div style={{ display: "grid", gap: 7 }}>
              {ideaList.map((val, i) => (
                <input
                  key={i}
                  value={val}
                  placeholder={`Idea ${i + 1} — e.g. spaghetti bolognese`}
                  onChange={(e) =>
                    setIdeaList((l) => l.map((x, j) => (j === i ? e.target.value : x)))
                  }
                  style={{ width: "100%", font: "inherit", fontSize: 14, padding: "10px 12px", borderRadius: 10, border: "1px solid var(--paper-2)", background: "#fff", color: "var(--ink)" }}
                />
              ))}
            </div>
            <button
              className="loginbtn"
              style={{ marginTop: 10, width: "100%", background: "var(--ink-2)" }}
              onClick={saveIdeas}
              disabled={busy}
            >
              Save ideas
            </button>

            {/* what the children like */}
            <div className="grouphead" style={{ marginTop: 20 }}>
              What everyone likes
            </div>
            <p style={{ fontSize: 11.5, color: "var(--ink-3)", margin: "-4px 0 10px" }}>
              The children add their own 3 favourites in their space — you&apos;ll see them here.
            </p>
            {children.map((c) => (
              <div key={c.id} style={{ display: "flex", gap: 10, alignItems: "center", padding: "8px 2px", borderBottom: "1px solid var(--paper-2)" }}>
                <span className="ic" style={{ background: c.colour, color: "#fff" }}>
                  {c.name[0]}
                </span>
                <div style={{ flex: 1 }}>
                  <b style={{ fontSize: 13.5, fontFamily: "'Bricolage Grotesque'" }}>{c.name}</b>
                  <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginTop: 3 }}>
                    {c.foods.filter((f) => f.trim()).length === 0 ? (
                      <span style={{ fontSize: 12, color: "var(--ink-3)" }}>Nothing yet</span>
                    ) : (
                      c.foods
                        .filter((f) => f.trim())
                        .map((f, i) => (
                          <span key={i} style={{ fontSize: 11.5, background: "var(--paper-2)", color: "var(--ink-2)", padding: "3px 9px", borderRadius: 99 }}>
                            {f}
                          </span>
                        ))
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
