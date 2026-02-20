"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { getPrograms, deleteProgram, setActiveProgram } from "@/lib/storage";

export default function ProgramsPage() {
  const [programs, setPrograms] = useState([]);

  useEffect(() => {
    setPrograms(getPrograms());
  }, []);

  function handleDelete(id, name) {
    if (!confirm(`Weet je zeker dat je schema "${name}" wilt verwijderen?\n\nDit verwijdert ook alle gekoppelde trainingen.`)) return;
    deleteProgram(id);
    setPrograms(getPrograms());
  }

  function handleActivate(id) {
    setActiveProgram(id);
    setPrograms(getPrograms());
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <h1 style={{ fontSize: 26, fontWeight: 900, margin: 0, fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: "0.04em", textTransform: "uppercase", color: "#f0f0f0" }}>
          Schema&apos;s
        </h1>
        <Link href="/programs/new">
          <button style={{ background: "#e63946", color: "#fff", padding: "10px 18px", fontSize: 13, fontWeight: 700, letterSpacing: "0.04em" }}>
            + Nieuw
          </button>
        </Link>
      </div>

      {programs.length === 0 && (
        <div style={{ textAlign: "center", padding: "60px 0", color: "#555" }}>
          <p style={{ fontSize: 16, marginBottom: 8, color: "#888" }}>Nog geen schema&apos;s</p>
          <p style={{ fontSize: 14 }}>Maak je eerste trainingsschema aan.</p>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {programs.map((p) => {
          const nextSession = p.sessions[p.currentIndex % Math.max(p.sessions.length, 1)];
          const isActive = p.active === true;

          return (
            <div key={p.id} style={{
              background: "#0f0f0f",
              border: `1px solid ${isActive ? "#e63946" : "#252525"}`,
              borderRadius: 12,
              padding: 16,
              position: "relative",
              overflow: "hidden",
            }}>
              {/* Active accent line */}
              {isActive && (
                <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: "linear-gradient(90deg, #e63946, #b8000f)" }} />
              )}

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div style={{ flex: 1, paddingTop: isActive ? 4 : 0 }}>
                  {/* Name + active badge */}
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <div style={{ fontWeight: 700, fontSize: 16 }}>{p.name}</div>
                    {isActive && (
                      <span style={{
                        fontSize: 10, fontWeight: 800, letterSpacing: "0.08em",
                        background: "#e63946", color: "#fff",
                        borderRadius: 4, padding: "2px 7px",
                        fontFamily: "'Barlow Condensed', sans-serif",
                        textTransform: "uppercase",
                      }}>
                        ACTIEF
                      </span>
                    )}
                  </div>

                  {p.description && (
                    <div style={{ color: "#555", fontSize: 13, marginBottom: 6 }}>{p.description}</div>
                  )}

                  <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
                    <span style={{ fontSize: 12, color: "#555" }}>
                      {p.sessions.length} training{p.sessions.length !== 1 ? "en" : ""}
                    </span>
                    {p.goal && (
                      <span style={{ fontSize: 12, color: "#555", textTransform: "capitalize" }}>{p.goal}</span>
                    )}
                    {p.totalWeeks && (
                      <span style={{ fontSize: 12, color: "#555" }}>{p.totalWeeks} weken</span>
                    )}
                    {p.currentWeek && p.totalWeeks && (
                      <span style={{ fontSize: 12, color: "#c0c0c0", fontWeight: 600 }}>
                        Week {p.currentWeek}/{p.totalWeeks}
                      </span>
                    )}
                    {nextSession && (
                      <span style={{ fontSize: 12, color: "#e63946" }}>
                        Volgende: {nextSession.name}
                      </span>
                    )}
                  </div>
                </div>

                <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                  <Link href={`/programs/${p.id}`}>
                    <button style={{ background: "#161616", color: "#c0c0c0", padding: "8px 12px", fontSize: 12, border: "1px solid #252525", fontWeight: 600 }}>
                      Bewerk
                    </button>
                  </Link>
                  <button
                    onClick={() => handleDelete(p.id, p.name)}
                    style={{ background: "transparent", color: "#444", padding: "8px 10px", fontSize: 18, lineHeight: 1 }}
                  >
                    ×
                  </button>
                </div>
              </div>

              {/* Activate button — only when not already active */}
              {!isActive && (
                <button
                  onClick={() => handleActivate(p.id)}
                  style={{
                    marginTop: 12, width: "100%", background: "#161616",
                    color: "#c0c0c0", border: "1px solid #252525",
                    padding: "10px 0", fontSize: 13, fontWeight: 600, borderRadius: 8,
                  }}
                >
                  Activeer schema
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
