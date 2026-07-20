"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatPence } from "@/lib/money";
import { normalizeRoom } from "@/lib/rooms";

export interface JobLite {
  id: string;
  title: string;
  kind: "house_critical" | "paid" | "life_skill";
  price_pence: number;
  fallback_pence: number;
  framing_ambient: string | null;
  recurrence: string;
  room: string | null;
  people_needed: number;
  age_min: number;
}

interface Props {
  initialJobs: JobLite[];
  demo?: boolean;
}

type Freq = "daily" | "weekdays" | "weekly" | "monthly";

const FREQ_OPTIONS: { value: Freq; label: string }[] = [
  { value: "daily", label: "Every day" },
  { value: "weekdays", label: "Weekdays" },
  { value: "weekly", label: "Once a week" },
  { value: "monthly", label: "Once a month" },
];
const FREQ_LABEL: Record<string, string> = {
  daily: "Every day",
  weekdays: "Weekdays",
  weekly: "Weekly",
  monthly: "Monthly",
  on_demand: "On demand",
};

function poundsToPence(v: string): number {
  const n = parseFloat(v.replace(/[£\s,]/g, ""));
  return Number.isFinite(n) ? Math.round(n * 100) : 0;
}

function Chips<T extends string | number>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
      {options.map((o) => (
        <button
          key={String(o.value)}
          type="button"
          onClick={() => onChange(o.value)}
          className="pill"
          style={{
            border: 0,
            cursor: "pointer",
            padding: "8px 13px",
            fontSize: 11.5,
            background: value === o.value ? "var(--berry)" : "var(--paper-2)",
            color: value === o.value ? "#fff" : "var(--ink-2)",
          }}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export default function ParentJobs({ initialJobs, demo = false }: Props) {
  const router = useRouter();
  const [jobs, setJobs] = useState<JobLite[]>(initialJobs);
  const [kind, setKind] = useState<"house_critical" | "paid">("house_critical");
  const [title, setTitle] = useState("");
  const [room, setRoom] = useState("");
  const [freq, setFreq] = useState<Freq>("daily");
  const [people, setPeople] = useState(1);
  const [ambient, setAmbient] = useState("");
  const [price, setPrice] = useState("1.00");
  const [fallback, setFallback] = useState("1.00");
  const [age, setAge] = useState("5");
  const [busy, setBusy] = useState(false);
  const [tip, setTip] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  function flash(msg: string) {
    setTip(msg);
    setTimeout(() => setTip(null), 1800);
  }

  function resetForm() {
    setEditingId(null);
    setKind("house_critical");
    setTitle("");
    setRoom("");
    setFreq("daily");
    setPeople(1);
    setAmbient("");
    setPrice("1.00");
    setFallback("1.00");
    setAge("5");
  }

  function startEdit(j: JobLite) {
    setEditingId(j.id);
    setKind(j.kind === "paid" ? "paid" : "house_critical");
    setTitle(j.title);
    setRoom(j.room ?? "");
    setFreq((["daily", "weekdays", "weekly", "monthly"].includes(j.recurrence) ? j.recurrence : "daily") as Freq);
    setPeople(Math.min(3, Math.max(1, j.people_needed)));
    setAmbient(j.framing_ambient ?? "");
    setPrice((j.price_pence / 100).toFixed(2));
    setFallback((j.fallback_pence / 100).toFixed(2));
    setAge(String(j.age_min ?? 5));
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function submit() {
    if (!title.trim()) return flash("Give the job a name first.");
    const payload = {
      title: title.trim(),
      kind,
      room: room.trim(),
      recurrence: freq,
      people_needed: kind === "house_critical" ? people : 1,
      price_pence: kind === "paid" ? poundsToPence(price) : 0,
      fallback_pence: poundsToPence(fallback),
      framing_ambient: ambient.trim(),
      age_min: Math.max(0, Math.round(Number(age) || 0)),
    };

    if (demo) {
      const local: JobLite = {
        id: editingId ?? `demo-${Date.now()}`,
        title: payload.title,
        kind: payload.kind,
        price_pence: payload.price_pence,
        fallback_pence: payload.fallback_pence,
        framing_ambient: payload.framing_ambient || payload.title,
        recurrence: freq,
        room: normalizeRoom(payload.room),
        people_needed: payload.people_needed,
        age_min: payload.age_min,
      };
      setJobs((j) => (editingId ? j.map((x) => (x.id === editingId ? local : x)) : [local, ...j]));
      flash(editingId ? "Saved (demo — nothing stored)." : "Added (demo — nothing saved).");
      resetForm();
      return;
    }

    setBusy(true);
    const res = await fetch(editingId ? `/api/parent/jobs/${editingId}` : "/api/parent/jobs", {
      method: editingId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setBusy(false);
    if (res.ok) {
      const { job } = await res.json();
      if (job) {
        setJobs((j) =>
          editingId ? j.map((x) => (x.id === editingId ? (job as JobLite) : x)) : [job as JobLite, ...j]
        );
      }
      flash(editingId ? "Saved." : "Added to the library.");
      resetForm();
      router.refresh();
    } else {
      flash("Couldn't save it — try again.");
    }
  }

  async function remove(id: string) {
    setJobs((j) => j.filter((x) => x.id !== id));
    if (editingId === id) resetForm();
    if (demo) return;
    await fetch(`/api/parent/jobs/${id}`, { method: "DELETE" });
    router.refresh();
  }

  const isPaid = kind === "paid";

  // group the library by room, case-insensitively so "Bedroom" and "bedroom"
  // merge, with a canonical Title-Case display name.
  const byRoom = new Map<string, JobLite[]>();
  for (const j of jobs) {
    const key = normalizeRoom(j.room) ?? "Anywhere / no room";
    (byRoom.get(key) ?? byRoom.set(key, []).get(key)!).push(j);
  }
  // existing room names, for the add-form autocomplete (so parents reuse them)
  const existingRooms = [...byRoom.keys()].filter((k) => k !== "Anywhere / no room").sort();

  return (
    <div className={`appshell${demo ? "" : " app-fullwidth"}`}>
      <div className="phone" style={{ height: 760 }}>
        <div className="screen">
          <div className="statusbar">
            <span>18:12</span>
            <span>Parent Mode</span>
          </div>
          {tip && (
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
              {tip}
            </div>
          )}
          <div className="scroll">
            <div className="appbar">
              <h4>Jobs</h4>
              <a
                href={demo ? "/demo/parent" : "/parent"}
                className="pill"
                style={{ background: "var(--paper-2)", color: "var(--ink-2)", textDecoration: "none" }}
              >
                ← Today
              </a>
            </div>

            {/* ---- add form ---- */}
            <div className="miniform">
              <label>What is it</label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Empty the dishwasher"
              />

              <label>Which room (optional)</label>
              <input
                value={room}
                onChange={(e) => setRoom(e.target.value)}
                placeholder="Kitchen"
                list="known-rooms"
              />
              <datalist id="known-rooms">
                {existingRooms.map((r) => (
                  <option key={r} value={r} />
                ))}
              </datalist>

              <label>What kind of job</label>
              <div className="seg">
                <button type="button" aria-current={!isPaid} onClick={() => setKind("house_critical")}>
                  Essential (everyday)
                </button>
                <button type="button" aria-current={isPaid} onClick={() => setKind("paid")}>
                  Paid job
                </button>
              </div>

              {isPaid && (
                <>
                  <label>Price on the board</label>
                  <input value={price} onChange={(e) => setPrice(e.target.value)} inputMode="decimal" />
                </>
              )}

              <label>How often</label>
              <Chips options={FREQ_OPTIONS} value={freq} onChange={setFreq} />

              {!isPaid && (
                <>
                  <label>How many people</label>
                  <Chips
                    options={[
                      { value: 1, label: "1 person" },
                      { value: 2, label: "2 people" },
                      { value: 3, label: "3 people" },
                    ]}
                    value={people}
                    onChange={setPeople}
                  />
                  <div style={{ fontSize: 11, color: "var(--ink-3)", marginTop: 6, lineHeight: 1.5 }}>
                    A whole-room job like the bathroom can be dealt to more than one child.
                  </div>
                </>
              )}

              <label>If it&apos;s not done by 6pm</label>
              <input value={fallback} onChange={(e) => setFallback(e.target.value)} inputMode="decimal" />
              <div style={{ fontSize: 11, color: "var(--ink-3)", marginTop: 6, lineHeight: 1.5 }}>
                At 6pm it goes on the board as a bonus, and whoever finishes it earns this. Set now,
                so nobody has to decide at teatime.
              </div>

              <label>How the quiet-mode child sees it (optional)</label>
              <input
                value={ambient}
                onChange={(e) => setAmbient(e.target.value)}
                placeholder="The dishwasher is full"
                style={{ borderStyle: "dashed" }}
              />

              <label>Youngest age who can do it</label>
              <input value={age} onChange={(e) => setAge(e.target.value)} inputMode="numeric" />

              <button className="loginbtn" style={{ marginTop: 16 }} onClick={submit} disabled={busy}>
                {busy ? "…" : editingId ? "Save changes" : "Add to the library"}
              </button>
              {editingId && (
                <button
                  type="button"
                  onClick={resetForm}
                  style={{
                    width: "100%",
                    marginTop: 8,
                    background: "none",
                    border: 0,
                    color: "var(--ink-3)",
                    fontSize: 13,
                    cursor: "pointer",
                  }}
                >
                  Cancel edit
                </button>
              )}
            </div>

            {/* ---- library, grouped by room ---- */}
            <div className="grouphead" style={{ marginTop: 22 }}>
              In the library · {jobs.length}
            </div>
            {jobs.length === 0 && (
              <p style={{ fontSize: 12.5, color: "var(--ink-3)" }}>No jobs yet. Add the first one above.</p>
            )}
            {[...byRoom.entries()].map(([roomName, roomJobs]) => (
              <div key={roomName} style={{ marginBottom: 6 }}>
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: "var(--berry)",
                    margin: "12px 0 7px",
                  }}
                >
                  {roomName} · {roomJobs.length}
                </div>
                {roomJobs.map((j) => (
                  <div
                    className="jobrow"
                    key={j.id}
                    style={editingId === j.id ? { borderColor: "var(--berry)", background: "#FBF4F9" } : undefined}
                  >
                    <span
                      className="pill"
                      style={{
                        background: j.kind === "paid" ? "#E0F0F0" : "var(--leaf-2)",
                        color: j.kind === "paid" ? "var(--kid-teal)" : "var(--leaf)",
                        flex: "none",
                      }}
                    >
                      {j.kind === "paid" ? "Paid" : "Everyday"}
                    </span>
                    <div className="tx">
                      <b>{j.title}</b>
                      <span>
                        {FREQ_LABEL[j.recurrence] ?? j.recurrence}
                        {j.people_needed > 1 ? ` · ${j.people_needed} people` : ""}
                        {j.kind === "paid" ? ` · ${formatPence(j.price_pence)}` : ""}
                        {" · 6pm "}
                        {formatPence(j.fallback_pence)}
                      </span>
                    </div>
                    <button
                      className="go"
                      style={{ background: "var(--berry)", color: "#fff" }}
                      onClick={() => startEdit(j)}
                      aria-label={`Edit ${j.title}`}
                    >
                      Edit
                    </button>
                    <button
                      className="go"
                      style={{ background: "var(--paper-2)", color: "var(--ink-2)" }}
                      onClick={() => remove(j.id)}
                      aria-label={`Remove ${j.title}`}
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
