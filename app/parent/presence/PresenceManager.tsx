"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Member {
  id: string;
  name: string;
  colour: string;
}
interface Override {
  id: string;
  member_id: string;
  date_from: string;
  date_to: string;
  present: boolean;
}
interface DayPreview {
  date: string;
  presentIds: string[];
}
interface Props {
  members: Member[];
  overrides: Override[];
  preview: DayPreview[];
  today: string;
}

function fmt(iso: string): string {
  const d = new Date(iso + "T00:00:00Z");
  return d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
}

export default function PresenceManager({ members, overrides, preview, today }: Props) {
  const router = useRouter();
  const byId: Record<string, Member> = {};
  for (const m of members) byId[m.id] = m;

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(today);
  const [busy, setBusy] = useState(false);
  const [tip, setTip] = useState<string | null>(null);

  function flash(m: string) {
    setTip(m);
    setTimeout(() => setTip(null), 2200);
  }
  function toggle(id: string) {
    setSelected((s) => {
      const n = new Set(s);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  }
  const allSelected = selected.size === members.length && members.length > 0;

  async function setRange(present: boolean) {
    if (selected.size === 0) return flash("Pick which children first.");
    setBusy(true);
    const res = await fetch("/api/parent/presence", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ memberIds: [...selected], date_from: from, date_to: to, present }),
    });
    setBusy(false);
    if (res.ok) {
      setSelected(new Set());
      flash(present ? "Marked here." : "Marked away.");
      router.refresh();
    } else {
      const { error } = await res.json().catch(() => ({ error: "Something went wrong" }));
      flash(error);
    }
  }

  async function removeOverride(id: string) {
    setBusy(true);
    await fetch(`/api/parent/presence/${id}`, { method: "DELETE" });
    setBusy(false);
    router.refresh();
  }

  const chip = (m: Member, on: boolean) => (
    <span
      key={m.id}
      title={m.name}
      style={{
        width: 26,
        height: 26,
        borderRadius: "50%",
        background: on ? m.colour : "transparent",
        border: on ? "0" : `2px dashed ${m.colour}55`,
        color: on ? "#fff" : "transparent",
        display: "grid",
        placeItems: "center",
        fontSize: 12,
        fontWeight: 700,
        fontFamily: "'Bricolage Grotesque'",
      }}
    >
      {m.name[0]}
    </span>
  );

  return (
    <div className="appshell app-fullwidth">
      <div className="phone" style={{ height: 760 }}>
        <div className="screen">
          <div className="statusbar">
            <span>Parent Mode</span>
            <span>Who&apos;s here</span>
          </div>
          {tip && (
            <div style={{ position: "absolute", left: 16, right: 16, bottom: 16, background: "var(--ink)", color: "#fff", fontSize: 12, textAlign: "center", padding: "10px 12px", borderRadius: 10, zIndex: 5 }}>
              {tip}
            </div>
          )}
          <div className="scroll">
            <div className="appbar">
              <h4>Who&apos;s here</h4>
              <a href="/parent" className="pill" style={{ background: "var(--paper-2)", color: "var(--ink-2)", textDecoration: "none" }}>
                ← Today
              </a>
            </div>

            <p style={{ fontSize: 12.5, color: "var(--ink-2)", lineHeight: 1.55, marginBottom: 14 }}>
              Everyone counts as home by default — so in the holidays there&apos;s nothing to do.
              Mark a child <b>away</b> for the days they&apos;re at their other home, so they don&apos;t
              get dealt jobs then.
            </p>

            {/* ---- set a range ---- */}
            <div className="miniform" style={{ background: "var(--paper)", borderRadius: 12, padding: "12px 14px 14px" }}>
              <label>Which children</label>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                <button
                  type="button"
                  onClick={() => setSelected(allSelected ? new Set() : new Set(members.map((m) => m.id)))}
                  className="pill"
                  style={{ border: 0, cursor: "pointer", padding: "7px 12px", background: allSelected ? "var(--ink)" : "var(--paper-2)", color: allSelected ? "#fff" : "var(--ink-2)" }}
                >
                  Everyone
                </button>
                {members.map((m) => {
                  const on = selected.has(m.id);
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => toggle(m.id)}
                      className="pill"
                      style={{ border: 0, cursor: "pointer", padding: "7px 12px", background: on ? m.colour : "var(--paper-2)", color: on ? "#fff" : "var(--ink-2)" }}
                    >
                      {m.name}
                    </button>
                  );
                })}
              </div>

              <div style={{ display: "flex", gap: 10 }}>
                <div style={{ flex: 1 }}>
                  <label>From</label>
                  <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
                </div>
                <div style={{ flex: 1 }}>
                  <label>To</label>
                  <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
                </div>
              </div>

              <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
                <button
                  className="loginbtn"
                  style={{ flex: 1, marginTop: 0, background: "var(--ink-2)" }}
                  onClick={() => setRange(false)}
                  disabled={busy}
                >
                  Away these days
                </button>
                <button
                  className="loginbtn"
                  style={{ flex: 1, marginTop: 0 }}
                  onClick={() => setRange(true)}
                  disabled={busy}
                >
                  Here these days
                </button>
              </div>
            </div>

            {/* ---- next two weeks ---- */}
            <div className="grouphead" style={{ marginTop: 20 }}>
              Next two weeks
            </div>
            {preview.map((d) => (
              <div
                key={d.date}
                style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 2px", borderBottom: "1px solid var(--paper-2)" }}
              >
                <span style={{ fontSize: 12.5, color: "var(--ink-2)", width: 92, flex: "none" }}>
                  {d.date === today ? "Today" : fmt(d.date)}
                </span>
                <div style={{ display: "flex", gap: 5, flexWrap: "wrap", flex: 1 }}>
                  {members.map((m) => chip(m, d.presentIds.includes(m.id)))}
                </div>
                <span style={{ fontSize: 11, color: "var(--ink-3)", flex: "none" }}>
                  {d.presentIds.length}/{members.length} here
                </span>
              </div>
            ))}

            {/* ---- scheduled changes ---- */}
            {overrides.length > 0 && (
              <>
                <div className="grouphead" style={{ marginTop: 18 }}>
                  Scheduled · {overrides.length}
                </div>
                {overrides.map((o) => (
                  <div className="jobrow" key={o.id}>
                    <span className="ic" style={{ background: byId[o.member_id]?.colour ?? "#999", color: "#fff" }}>
                      {byId[o.member_id]?.name[0] ?? "?"}
                    </span>
                    <div className="tx">
                      <b>{byId[o.member_id]?.name ?? "—"}</b>
                      <span>
                        {o.present ? "Here" : "Away"} · {fmt(o.date_from)}
                        {o.date_to !== o.date_from ? ` – ${fmt(o.date_to)}` : ""}
                      </span>
                    </div>
                    <button
                      className="go"
                      style={{ background: "var(--paper-2)", color: "var(--ink-2)" }}
                      onClick={() => removeOverride(o.id)}
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
