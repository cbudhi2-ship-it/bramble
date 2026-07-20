"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PICTURE_PIN_ANIMALS, PICTURE_PIN_LENGTH, emojiForAnimal } from "@/lib/picture-pin";

export interface ChildLite {
  id: string;
  display_name: string;
  colour_hex: string;
  mode: "low_demand" | "standard" | "young_visual";
  presence: "full_time" | "eow_and_holidays";
  pin_type: "numeric" | "picture";
}

const COLOURS = ["#7B4FA8", "#E07A2F", "#2E8B8B", "#D4568A", "#4A9E4A", "#6B2456"];
const MODE_LABEL: Record<ChildLite["mode"], string> = {
  low_demand: "Low-demand",
  standard: "Standard",
  young_visual: "Young / visual",
};

export default function FamilyManager({ initialChildren }: { initialChildren: ChildLite[] }) {
  const router = useRouter();
  const [children, setChildren] = useState(initialChildren);
  const [name, setName] = useState("");
  const [age, setAge] = useState("8");
  const [mode, setMode] = useState<ChildLite["mode"]>("standard");
  const [presence, setPresence] = useState<ChildLite["presence"]>("full_time");
  const [colour, setColour] = useState(COLOURS[0]);
  const [pinType, setPinType] = useState<"numeric" | "picture">("numeric");
  const [pin, setPin] = useState("");
  const [seq, setSeq] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [tip, setTip] = useState<string | null>(null);

  function flash(m: string) {
    setTip(m);
    setTimeout(() => setTip(null), 2000);
  }

  function toggleAnimal(key: string) {
    setSeq((s) => (s.includes(key) ? s.filter((x) => x !== key) : s.length < PICTURE_PIN_LENGTH ? [...s, key] : s));
  }

  async function add() {
    if (!name.trim()) return flash("Give the child a name.");
    if (pinType === "numeric" && !/^\d{4}$/.test(pin)) return flash("PIN must be 4 digits.");
    if (pinType === "picture" && seq.length !== PICTURE_PIN_LENGTH) return flash("Pick three animals in order.");

    setBusy(true);
    const res = await fetch("/api/parent/children", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        display_name: name.trim(),
        age: Number(age),
        mode,
        presence,
        colour_hex: colour,
        pin_type: pinType,
        pin: pinType === "numeric" ? pin : undefined,
        sequence: pinType === "picture" ? seq : undefined,
      }),
    });
    setBusy(false);
    if (res.ok) {
      const { child } = await res.json();
      setChildren((c) => [...c, child]);
      setName("");
      setPin("");
      setSeq([]);
      flash(`${child.display_name} added.`);
      router.refresh();
    } else {
      const { error } = await res.json().catch(() => ({ error: "Something went wrong" }));
      flash(error);
    }
  }

  async function remove(id: string) {
    setChildren((c) => c.filter((x) => x.id !== id));
    await fetch(`/api/parent/children/${id}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <div className="appshell">
      <div className="phone" style={{ height: 760 }}>
        <div className="screen">
          <div className="statusbar">
            <span>Parent Mode</span>
            <span>Family</span>
          </div>
          {tip && (
            <div style={{ position: "absolute", left: 16, right: 16, bottom: 16, background: "var(--ink)", color: "#fff", fontSize: 12, textAlign: "center", padding: "10px 12px", borderRadius: 10, zIndex: 5 }}>
              {tip}
            </div>
          )}
          <div className="scroll">
            <div className="appbar">
              <h4>Family</h4>
              <a href="/parent" className="pill" style={{ background: "var(--paper-2)", color: "var(--ink-2)", textDecoration: "none" }}>
                ← Today
              </a>
            </div>

            <div className="miniform">
              <label>Child&apos;s name</label>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="First name" />

              <label>Age</label>
              <input value={age} onChange={(e) => setAge(e.target.value)} inputMode="numeric" />

              <label>How the app talks to them</label>
              <div className="seg">
                <button type="button" aria-current={mode === "low_demand"} onClick={() => setMode("low_demand")}>Low-demand</button>
                <button type="button" aria-current={mode === "standard"} onClick={() => setMode("standard")}>Standard</button>
                <button type="button" aria-current={mode === "young_visual"} onClick={() => setMode("young_visual")}>Young</button>
              </div>
              <div style={{ fontSize: 11, color: "var(--ink-3)", marginTop: 6, lineHeight: 1.5 }}>
                {mode === "low_demand" && "Jobs shown as the state of the house, never as an instruction. No notifications, ever."}
                {mode === "standard" && "Plain “today’s jobs”, and can see the whole-house rota."}
                {mode === "young_visual" && "Big icons, read-aloud, a token jar instead of money — for the youngest."}
              </div>

              <label>When they&apos;re here</label>
              <div className="seg">
                <button type="button" aria-current={presence === "full_time"} onClick={() => setPresence("full_time")}>Always here</button>
                <button type="button" aria-current={presence === "eow_and_holidays"} onClick={() => setPresence("eow_and_holidays")}>Weekends / holidays</button>
              </div>

              <label>Their colour</label>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {COLOURS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    aria-label={`colour ${c}`}
                    onClick={() => setColour(c)}
                    style={{ width: 30, height: 30, borderRadius: "50%", background: c, border: colour === c ? "3px solid var(--ink)" : "3px solid transparent", cursor: "pointer" }}
                  />
                ))}
              </div>

              <label>How they log in</label>
              <div className="seg">
                <button type="button" aria-current={pinType === "numeric"} onClick={() => setPinType("numeric")}>4-digit PIN</button>
                <button type="button" aria-current={pinType === "picture"} onClick={() => setPinType("picture")}>Picture PIN</button>
              </div>

              {pinType === "numeric" ? (
                <>
                  <label>Choose a 4-digit PIN</label>
                  <input value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))} inputMode="numeric" placeholder="1234" />
                </>
              ) : (
                <>
                  <label>Tap three animals, in order ({seq.length}/{PICTURE_PIN_LENGTH})</label>
                  <div className="picpin">
                    {PICTURE_PIN_ANIMALS.map((a) => (
                      <button type="button" key={a.key} className={seq.includes(a.key) ? "sel" : ""} onClick={() => toggleAnimal(a.key)}>
                        {a.emoji}
                      </button>
                    ))}
                  </div>
                  {seq.length > 0 && (
                    <div style={{ fontSize: 13, color: "var(--ink-2)", marginTop: 8 }}>
                      Order: {seq.map((k) => emojiForAnimal(k)).join("  →  ")}
                    </div>
                  )}
                </>
              )}

              <button className="loginbtn" style={{ marginTop: 16 }} onClick={add} disabled={busy}>
                {busy ? "…" : "Add child"}
              </button>
            </div>

            <div className="grouphead" style={{ marginTop: 22 }}>
              Your children · {children.length}
            </div>
            {children.length === 0 && (
              <p style={{ fontSize: 12.5, color: "var(--ink-3)" }}>No children yet. Add the first one above.</p>
            )}
            {children.map((c) => (
              <div className="jobrow" key={c.id}>
                <span className="ic" style={{ background: c.colour_hex, color: "#fff" }}>
                  {c.display_name[0]}
                </span>
                <div className="tx">
                  <b>{c.display_name}</b>
                  <span>
                    {MODE_LABEL[c.mode]} · {c.presence === "full_time" ? "always here" : "weekends"} ·{" "}
                    {c.pin_type === "picture" ? "picture PIN" : "PIN"}
                  </span>
                </div>
                <button className="go" style={{ background: "var(--paper-2)", color: "var(--ink-2)" }} onClick={() => remove(c.id)}>
                  Remove
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
