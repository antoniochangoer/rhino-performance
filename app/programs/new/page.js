"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createProgram } from "@/lib/storage";

const GOAL_OPTIONS = [
  {
    id: "peaking",
    label: "Kracht opbouwen / Peaken",
    icon: "⚡",
    desc: "RPE bouwt op van week tot week. De laatste week voor je piek inclusief deload. Aanbevolen: 8–12 weken.",
    defaultWeeks: 10,
    defaultRpe: 7,
  },
  {
    id: "maintenance",
    label: "Kracht onderhouden",
    icon: "🔒",
    desc: "Stabiele intensiteit, minimale belasting, kracht behoud. Aanbevolen: 4–8 weken.",
    defaultWeeks: 6,
    defaultRpe: 7.5,
  },
];

export default function NewProgramPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);

  // Step 1
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  // Step 2
  const [goal, setGoal] = useState("peaking");

  // Step 3
  const [totalWeeks, setTotalWeeks] = useState(10);
  const [startRpe, setStartRpe] = useState(7);

  const selectedGoal = GOAL_OPTIONS.find((g) => g.id === goal);

  function goToStep2(e) {
    e.preventDefault();
    if (!name.trim()) return;
    setStep(2);
  }

  function selectGoal(id) {
    const g = GOAL_OPTIONS.find((o) => o.id === id);
    setGoal(id);
    setTotalWeeks(g.defaultWeeks);
    setStartRpe(g.defaultRpe);
    setStep(3);
  }

  function handleSubmit(e) {
    e.preventDefault();
    const p = createProgram({
      name: name.trim(),
      description: description.trim(),
      goal,
      totalWeeks: Number(totalWeeks),
      startRpe: Number(startRpe),
    });
    router.push(`/programs/${p.id}`);
  }

  // --- Step indicator ---
  function StepDots() {
    return (
      <div style={{ display: "flex", gap: 6, marginBottom: 24 }}>
        {[1, 2, 3].map((n) => (
          <div
            key={n}
            style={{
              width: n === step ? 20 : 8,
              height: 8,
              borderRadius: 4,
              background: n === step ? "#e63946" : n < step ? "#4caf50" : "#2a2a2a",
              transition: "all 0.2s",
            }}
          />
        ))}
      </div>
    );
  }

  // --- Step 1: Name & description ---
  if (step === 1) {
    return (
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
          <button onClick={() => router.back()} style={{ background: "transparent", color: "#888", padding: "4px 0", fontSize: 22 }}>←</button>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Nieuw schema</h1>
        </div>
        <StepDots />
        <p style={{ color: "#888", fontSize: 14, marginBottom: 24 }}>Stap 1 van 3 — Basis info</p>

        <form onSubmit={goToStep2}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", marginBottom: 6, fontSize: 14, color: "#888" }}>Naam *</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="bijv. Powerlifting Blok 1"
              required
              autoFocus
            />
          </div>

          <div style={{ marginBottom: 28 }}>
            <label style={{ display: "block", marginBottom: 6, fontSize: 14, color: "#888" }}>Beschrijving</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optionele omschrijving..."
              rows={3}
              style={{
                background: "#1a1a1a", color: "#f0f0f0", border: "1px solid #2a2a2a",
                borderRadius: 8, padding: "10px 14px", fontSize: 16, width: "100%", resize: "vertical",
              }}
            />
          </div>

          <button
            type="submit"
            disabled={!name.trim()}
            style={{ background: "#e63946", color: "#fff", width: "100%", padding: 16, fontSize: 16, borderRadius: 10 }}
          >
            Volgende →
          </button>
        </form>
      </div>
    );
  }

  // --- Step 2: Goal ---
  if (step === 2) {
    return (
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
          <button onClick={() => setStep(1)} style={{ background: "transparent", color: "#888", padding: "4px 0", fontSize: 22 }}>←</button>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Doel kiezen</h1>
        </div>
        <StepDots />
        <p style={{ color: "#888", fontSize: 14, marginBottom: 24 }}>Stap 2 van 3 — Wat is het doel van dit blok?</p>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {GOAL_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => selectGoal(opt.id)}
              style={{
                background: "#1a1a1a",
                border: `2px solid ${goal === opt.id ? "#e63946" : "#2a2a2a"}`,
                borderRadius: 12,
                padding: "18px 20px",
                textAlign: "left",
                cursor: "pointer",
                color: "#f0f0f0",
                transition: "border-color 0.15s",
              }}
            >
              <div style={{ fontSize: 20, marginBottom: 6 }}>{opt.icon} <span style={{ fontSize: 16, fontWeight: 700 }}>{opt.label}</span></div>
              <div style={{ fontSize: 13, color: "#888", lineHeight: 1.5 }}>{opt.desc}</div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // --- Step 3: Weeks & start RPE ---
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
        <button onClick={() => setStep(2)} style={{ background: "transparent", color: "#888", padding: "4px 0", fontSize: 22 }}>←</button>
        <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Plannen</h1>
      </div>
      <StepDots />
      <p style={{ color: "#888", fontSize: 14, marginBottom: 24 }}>Stap 3 van 3 — Duur en start-intensiteit</p>

      {/* Goal summary */}
      <div style={{ background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: 10, padding: "12px 16px", marginBottom: 24 }}>
        <div style={{ fontSize: 13, color: "#888", marginBottom: 2 }}>Gekozen doel</div>
        <div style={{ fontWeight: 700, color: "#e63946" }}>{selectedGoal?.icon} {selectedGoal?.label}</div>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Weeks */}
        <div style={{ marginBottom: 24 }}>
          <label style={{ display: "block", marginBottom: 6, fontSize: 14, color: "#888" }}>
            Aantal weken
          </label>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button
              type="button"
              onClick={() => setTotalWeeks((w) => Math.max(2, w - 1))}
              style={{ background: "#2a2a2a", color: "#f0f0f0", width: 44, height: 44, borderRadius: 8, fontSize: 20, flexShrink: 0 }}
            >−</button>
            <div style={{ flex: 1, textAlign: "center", fontSize: 32, fontWeight: 700, color: "#f0f0f0" }}>{totalWeeks}</div>
            <button
              type="button"
              onClick={() => setTotalWeeks((w) => Math.min(20, w + 1))}
              style={{ background: "#2a2a2a", color: "#f0f0f0", width: 44, height: 44, borderRadius: 8, fontSize: 20, flexShrink: 0 }}
            >+</button>
          </div>
          {goal === "peaking" && totalWeeks >= 3 && (
            <p style={{ fontSize: 12, color: "#888", marginTop: 8, textAlign: "center" }}>
              Week {totalWeeks - 1} = deload · Week {totalWeeks} = peak
            </p>
          )}
        </div>

        {/* Start RPE */}
        <div style={{ marginBottom: 28 }}>
          <label style={{ display: "block", marginBottom: 6, fontSize: 14, color: "#888" }}>
            Start-RPE (week 1)
          </label>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button
              type="button"
              onClick={() => setStartRpe((r) => Math.max(6, Math.round((r - 0.5) * 2) / 2))}
              style={{ background: "#2a2a2a", color: "#f0f0f0", width: 44, height: 44, borderRadius: 8, fontSize: 20, flexShrink: 0 }}
            >−</button>
            <div style={{ flex: 1, textAlign: "center", fontSize: 32, fontWeight: 700, color: "#e63946" }}>
              {startRpe}
            </div>
            <button
              type="button"
              onClick={() => setStartRpe((r) => Math.min(8.5, Math.round((r + 0.5) * 2) / 2))}
              style={{ background: "#2a2a2a", color: "#f0f0f0", width: 44, height: 44, borderRadius: 8, fontSize: 20, flexShrink: 0 }}
            >+</button>
          </div>
          {goal === "peaking" && (
            <p style={{ fontSize: 12, color: "#888", marginTop: 8, textAlign: "center" }}>
              RPE stijgt elke week met +0.5 · eindigt op peak week RPE 9.5
            </p>
          )}
          {goal === "maintenance" && (
            <p style={{ fontSize: 12, color: "#888", marginTop: 8, textAlign: "center" }}>
              Stabiele RPE gedurende het hele blok
            </p>
          )}
        </div>

        {/* RPE progression preview */}
        {goal === "peaking" && (
          <div style={{ background: "#111", border: "1px solid #2a2a2a", borderRadius: 10, padding: "12px 16px", marginBottom: 24 }}>
            <div style={{ fontSize: 12, color: "#888", marginBottom: 8 }}>RPE progressie preview</div>
            <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
              {Array.from({ length: totalWeeks }, (_, i) => {
                const w = i + 1;
                const isDeload = w === totalWeeks - 1 && totalWeeks > 2;
                const isPeak = w === totalWeeks;
                let rpe, label, color;
                if (isDeload) { rpe = startRpe; label = "D"; color = "#888"; }
                else if (isPeak) { rpe = "9.5"; label = "P"; color = "#e63946"; }
                else {
                  rpe = Math.min(9, Math.round((startRpe + (w - 1) * 0.5) * 2) / 2);
                  label = `W${w}`;
                  color = "#f0f0f0";
                }
                return (
                  <div key={w} style={{ background: "#1a1a1a", borderRadius: 6, padding: "6px 8px", textAlign: "center", minWidth: 40 }}>
                    <div style={{ fontSize: 10, color: "#666" }}>{isDeload ? "DEL" : isPeak ? "PEAK" : `W${w}`}</div>
                    <div style={{ fontSize: 13, fontWeight: 700, color }}>{rpe}</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <button
          type="submit"
          style={{ background: "#e63946", color: "#fff", width: "100%", padding: 16, fontSize: 16, borderRadius: 10 }}
        >
          Schema aanmaken →
        </button>
      </form>
    </div>
  );
}
