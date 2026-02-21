"use client";

import { useState, useEffect, use, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  getLog, getProgram, updateLog, completeLog,
  calcTargetWeight, calcE1RM, rpeColor, calcImpliedRpe,
  generateWorkoutFeedback, addExercise,
} from "@/lib/storage";
import { searchExercises } from "@/lib/exercises";

function generateId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

const RPE_COLOR_MAP = { green: "#2d9e47", orange: "#e67e22", red: "#e63946" };

// ---- Add Exercise Modal ----
function AddExerciseModal({ onClose, onAdd }) {
  const [name, setName] = useState("");
  const [sets, setSets] = useState(3);
  const [reps, setReps] = useState(5);
  const [rpe, setRpe] = useState(8);
  const [oneRepMax, setOneRepMax] = useState("");
  const [permanent, setPermanent] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [showSugg, setShowSugg] = useState(false);

  function handleSubmit(e) {
    e.preventDefault();
    if (!name.trim()) return;
    onAdd({ name: name.trim(), sets, targetReps: reps, targetRpe: rpe, oneRepMax: Number(oneRepMax) || 0 }, permanent);
    onClose();
  }

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", zIndex: 100,
      display: "flex", alignItems: "flex-end", padding: 0,
    }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        background: "#111", border: "1px solid #2a2a2a", borderRadius: "16px 16px 0 0",
        padding: "20px 16px 32px", width: "100%", maxWidth: 540, margin: "0 auto",
      }}>
        <div style={{ fontWeight: 700, fontSize: 17, marginBottom: 16 }}>Oefening toevoegen</div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 12, position: "relative" }}>
            <label style={{ fontSize: 13, color: "#888", display: "block", marginBottom: 4 }}>Naam *</label>
            <input
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setSuggestions(searchExercises(e.target.value));
                setShowSugg(true);
              }}
              onFocus={() => { if (name) { setSuggestions(searchExercises(name)); setShowSugg(true); } }}
              onBlur={() => setTimeout(() => setShowSugg(false), 150)}
              placeholder="bijv. Back Squat"
              required
              autoComplete="off"
              autoFocus
            />
            {showSugg && suggestions.length > 0 && (
              <div style={{
                position: "absolute", top: "100%", left: 0, right: 0, zIndex: 200,
                background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: "0 0 8px 8px", overflow: "hidden",
              }}>
                {suggestions.map((s) => (
                  <button key={s} type="button"
                    onMouseDown={(e) => { e.preventDefault(); setName(s); setShowSugg(false); }}
                    style={{ display: "block", width: "100%", padding: "10px 14px", textAlign: "left", background: "transparent", color: "#f0f0f0", fontSize: 14, borderBottom: "1px solid #2a2a2a" }}
                  >{s}</button>
                ))}
              </div>
            )}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 12 }}>
            <div>
              <label style={{ fontSize: 12, color: "#888", display: "block", marginBottom: 4 }}>Sets</label>
              <input type="number" min="1" max="20" value={sets} onChange={(e) => setSets(Number(e.target.value))} style={{ textAlign: "center" }} />
            </div>
            <div>
              <label style={{ fontSize: 12, color: "#888", display: "block", marginBottom: 4 }}>Reps</label>
              <input type="number" min="1" max="20" value={reps} onChange={(e) => setReps(Number(e.target.value))} style={{ textAlign: "center" }} />
            </div>
            <div>
              <label style={{ fontSize: 12, color: "#888", display: "block", marginBottom: 4 }}>Target RPE</label>
              <input type="number" min="5" max="10" step="0.5" value={rpe} onChange={(e) => setRpe(Number(e.target.value))} style={{ textAlign: "center" }} />
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 13, color: "#888", display: "block", marginBottom: 4 }}>1RM (optioneel, voor gewicht berekening)</label>
            <input type="number" min="0" value={oneRepMax} onChange={(e) => setOneRepMax(e.target.value)} placeholder="kg" />
          </div>

          <div style={{ marginBottom: 20 }}>
            <button
              type="button"
              onClick={() => setPermanent((v) => !v)}
              style={{
                display: "flex", alignItems: "center", gap: 10, background: "transparent",
                color: "#f0f0f0", padding: "10px 14px", border: `2px solid ${permanent ? "#e63946" : "#2a2a2a"}`,
                borderRadius: 10, width: "100%", fontSize: 14,
              }}
            >
              <div style={{
                width: 20, height: 20, borderRadius: 4, background: permanent ? "#e63946" : "#2a2a2a",
                display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 12, color: "#fff",
              }}>
                {permanent ? "✓" : ""}
              </div>
              <div style={{ textAlign: "left" }}>
                <div style={{ fontWeight: 600 }}>Permanent toevoegen aan traindag</div>
                <div style={{ fontSize: 12, color: "#888" }}>{permanent ? "Wordt opgeslagen in je schema" : "Alleen vandaag zichtbaar"}</div>
              </div>
            </button>
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <button type="submit" style={{ background: "#e63946", color: "#fff", flex: 1, padding: "14px 0", fontSize: 15, borderRadius: 10 }}>
              Toevoegen
            </button>
            <button type="button" onClick={onClose} style={{ background: "#2a2a2a", color: "#f0f0f0", flex: 1, padding: "14px 0", fontSize: 15, borderRadius: 10 }}>
              Annuleer
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ---- Completion Screen ----
function CompletionScreen({ log, feedback, program, onDone }) {
  if (!log || !feedback) return null;

  const toneColors = { good: "#2d9e47", warn: "#e67e22", bad: "#e63946" };
  const toneBg = { good: "#0d1f12", warn: "#1a1100", bad: "#1a0000" };
  const color = toneColors[feedback.tone] || "#888";
  const bg = toneBg[feedback.tone] || "#111";

  const totalSets = log.exercises.reduce((a, ex) => a + ex.sets.length, 0);
  const completedSets = log.exercises.reduce((a, ex) => a + ex.sets.filter((s) => s.completed).length, 0);

  return (
    <div style={{ paddingBottom: 32 }}>
      <div style={{
        background: bg, border: `2px solid ${color}`, borderRadius: 14,
        padding: "20px 18px", marginBottom: 20,
      }}>
        <div style={{ fontSize: 22, fontWeight: 800, color, marginBottom: 6 }}>{feedback.headline}</div>
        <div style={{ fontSize: 14, color: "#c0c0c0", lineHeight: 1.6 }}>{feedback.body}</div>
        {feedback.weekMsg && (
          <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${color}44`, fontSize: 13, color: "#e0c060", fontWeight: 600 }}>
            🗓 {feedback.weekMsg}
          </div>
        )}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20 }}>
        <StatBox label="Datum" value={log.date} />
        <StatBox label="Sets afgerond" value={`${completedSets}/${totalSets}`} />
        <StatBox label="Totaal volume" value={`${feedback.volume.toLocaleString()} kg`} />
        <StatBox label="Week" value={`${log.weekNumber || "—"}`} />
      </div>

      <div style={{ background: "#111", border: "1px solid #2a2a2a", borderRadius: 12, padding: "14px 16px", marginBottom: 24 }}>
        <div style={{ fontSize: 13, color: "#888", marginBottom: 10 }}>Beste e1RM per oefening</div>
        {log.exercises.map((ex) => {
          let best = 0;
          for (const s of ex.sets) {
            if (s.weight && s.reps) {
              const e = Math.round(Number(s.weight) * (1 + Number(s.reps) * 0.0333));
              if (e > best) best = e;
            }
          }
          return (
            <div key={ex.exerciseId} style={{ display: "flex", justifyContent: "space-between", paddingBottom: 8, marginBottom: 8, borderBottom: "1px solid #1a1a1a" }}>
              <span style={{ fontSize: 14, color: "#f0f0f0" }}>{ex.name}</span>
              <span style={{ fontSize: 14, fontWeight: 700, color: best > 0 ? "#e63946" : "#888" }}>
                {best > 0 ? `~${best} kg` : "—"}
              </span>
            </div>
          );
        })}
      </div>

      <button
        onClick={onDone}
        style={{ background: "#e63946", color: "#fff", width: "100%", padding: "18px 0", fontSize: 17, fontWeight: 700, borderRadius: 12 }}
      >
        Naar dashboard
      </button>
    </div>
  );
}

function StatBox({ label, value }) {
  return (
    <div style={{ background: "#111", border: "1px solid #2a2a2a", borderRadius: 10, padding: "12px 14px" }}>
      <div style={{ fontSize: 12, color: "#888", marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 700, color: "#f0f0f0" }}>{value}</div>
    </div>
  );
}

// ---- Main Page ----
export default function ActiveTrainingPage({ params }) {
  const { logId } = use(params);
  const router = useRouter();
  const [log, setLog] = useState(null);
  const [confirming, setConfirming] = useState(false);
  const [completionData, setCompletionData] = useState(null);
  const [showAddExercise, setShowAddExercise] = useState(false);
  const [loading, setLoading] = useState(true);

  async function load() {
    const l = await getLog(logId);
    if (!l) { router.push("/"); return; }
    l.exercises = l.exercises.map((ex) => {
      const targetWeight = calcTargetWeight(ex.oneRepMax, ex.targetReps, ex.targetRpe);
      return {
        ...ex,
        sets: ex.sets.map((s) => {
          const s2 = { completed: false, ...s };
          if (!s2.weight && targetWeight) s2.weight = String(targetWeight);
          if (!s2.reps) s2.reps = String(ex.targetReps);
          if (!s2.rpe && s2.weight && s2.reps && ex.oneRepMax > 0) {
            const implied = calcImpliedRpe(s2.weight, s2.reps, ex.oneRepMax);
            if (implied !== null) s2.rpe = String(implied);
          }
          return s2;
        }),
      };
    });
    setLog(l);
    setLoading(false);
  }

  useEffect(() => { load(); }, [logId]);

  async function persistLog(updatedLog) {
    await updateLog(updatedLog.id, { exercises: updatedLog.exercises });
    setLog({ ...updatedLog });
  }

  function updateSet(exIdx, setIdx, field, value) {
    const updated = JSON.parse(JSON.stringify(log));
    const ex = updated.exercises[exIdx];
    const s = ex.sets[setIdx];
    s[field] = value;

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

  function toggleSetComplete(exIdx, setIdx) {
    const updated = JSON.parse(JSON.stringify(log));
    updated.exercises[exIdx].sets[setIdx].completed = !updated.exercises[exIdx].sets[setIdx].completed;
    persistLog(updated);
  }

  function addSet(exIdx) {
    const updated = JSON.parse(JSON.stringify(log));
    const ex = updated.exercises[exIdx];
    const last = ex.sets[ex.sets.length - 1] || {};
    ex.sets.push({ id: generateId(), weight: last.weight || "", reps: last.reps || "", rpe: "", completed: false });
    persistLog(updated);
  }

  function removeSet(exIdx, setIdx) {
    const updated = JSON.parse(JSON.stringify(log));
    const ex = updated.exercises[exIdx];
    if (ex.sets.length <= 1) return;
    ex.sets.splice(setIdx, 1);
    persistLog(updated);
  }

  async function handleAddExercise(exData, permanent) {
    const updated = JSON.parse(JSON.stringify(log));
    const targetWeight = calcTargetWeight(exData.oneRepMax, exData.targetReps, exData.targetRpe);
    const w = targetWeight ? String(targetWeight) : "";
    const r = String(exData.targetReps);
    const impliedRpe = w && r && exData.oneRepMax > 0 ? String(calcImpliedRpe(w, r, exData.oneRepMax) ?? "") : "";

    const newEx = {
      exerciseId: generateId(),
      name: exData.name,
      targetReps: exData.targetReps,
      targetRpe: exData.targetRpe,
      oneRepMax: exData.oneRepMax,
      temporary: !permanent,
      sets: Array.from({ length: exData.sets }, () => ({
        id: generateId(), weight: w, reps: r, rpe: impliedRpe, completed: false,
      })),
    };

    updated.exercises.push(newEx);
    await persistLog(updated);

    if (permanent && log.programId && log.sessionId) {
      await addExercise(log.programId, log.sessionId, {
        name: exData.name,
        sets: exData.sets,
        targetReps: exData.targetReps,
        targetRpe: exData.targetRpe,
        oneRepMax: exData.oneRepMax,
      });
    }
  }

  async function handleComplete() {
    const program = log.programId ? await getProgram(log.programId) : null;
    const result = await completeLog(logId);
    const freshLog = await getLog(logId);
    const feedback = generateWorkoutFeedback(freshLog, result.weekCompleted, result.newWeek, program);
    setCompletionData({ feedback, log: freshLog, program });
  }

  if (loading || !log) return <div style={{ color: "#888", padding: 32, textAlign: "center" }}>Laden...</div>;

  if (completionData) {
    return (
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
          <div style={{ fontSize: 28 }}>🏆</div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 20 }}>Training voltooid!</div>
            <div style={{ color: "#888", fontSize: 13 }}>{completionData.log.sessionName} · {completionData.log.date}</div>
          </div>
        </div>
        <CompletionScreen
          log={completionData.log}
          feedback={completionData.feedback}
          program={completionData.program}
          onDone={() => router.push("/")}
        />
      </div>
    );
  }

  if (log.status === "completed") {
    return (
      <div style={{ textAlign: "center", padding: "60px 16px" }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>✓</div>
        <div style={{ fontWeight: 700, fontSize: 20, marginBottom: 8 }}>Training voltooid!</div>
        <button onClick={() => router.push("/")} style={{ background: "#e63946", color: "#fff", padding: "14px 32px", fontSize: 16, marginTop: 16 }}>
          Naar dashboard
        </button>
      </div>
    );
  }

  const totalSets = log.exercises.reduce((a, ex) => a + ex.sets.length, 0);
  const completedSets = log.exercises.reduce((a, ex) => a + ex.sets.filter((s) => s.completed).length, 0);

  return (
    <div>
      <div style={{
        display: "flex", alignItems: "center", gap: 12, marginBottom: 6,
        position: "sticky", top: 0, background: "#0a0a0a", zIndex: 10,
        paddingTop: 8, paddingBottom: 8,
      }}>
        <button onClick={() => router.push("/")} style={{ background: "transparent", color: "#888", padding: "4px 0", fontSize: 22, flexShrink: 0 }}>←</button>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 800, fontSize: 18 }}>{log.sessionName}</div>
          <div style={{ color: "#888", fontSize: 12 }}>
            {log.date}
            {log.weekNumber ? ` · Week ${log.weekNumber}` : ""}
            {" · "}{completedSets}/{totalSets} sets afgevinkt
          </div>
        </div>
      </div>

      <div style={{ height: 3, background: "#2a2a2a", borderRadius: 2, marginBottom: 16, overflow: "hidden" }}>
        <div style={{
          height: "100%", background: "#2d9e47", borderRadius: 2,
          width: totalSets > 0 ? `${(completedSets / totalSets) * 100}%` : "0%",
          transition: "width 0.3s",
        }} />
      </div>

      <div style={{ display: "flex", gap: 12, marginBottom: 20, padding: "8px 12px", background: "#111", borderRadius: 8 }}>
        {[["green", "Op schema"], ["orange", "±1–1.5 RPE"], ["red", ">1.5 RPE"]].map(([color, label]) => (
          <div key={color} style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <div style={{ width: 10, height: 10, borderRadius: "50%", background: RPE_COLOR_MAP[color] }} />
            <span style={{ fontSize: 11, color: "#888" }}>{label}</span>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        {log.exercises.map((ex, exIdx) => {
          const targetWeight = calcTargetWeight(ex.oneRepMax, ex.targetReps, ex.targetRpe);
          const lowRpeSets = ex.sets.filter((s) => s.rpe !== "" && (ex.targetRpe - Number(s.rpe)) >= 2);
          const showWeakling = lowRpeSets.length > 0;

          return (
            <div key={ex.exerciseId} style={{ background: "#111", border: "1px solid #2a2a2a", borderRadius: 14 }}>
              <div style={{ padding: "14px 16px", borderBottom: "1px solid #2a2a2a" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  <div style={{ fontWeight: 700, fontSize: 17 }}>{ex.name}</div>
                  {ex.temporary && (
                    <span style={{ fontSize: 10, background: "#1a1a00", color: "#e0c060", borderRadius: 4, padding: "2px 6px" }}>eenmalig</span>
                  )}
                </div>
                <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                  <div style={{ fontSize: 13, color: "#888" }}>{ex.sets.length} sets × {ex.targetReps} reps</div>
                  <div style={{ fontSize: 13, color: "#888" }}>Target RPE: <span style={{ color: "#f0f0f0", fontWeight: 600 }}>{ex.targetRpe}</span></div>
                  {targetWeight && <div style={{ fontSize: 13, color: "#e63946", fontWeight: 600 }}>~{targetWeight} kg</div>}
                  {ex.oneRepMax > 0 && <div style={{ fontSize: 13, color: "#888" }}>1RM: {ex.oneRepMax} kg</div>}
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "36px 28px 1fr 1fr 1fr 32px", gap: 5, padding: "8px 12px 4px", alignItems: "center" }}>
                <div style={{ fontSize: 11, color: "#888", textAlign: "center" }}>✓</div>
                <div style={{ fontSize: 11, color: "#888" }}>#</div>
                <div style={{ fontSize: 11, color: "#888", textAlign: "center" }}>Gewicht</div>
                <div style={{ fontSize: 11, color: "#888", textAlign: "center" }}>Reps</div>
                <div style={{ fontSize: 11, color: "#888", textAlign: "center" }}>RPE</div>
                <div />
              </div>

              <div style={{ padding: "0 12px 14px" }}>
                {ex.sets.map((s, setIdx) => {
                  const color = rpeColor(Number(s.rpe), ex.targetRpe);
                  const e1rm = s.weight && s.reps ? calcE1RM(Number(s.weight), Number(s.reps)) : null;
                  const isWeak = s.rpe !== "" && (ex.targetRpe - Number(s.rpe)) >= 2;

                  return (
                    <div key={s.id} style={{ marginBottom: 8, opacity: s.completed ? 0.55 : 1, transition: "opacity 0.2s" }}>
                      <div style={{ display: "grid", gridTemplateColumns: "36px 28px 1fr 1fr 1fr 32px", gap: 5, alignItems: "center" }}>
                        <button
                          onClick={() => toggleSetComplete(exIdx, setIdx)}
                          style={{
                            background: s.completed ? "#2d9e47" : "#1a1a1a",
                            border: `2px solid ${s.completed ? "#2d9e47" : "#3a3a3a"}`,
                            borderRadius: 6, width: 30, height: 30,
                            display: "flex", alignItems: "center", justifyContent: "center",
                            color: "#fff", fontSize: 14, padding: 0, transition: "background 0.15s, border-color 0.15s",
                          }}
                        >{s.completed ? "✓" : ""}</button>

                        <div style={{
                          width: 24, height: 24, borderRadius: "50%",
                          background: color ? RPE_COLOR_MAP[color] : "#2a2a2a",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: 12, fontWeight: 700, color: "#fff", transition: "background 0.2s",
                        }}>{setIdx + 1}</div>

                        <input type="number" min="0" step="2.5" value={s.weight}
                          onChange={(e) => updateSet(exIdx, setIdx, "weight", e.target.value)}
                          style={{ padding: "10px 6px", fontSize: 15, textAlign: "center", borderRadius: 8, border: `1px solid ${color ? RPE_COLOR_MAP[color] + "66" : "#2a2a2a"}`, background: "#1a1a1a", color: "#f0f0f0" }}
                        />

                        <input type="number" min="1" step="1" value={s.reps}
                          onChange={(e) => updateSet(exIdx, setIdx, "reps", e.target.value)}
                          style={{ padding: "10px 6px", fontSize: 15, textAlign: "center", borderRadius: 8, border: `1px solid ${color ? RPE_COLOR_MAP[color] + "66" : "#2a2a2a"}`, background: "#1a1a1a", color: "#f0f0f0" }}
                        />

                        <input type="number" min="5" max="10" step="0.5" value={s.rpe}
                          onChange={(e) => updateSet(exIdx, setIdx, "rpe", e.target.value)}
                          style={{
                            padding: "10px 6px", fontSize: 15, textAlign: "center", borderRadius: 8,
                            border: `2px solid ${isWeak ? "#e63946" : (color ? RPE_COLOR_MAP[color] + "66" : "#2a2a2a")}`,
                            background: isWeak ? "#1a0505" : "#1a1a1a",
                            color: isWeak ? "#e63946" : "#f0f0f0",
                            fontWeight: isWeak ? 700 : 400,
                          }}
                        />

                        <button onClick={() => removeSet(exIdx, setIdx)} disabled={ex.sets.length <= 1}
                          style={{ background: "transparent", color: "#888", padding: 0, fontSize: 18, lineHeight: 1, width: 28, height: 28 }}
                        >×</button>
                      </div>

                      {e1rm && (
                        <div style={{ fontSize: 11, color: "#888", paddingLeft: 70, marginTop: 2 }}>
                          e1RM: ~{e1rm} kg
                          {ex.oneRepMax > 0 && s.rpe && <span style={{ marginLeft: 8, color: "#666" }}>· RPE auto</span>}
                        </div>
                      )}
                    </div>
                  );
                })}

                <button onClick={() => addSet(exIdx)}
                  style={{ background: "#1a1a1a", color: "#888", width: "100%", padding: "10px 0", fontSize: 13, border: "1px dashed #2a2a2a", borderRadius: 8, marginTop: 4 }}
                >
                  + Set toevoegen
                </button>

                {showWeakling && (
                  <div style={{ marginTop: 10, background: "#1a0000", border: "2px solid #e63946", borderRadius: 10, padding: "12px 14px" }}>
                    <div style={{ fontWeight: 800, fontSize: 15, color: "#e63946", marginBottom: 4, letterSpacing: 0.5 }}>⚠ WEAKLING ALERT</div>
                    <div style={{ fontSize: 13, color: "#f0a0a0", lineHeight: 1.5 }}>
                      Je traint {Math.round(ex.targetRpe - Math.min(...lowRpeSets.map((s) => Number(s.rpe))))} RPE punten onder je target ({ex.targetRpe}).
                      Zet meer gewicht op de stang of wees eerlijk over je RPE.
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <button
        onClick={() => setShowAddExercise(true)}
        style={{
          background: "#1a1a1a", color: "#e63946", width: "100%",
          padding: "14px 0", fontSize: 14, border: "1px dashed #e6394644", borderRadius: 10, marginTop: 12,
        }}
      >
        + Oefening toevoegen
      </button>

      <div style={{ marginTop: 20, paddingBottom: 8 }}>
        {!confirming ? (
          <button
            onClick={() => setConfirming(true)}
            style={{ background: "#e63946", color: "#fff", width: "100%", padding: "18px 0", fontSize: 17, fontWeight: 700, borderRadius: 12 }}
          >
            Training afronden · {completedSets}/{totalSets} sets ✓
          </button>
        ) : (
          <div style={{ background: "#111", border: "1px solid #e63946", borderRadius: 12, padding: 16 }}>
            <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 8, textAlign: "center" }}>Training afronden?</div>
            {completedSets < totalSets && (
              <div style={{ fontSize: 13, color: "#e67e22", textAlign: "center", marginBottom: 12 }}>
                {totalSets - completedSets} set{totalSets - completedSets !== 1 ? "s" : ""} nog niet afgevinkt.
              </div>
            )}
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={handleComplete} style={{ background: "#e63946", color: "#fff", flex: 1, padding: "14px 0", fontSize: 15, borderRadius: 8 }}>
                Ja, afronden
              </button>
              <button onClick={() => setConfirming(false)} style={{ background: "#2a2a2a", color: "#f0f0f0", flex: 1, padding: "14px 0", fontSize: 15, borderRadius: 8 }}>
                Annuleer
              </button>
            </div>
          </div>
        )}
      </div>

      {showAddExercise && (
        <AddExerciseModal onClose={() => setShowAddExercise(false)} onAdd={handleAddExercise} />
      )}
    </div>
  );
}
