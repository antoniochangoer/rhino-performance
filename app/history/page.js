"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { getLogs, getPrograms, deleteLog } from "@/lib/storage";

export default function HistoryPage() {
  const [logs, setLogs] = useState([]);
  const [programs, setPrograms] = useState([]);

  useEffect(() => {
    setLogs(getLogs().filter((l) => l.status === "completed"));
    setPrograms(getPrograms());
  }, []);

  function getProgramName(programId) {
    const p = programs.find((p) => p.id === programId);
    return p ? p.name : "Onbekend schema";
  }

  function totalSets(log) {
    return log.exercises.reduce((acc, ex) => acc + ex.sets.length, 0);
  }

  function totalVolume(log) {
    let vol = 0;
    log.exercises.forEach((ex) => {
      ex.sets.forEach((s) => {
        if (s.weight && s.reps) vol += Number(s.weight) * Number(s.reps);
      });
    });
    return vol > 0 ? vol.toLocaleString("nl") + " kg" : null;
  }

  function handleDelete(id, name, date) {
    if (!confirm(`Weet je zeker dat je de training "${name}" van ${date} wilt verwijderen?\n\nDeze actie kan niet ongedaan worden gemaakt.`)) return;
    deleteLog(id);
    setLogs(getLogs().filter((l) => l.status === "completed"));
  }

  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 700, margin: "0 0 24px" }}>Trainingshistorie</h1>

      {logs.length === 0 && (
        <div style={{ textAlign: "center", padding: "60px 0", color: "#888" }}>
          <p style={{ fontSize: 16, marginBottom: 8 }}>Nog geen afgeronde trainingen</p>
          <p style={{ fontSize: 14 }}>Start een training via het dashboard.</p>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {logs.map((log) => {
          const vol = totalVolume(log);
          return (
            <div key={log.id} style={{ position: "relative" }}>
              <Link href={`/history/${log.id}`}>
                <div style={{
                  background: "#0f0f0f",
                  border: "1px solid #1e1e1e",
                  borderRadius: 12,
                  padding: "14px 48px 14px 16px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 16 }}>{log.sessionName}</div>
                    <div style={{ color: "#555", fontSize: 13, marginTop: 2 }}>{getProgramName(log.programId)}</div>
                    <div style={{ display: "flex", gap: 12, marginTop: 6 }}>
                      <span style={{ fontSize: 12, color: "#444" }}>{log.exercises.length} oefeningen</span>
                      <span style={{ fontSize: 12, color: "#444" }}>{totalSets(log)} sets</span>
                      {vol && <span style={{ fontSize: 12, color: "#444" }}>{vol} volume</span>}
                    </div>
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <div style={{ fontSize: 13, color: "#555" }}>{log.date}</div>
                    <div style={{ fontSize: 12, color: "#2d9e47", marginTop: 4, fontWeight: 600 }}>✓</div>
                  </div>
                </div>
              </Link>
              {/* Delete button — outside the Link to avoid navigation */}
              <button
                onClick={(e) => { e.preventDefault(); handleDelete(log.id, log.sessionName, log.date); }}
                style={{
                  position: "absolute", top: "50%", right: 12, transform: "translateY(-50%)",
                  background: "transparent", color: "#333", fontSize: 18, lineHeight: 1,
                  padding: "4px 6px", border: "none",
                }}
              >
                ×
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
