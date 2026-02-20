"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import {
  LineChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid,
} from "recharts";
import {
  getLog, getProgram, updateLog, deleteLog,
  calcE1RM, rpeColor, calcImpliedRpe, getExerciseHistory,
} from "@/lib/storage";

const RPE_COLOR_MAP = { green: "#2d9e47", orange: "#e67e22", red: "#e63946" };

function formatDate(dateStr) {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("nl-NL", { day: "numeric", month: "short" });
}

const MiniTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: 6, padding: "6px 10px" }}>
      <div style={{ color: "#e63946", fontWeight: 700, fontSize: 13 }}>{payload[0].value} kg</div>
      <div style={{ color: "#888", fontSize: 11 }}>{payload[0].payload.label}</div>
    </div>
  );
};

function buildHistoryMap(exercises) {
  const map = {};
  for (const ex of exercises) {
    const hist = getExerciseHistory(ex.name, 10).map((d) => ({
      ...d,
      label: formatDate(d.date),
    }));
    if (hist.length >= 2) map[ex.name] = hist;
  }
  return map;
}

export default function HistoryDetailPage({ params }) {
  const { id } = use(params);
  const router = useRouter();
  const [log, setLog] = useState(null);
  const [program, setProgram] = useState(null);
  const [historyMap, setHistoryMap] = useState({});
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const l = getLog(id);
    if (!l) { router.push("/history"); return; }
    setLog(l);
    if (l.programId) setProgram(getProgram(l.programId));
    setHistoryMap(buildHistoryMap(l.exercises));
  }, [id]);

  if (!log) return <div style={{ color: "#888", padding: 32, textAlign: "center" }}>Laden...</div>;

  function persistLog(updatedLog) {
    updateLog(updatedLog.id, { exercises: updatedLog.exercises });
    // Rebuild history charts live after each change
    setHistoryMap(buildHistoryMap(updatedLog.exercises));
    setLog({ ...updatedLog });
    // Brief "opgeslagen" indicator
    setSaved(true);
    setTimeout(() => setSaved(false), 1200);
  }

  function updateSet(exIdx, setIdx, field, value) {
    const updated = JSON.parse(JSON.stringify(log));
    const ex = updated.exercises[exIdx];
    const s = ex.sets[setIdx];
    s[field] = value;

    // Auto-calculate implied RPE when weight or reps change
    if ((field === "weight" || field === "reps") && ex.oneRepMax > 0) {
      const w = field === "weight" ? value : s.weight;
      const r = field === "reps" ? value : s.reps;
      if (w && r) {
        const implied = calcImpliedRpe(w, r, ex.oneRepMax);
        if (implied !== null) s.rpe = String(implied);
      }
    }

    persistLog(updated);
  }

  function totalVolume(exercises) {
    let vol = 0;
    exercises.forEach((ex) => {
      ex.sets.forEach((s) => {
        if (s.weight && s.reps) vol += Number(s.weight) * Number(s.reps);
      });
    });
    return vol;
  }

  const vol = totalVolume(log.exercises);
  const totalSets = log.exercises.reduce((a, e) => a + e.sets.length, 0);

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
        <button onClick={() => router.push("/history")} style={{ background: "transparent", color: "#888", padding: "4px 0", fontSize: 22 }}>←</button>
        <div style={{ flex: 1 }}>
          <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>{log.sessionName}</h1>
          <div style={{ color: "#888", fontSize: 13, marginTop: 2 }}>
            {log.date}
            {program && <span> · {program.name}</span>}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            fontSize: 12,
            color: saved ? "#2d9e47" : "#555",
            transition: "color 0.3s",
            fontWeight: saved ? 600 : 400,
          }}>
            {saved ? "✓ Opgeslagen" : "Bewerkbaar"}
          </div>
          <button
            onClick={() => {
              if (!confirm(`Weet je zeker dat je de training "${log.sessionName}" van ${log.date} wilt verwijderen?\n\nDeze actie kan niet ongedaan worden gemaakt.`)) return;
              deleteLog(log.id);
              router.push("/history");
            }}
            style={{ background: "transparent", color: "#333", fontSize: 20, lineHeight: 1, padding: "4px 6px", border: "none" }}
          >
            ×
          </button>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 20, marginTop: 16 }}>
        {[
          ["Oefeningen", log.exercises.length],
          ["Sets", totalSets],
          ["Volume", vol > 0 ? vol.toLocaleString("nl") + " kg" : "-"],
        ].map(([label, val]) => (
          <div key={label} style={{ background: "#111", border: "1px solid #2a2a2a", borderRadius: 10, padding: "12px 10px", textAlign: "center" }}>
            <div style={{ fontSize: 18, fontWeight: 700 }}>{val}</div>
            <div style={{ fontSize: 12, color: "#888", marginTop: 2 }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Exercises */}
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {log.exercises.map((ex, exIdx) => {
          const bestSet = ex.sets.reduce((best, s) => {
            const e1rm = s.weight && s.reps ? calcE1RM(Number(s.weight), Number(s.reps)) : 0;
            return e1rm > (best.e1rm || 0) ? { ...s, e1rm } : best;
          }, {});
          const history = historyMap[ex.name];

          const lowRpeSets = ex.sets.filter(
            (s) => s.rpe !== "" && (ex.targetRpe - Number(s.rpe)) >= 2
          );
          const showWeakling = lowRpeSets.length > 0;

          return (
            <div key={ex.exerciseId} style={{ background: "#111", border: "1px solid #2a2a2a", borderRadius: 12 }}>
              {/* Exercise header */}
              <div style={{ padding: "12px 14px", borderBottom: "1px solid #2a2a2a" }}>
                <div style={{ fontWeight: 700, fontSize: 16 }}>{ex.name}</div>
                <div style={{ display: "flex", gap: 12, marginTop: 4, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 13, color: "#888" }}>Target: {ex.targetReps} reps @ RPE {ex.targetRpe}</span>
                  {bestSet.e1rm > 0 && (
                    <span style={{ fontSize: 13, color: "#e63946" }}>Beste e1RM: ~{bestSet.e1rm} kg</span>
                  )}
                  {ex.oneRepMax > 0 && (
                    <span style={{ fontSize: 13, color: "#666" }}>1RM: {ex.oneRepMax} kg</span>
                  )}
                </div>
              </div>

              {/* Column headers */}
              <div style={{ display: "grid", gridTemplateColumns: "28px 1fr 1fr 1fr 60px", gap: 6, padding: "8px 14px 4px", alignItems: "center" }}>
                <div style={{ fontSize: 11, color: "#888" }}>#</div>
                <div style={{ fontSize: 11, color: "#888", textAlign: "center" }}>Gewicht (kg)</div>
                <div style={{ fontSize: 11, color: "#888", textAlign: "center" }}>Reps</div>
                <div style={{ fontSize: 11, color: "#888", textAlign: "center" }}>RPE</div>
                <div style={{ fontSize: 11, color: "#888", textAlign: "center" }}>e1RM</div>
              </div>

              {/* Sets — editable */}
              <div style={{ padding: "0 14px 14px" }}>
                {ex.sets.map((s, si) => {
                  const color = rpeColor(Number(s.rpe), ex.targetRpe);
                  const e1rm = s.weight && s.reps ? calcE1RM(Number(s.weight), Number(s.reps)) : null;
                  const isWeak = s.rpe !== "" && (ex.targetRpe - Number(s.rpe)) >= 2;

                  return (
                    <div key={s.id || si} style={{ marginBottom: 6 }}>
                      <div style={{
                        display: "grid",
                        gridTemplateColumns: "28px 1fr 1fr 1fr 60px",
                        gap: 6,
                        alignItems: "center",
                      }}>
                        {/* Set indicator */}
                        <div style={{
                          width: 24, height: 24, borderRadius: "50%",
                          background: s.completed ? "#2d9e47" : (color ? RPE_COLOR_MAP[color] : "#2a2a2a"),
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: 12, fontWeight: 700, color: "#fff",
                          flexShrink: 0,
                        }}>
                          {s.completed ? "✓" : si + 1}
                        </div>

                        {/* Weight */}
                        <input
                          type="number"
                          min="0"
                          step="2.5"
                          value={s.weight}
                          onChange={(e) => updateSet(exIdx, si, "weight", e.target.value)}
                          style={{
                            padding: "9px 6px",
                            fontSize: 15,
                            textAlign: "center",
                            borderRadius: 8,
                            border: `1px solid ${color ? RPE_COLOR_MAP[color] + "66" : "#2a2a2a"}`,
                            background: "#1a1a1a",
                            color: "#f0f0f0",
                            width: "100%",
                          }}
                        />

                        {/* Reps */}
                        <input
                          type="number"
                          min="1"
                          step="1"
                          value={s.reps}
                          onChange={(e) => updateSet(exIdx, si, "reps", e.target.value)}
                          style={{
                            padding: "9px 6px",
                            fontSize: 15,
                            textAlign: "center",
                            borderRadius: 8,
                            border: `1px solid ${color ? RPE_COLOR_MAP[color] + "66" : "#2a2a2a"}`,
                            background: "#1a1a1a",
                            color: "#f0f0f0",
                            width: "100%",
                          }}
                        />

                        {/* RPE */}
                        <input
                          type="number"
                          min="5"
                          max="10"
                          step="0.5"
                          value={s.rpe}
                          onChange={(e) => updateSet(exIdx, si, "rpe", e.target.value)}
                          style={{
                            padding: "9px 6px",
                            fontSize: 15,
                            textAlign: "center",
                            borderRadius: 8,
                            border: `2px solid ${isWeak ? "#e63946" : (color ? RPE_COLOR_MAP[color] + "66" : "#2a2a2a")}`,
                            background: isWeak ? "#1a0505" : "#1a1a1a",
                            color: isWeak ? "#e63946" : "#f0f0f0",
                            fontWeight: isWeak ? 700 : 400,
                            width: "100%",
                          }}
                        />

                        {/* e1RM — live */}
                        <div style={{ textAlign: "center", fontSize: 13, color: "#888" }}>
                          {e1rm ? `~${e1rm}` : "-"}
                        </div>
                      </div>

                      {/* e1RM sub-label */}
                      {e1rm && ex.oneRepMax > 0 && (
                        <div style={{ fontSize: 11, color: "#666", paddingLeft: 34, marginTop: 2 }}>
                          RPE auto-berekend
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Weakling banner */}
                {showWeakling && (
                  <div style={{
                    marginTop: 10,
                    background: "#1a0000",
                    border: "2px solid #e63946",
                    borderRadius: 10,
                    padding: "12px 14px",
                  }}>
                    <div style={{ fontWeight: 800, fontSize: 15, color: "#e63946", marginBottom: 4, letterSpacing: 0.5 }}>
                      ⚠ WEAKLING ALERT
                    </div>
                    <div style={{ fontSize: 13, color: "#f0a0a0", lineHeight: 1.5 }}>
                      Je trainde {Math.round(ex.targetRpe - Math.min(...lowRpeSets.map((s) => Number(s.rpe))))} RPE punten onder je target ({ex.targetRpe}).
                      Corrigeer je gewicht of RPE.
                    </div>
                  </div>
                )}
              </div>

              {/* Mini progress chart — rebuilds live on change */}
              {history && (
                <div style={{ borderTop: "1px solid #1a1a1a", padding: "12px 14px" }}>
                  <div style={{ fontSize: 11, color: "#888", marginBottom: 6 }}>
                    e1RM progressie (laatste {history.length} sessies)
                  </div>
                  <ResponsiveContainer width="100%" height={90}>
                    <LineChart data={history} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1a1a1a" />
                      <XAxis dataKey="label" hide />
                      <YAxis
                        domain={[
                          Math.max(0, Math.min(...history.map((d) => d.e1rm)) - 5),
                          Math.max(...history.map((d) => d.e1rm)) + 5,
                        ]}
                        hide
                      />
                      <Tooltip content={<MiniTooltip />} />
                      <Line
                        type="monotone"
                        dataKey="e1rm"
                        stroke="#e63946"
                        strokeWidth={2}
                        dot={{ fill: "#e63946", r: 3, strokeWidth: 0 }}
                        activeDot={{ fill: "#fff", stroke: "#e63946", r: 5, strokeWidth: 2 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
