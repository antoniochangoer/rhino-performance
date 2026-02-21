"use client";

import { useState, useEffect, useRef, use } from "react";
import { useRouter } from "next/navigation";
import {
  getProgram, updateProgram,
  addSession, deleteSession, updateSession,
  addExercise, deleteExercise, updateExercise,
  calcTargetWeight,
  shareProgram, getSharedWith, unshareProgram,
} from "@/lib/storage";
import { searchExercises } from "@/lib/exercises";

export default function ProgramDetailPage({ params }) {
  const { id } = use(params);
  const router = useRouter();
  const [program, setProgram] = useState(null);
  const [editingName, setEditingName] = useState(false);
  const [programName, setProgramName] = useState("");
  const [newSessionName, setNewSessionName] = useState("");
  const [addingSession, setAddingSession] = useState(false);
  const [expandedSession, setExpandedSession] = useState(null);
  const [addingExercise, setAddingExercise] = useState(null);
  const [exForm, setExForm] = useState({ name: "", sets: 3, targetReps: 5, targetRpe: 8, oneRepMax: "" });
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const suggestionsRef = useRef(null);

  // Sharing state
  const [showShare, setShowShare] = useState(false);
  const [shareInput, setShareInput] = useState("");
  const [shareError, setShareError] = useState("");
  const [sharedWith, setSharedWith] = useState([]);

  async function load() {
    const p = await getProgram(id);
    if (!p) { router.push("/programs"); return; }
    setProgram(p);
    setProgramName(p.name);
    if (p.sessions.length > 0 && !expandedSession) {
      setExpandedSession(p.sessions[0].id);
    }
  }

  async function loadShares() {
    const shares = await getSharedWith(id);
    setSharedWith(shares);
  }

  useEffect(() => {
    load();
    loadShares();
  }, [id]);

  async function saveProgramName() {
    if (!programName.trim()) return;
    await updateProgram(id, { name: programName.trim() });
    setEditingName(false);
    await load();
  }

  async function handleAddSession(e) {
    e.preventDefault();
    if (!newSessionName.trim()) return;
    const s = await addSession(id, { name: newSessionName.trim() });
    setNewSessionName("");
    setAddingSession(false);
    await load();
    if (s) setExpandedSession(s.id);
  }

  async function handleDeleteSession(sessionId, name) {
    if (!confirm(`Weet je zeker dat je training "${name}" wilt verwijderen?\n\nAlle oefeningen in deze training worden ook verwijderd.`)) return;
    await deleteSession(id, sessionId);
    await load();
  }

  async function handleAddExercise(e, sessionId) {
    e.preventDefault();
    if (!exForm.name.trim()) return;
    await addExercise(id, sessionId, {
      name: exForm.name.trim(),
      sets: exForm.sets,
      targetReps: exForm.targetReps,
      targetRpe: exForm.targetRpe,
      oneRepMax: exForm.oneRepMax,
    });
    setExForm({ name: "", sets: 3, targetReps: 5, targetRpe: 8, oneRepMax: "" });
    setAddingExercise(null);
    await load();
  }

  async function handleDeleteExercise(sessionId, exerciseId, name) {
    if (!confirm(`Weet je zeker dat je oefening "${name}" wilt verwijderen?`)) return;
    await deleteExercise(id, sessionId, exerciseId);
    await load();
  }

  async function handleUpdate1RM(sessionId, exerciseId, val) {
    await updateExercise(id, sessionId, exerciseId, { oneRepMax: Number(val) });
    await load();
  }

  async function handleShare(e) {
    e.preventDefault();
    if (!shareInput.trim()) return;
    setShareError("");
    const result = await shareProgram(id, shareInput.trim());
    if (result.error) {
      setShareError(result.error);
    } else {
      setShareInput("");
      await loadShares();
    }
  }

  async function handleUnshare(userId) {
    await unshareProgram(id, userId);
    await loadShares();
  }

  if (!program) return <div style={{ color: "#888", padding: 32, textAlign: "center" }}>Laden...</div>;

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
        <button onClick={() => router.push("/programs")} style={{ background: "transparent", color: "#888", padding: "4px 0", fontSize: 22 }}>←</button>
        {editingName ? (
          <div style={{ display: "flex", gap: 8, flex: 1 }}>
            <input value={programName} onChange={(e) => setProgramName(e.target.value)} style={{ flex: 1 }} autoFocus />
            <button onClick={saveProgramName} style={{ background: "#e63946", color: "#fff", padding: "8px 14px", fontSize: 14 }}>OK</button>
          </div>
        ) : (
          <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1 }}>
            <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0, flex: 1 }}>{program.name}</h1>
            <button onClick={() => setEditingName(true)} style={{ background: "transparent", color: "#888", padding: "4px 8px", fontSize: 13, border: "1px solid #2a2a2a", borderRadius: 6 }}>
              Bewerk
            </button>
            <button
              onClick={() => { setShowShare((v) => !v); loadShares(); }}
              style={{ background: showShare ? "#e63946" : "transparent", color: showShare ? "#fff" : "#888", padding: "4px 8px", fontSize: 13, border: "1px solid #2a2a2a", borderRadius: 6 }}
            >
              Deel
            </button>
          </div>
        )}
      </div>

      {/* Share panel */}
      {showShare && (
        <div style={{ background: "#111", border: "1px solid #2a2a2a", borderRadius: 12, padding: 16, marginBottom: 20 }}>
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 12 }}>Schema delen</div>
          <form onSubmit={handleShare} style={{ display: "flex", gap: 8, marginBottom: 12 }}>
            <input
              value={shareInput}
              onChange={(e) => setShareInput(e.target.value)}
              placeholder="Gebruikersnaam van gym partner"
              style={{ flex: 1 }}
            />
            <button type="submit" style={{ background: "#e63946", color: "#fff", padding: "8px 14px", fontSize: 14, flexShrink: 0 }}>
              Delen
            </button>
          </form>
          {shareError && (
            <div style={{ color: "#e63946", fontSize: 13, marginBottom: 10 }}>{shareError}</div>
          )}
          {sharedWith.length > 0 && (
            <div>
              <div style={{ fontSize: 12, color: "#888", marginBottom: 6 }}>Gedeeld met:</div>
              {sharedWith.map((u) => (
                <div key={u.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderBottom: "1px solid #1a1a1a" }}>
                  <span style={{ fontSize: 14 }}>{u.username}</span>
                  <button onClick={() => handleUnshare(u.id)} style={{ background: "transparent", color: "#444", fontSize: 16, padding: "2px 6px" }}>×</button>
                </div>
              ))}
            </div>
          )}
          {sharedWith.length === 0 && (
            <div style={{ fontSize: 13, color: "#555" }}>Nog niet gedeeld met niemand.</div>
          )}
        </div>
      )}

      {/* Sessions */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {program.sessions.map((session, sIdx) => (
          <div key={session.id} style={{ background: "#111", border: "1px solid #2a2a2a", borderRadius: 12, overflow: "hidden" }}>
            {/* Session header */}
            <div
              style={{ display: "flex", alignItems: "center", padding: "14px 16px", cursor: "pointer", userSelect: "none" }}
              onClick={() => setExpandedSession(expandedSession === session.id ? null : session.id)}
            >
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 16 }}>{session.name}</div>
                <div style={{ fontSize: 13, color: "#888", marginTop: 2 }}>
                  {session.exercises.length} oefening{session.exercises.length !== 1 ? "en" : ""}
                  {program.currentIndex % program.sessions.length === sIdx && (
                    <span style={{ marginLeft: 8, color: "#e63946" }}>● Volgende</span>
                  )}
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <button
                  onClick={(e) => { e.stopPropagation(); handleDeleteSession(session.id, session.name); }}
                  style={{ background: "transparent", color: "#888", padding: "4px 8px", fontSize: 18 }}
                >×</button>
                <span style={{ color: "#888", fontSize: 18 }}>{expandedSession === session.id ? "▲" : "▼"}</span>
              </div>
            </div>

            {/* Session exercises */}
            {expandedSession === session.id && (
              <div style={{ borderTop: "1px solid #2a2a2a", padding: "12px 16px" }}>
                {session.exercises.length === 0 && (
                  <p style={{ color: "#888", fontSize: 14, margin: "0 0 12px" }}>Nog geen oefeningen.</p>
                )}
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {session.exercises.map((ex) => {
                    const targetWeight = calcTargetWeight(ex.oneRepMax, ex.targetReps, ex.targetRpe);
                    return (
                      <div key={ex.id} style={{ background: "#1a1a1a", borderRadius: 10, padding: "12px 14px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                          <div>
                            <div style={{ fontWeight: 600, fontSize: 15 }}>{ex.name}</div>
                            <div style={{ fontSize: 13, color: "#888", marginTop: 2 }}>
                              {ex.sets} sets × {ex.targetReps} reps @ RPE {ex.targetRpe}
                            </div>
                            {targetWeight && (
                              <div style={{ fontSize: 13, color: "#e63946", marginTop: 2 }}>
                                Target: ~{targetWeight} kg
                              </div>
                            )}
                          </div>
                          <button
                            onClick={() => handleDeleteExercise(session.id, ex.id, ex.name)}
                            style={{ background: "transparent", color: "#888", padding: "2px 6px", fontSize: 16 }}
                          >×</button>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <label style={{ fontSize: 12, color: "#888", whiteSpace: "nowrap" }}>1RM (kg):</label>
                          <input
                            type="number"
                            min="0"
                            step="2.5"
                            value={ex.oneRepMax || ""}
                            onChange={(e) => handleUpdate1RM(session.id, ex.id, e.target.value)}
                            placeholder="0"
                            style={{ width: 80, padding: "6px 10px", fontSize: 14 }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Add exercise form */}
                {addingExercise === session.id ? (
                  <form onSubmit={(e) => handleAddExercise(e, session.id)} style={{ marginTop: 12, background: "#1a1a1a", borderRadius: 10, padding: 14 }}>
                    <div style={{ marginBottom: 10, position: "relative" }} ref={suggestionsRef}>
                      <label style={{ fontSize: 13, color: "#888", display: "block", marginBottom: 4 }}>Oefening naam *</label>
                      <input
                        value={exForm.name}
                        onChange={(e) => {
                          const val = e.target.value;
                          setExForm({ ...exForm, name: val });
                          setSuggestions(searchExercises(val));
                          setShowSuggestions(true);
                        }}
                        onFocus={() => {
                          if (exForm.name) {
                            setSuggestions(searchExercises(exForm.name));
                            setShowSuggestions(true);
                          }
                        }}
                        onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                        placeholder="bijv. Back Squat"
                        autoFocus
                        required
                        autoComplete="off"
                      />
                      {showSuggestions && suggestions.length > 0 && (
                        <div style={{
                          position: "absolute", top: "100%", left: 0, right: 0,
                          background: "#222", border: "1px solid #3a3a3a",
                          borderRadius: "0 0 8px 8px", zIndex: 50, overflow: "hidden", marginTop: 2,
                        }}>
                          {suggestions.map((name) => (
                            <button
                              key={name}
                              type="button"
                              onMouseDown={(e) => {
                                e.preventDefault();
                                setExForm({ ...exForm, name });
                                setSuggestions([]);
                                setShowSuggestions(false);
                              }}
                              style={{
                                display: "block", width: "100%", textAlign: "left",
                                padding: "10px 14px", background: "transparent",
                                color: "#f0f0f0", fontSize: 14,
                                borderBottom: "1px solid #2a2a2a", borderRadius: 0, fontWeight: 400,
                              }}
                            >
                              {name}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
                      <div>
                        <label style={{ fontSize: 13, color: "#888", display: "block", marginBottom: 4 }}>Sets</label>
                        <input type="number" min="1" max="20" value={exForm.sets} onChange={(e) => setExForm({ ...exForm, sets: e.target.value })} />
                      </div>
                      <div>
                        <label style={{ fontSize: 13, color: "#888", display: "block", marginBottom: 4 }}>Reps</label>
                        <input type="number" min="1" max="20" value={exForm.targetReps} onChange={(e) => setExForm({ ...exForm, targetReps: e.target.value })} />
                      </div>
                      <div>
                        <label style={{ fontSize: 13, color: "#888", display: "block", marginBottom: 4 }}>Target RPE</label>
                        <input type="number" min="6" max="10" step="0.5" value={exForm.targetRpe} onChange={(e) => setExForm({ ...exForm, targetRpe: e.target.value })} />
                      </div>
                      <div>
                        <label style={{ fontSize: 13, color: "#888", display: "block", marginBottom: 4 }}>1RM (kg)</label>
                        <input type="number" min="0" step="2.5" value={exForm.oneRepMax} onChange={(e) => setExForm({ ...exForm, oneRepMax: e.target.value })} placeholder="optioneel" />
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button type="submit" style={{ background: "#e63946", color: "#fff", flex: 1, padding: "10px 0", fontSize: 14 }}>
                        Toevoegen
                      </button>
                      <button type="button" onClick={() => setAddingExercise(null)} style={{ background: "#2a2a2a", color: "#f0f0f0", flex: 1, padding: "10px 0", fontSize: 14 }}>
                        Annuleer
                      </button>
                    </div>
                  </form>
                ) : (
                  <button
                    onClick={() => { setAddingExercise(session.id); setExForm({ name: "", sets: 3, targetReps: 5, targetRpe: 8, oneRepMax: "" }); }}
                    style={{ marginTop: 12, background: "#1a1a1a", color: "#888", width: "100%", padding: 12, fontSize: 14, border: "1px dashed #2a2a2a", borderRadius: 8 }}
                  >
                    + Oefening toevoegen
                  </button>
                )}
              </div>
            )}
          </div>
        ))}

        {/* Add session */}
        {addingSession ? (
          <form onSubmit={handleAddSession} style={{ background: "#111", border: "1px solid #2a2a2a", borderRadius: 12, padding: 16 }}>
            <label style={{ fontSize: 14, color: "#888", display: "block", marginBottom: 6 }}>Training naam</label>
            <input
              value={newSessionName}
              onChange={(e) => setNewSessionName(e.target.value)}
              placeholder="bijv. Training A"
              autoFocus
              required
            />
            <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
              <button type="submit" style={{ background: "#e63946", color: "#fff", flex: 1, padding: "12px 0", fontSize: 15 }}>
                Toevoegen
              </button>
              <button type="button" onClick={() => setAddingSession(false)} style={{ background: "#2a2a2a", color: "#f0f0f0", flex: 1, padding: "12px 0", fontSize: 15 }}>
                Annuleer
              </button>
            </div>
          </form>
        ) : (
          <button
            onClick={() => setAddingSession(true)}
            style={{ background: "transparent", color: "#888", width: "100%", padding: 16, fontSize: 15, border: "1px dashed #2a2a2a", borderRadius: 12 }}
          >
            + Training toevoegen
          </button>
        )}
      </div>
    </div>
  );
}
