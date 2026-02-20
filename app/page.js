"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getPrograms, getActiveLog, startTraining, getLogs, calcWeeklyTargets, getNextWeekPreview, setActiveProgram } from "@/lib/storage";

export default function DashboardPage() {
  const router = useRouter();
  const [programs, setPrograms] = useState([]);
  const [activeLog, setActiveLog] = useState(null);
  const [recentLogs, setRecentLogs] = useState([]);
  const [loading, setLoading] = useState(false);

  function load() {
    setPrograms(getPrograms());
    setActiveLog(getActiveLog());
    setRecentLogs(getLogs().filter((l) => l.status === "completed").slice(0, 3));
  }

  useEffect(() => { load(); }, []);

  function handleStart(programId) {
    setLoading(true);
    const log = startTraining(programId);
    if (log) router.push(`/train/${log.id}`);
    setLoading(false);
  }

  async function handleSeed() {
    const { seedTestData } = await import("@/lib/seedData");
    seedTestData();
    load();
  }

  const activeProgram = programs.find((p) => p.active) || null;
  const inactivePrograms = programs.filter((p) => !p.active);

  function ProgramCard({ p, isActive }) {
    const sessionCount = p.sessions.length;
    if (sessionCount === 0) return (
      <div style={{ background: "#0f0f0f", border: `1px solid ${isActive ? "#e63946" : "#252525"}`, borderRadius: 12, padding: "14px 16px" }}>
        <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>{p.name}</div>
        <div style={{ color: "#555", fontSize: 13, marginBottom: 12 }}>Geen trainingen in dit schema.</div>
        <Link href={`/programs/${p.id}`}>
          <button style={{ background: "#161616", color: "#f0f0f0", padding: "10px 16px", fontSize: 14, border: "1px solid #252525" }}>
            Trainingen toevoegen
          </button>
        </Link>
      </div>
    );

    const nextIdx = p.currentIndex % sessionCount;
    const nextSession = p.sessions[nextIdx];
    const currentWeek = p.currentWeek || 1;
    const totalWeeks = p.totalWeeks || null;
    const goal = p.goal || null;
    const weekProgress = sessionCount > 0 ? (nextIdx / sessionCount) * 100 : 0;
    const nextWeekPreview = isActive ? getNextWeekPreview(p) : null;
    const weekLabel = totalWeeks
      ? `Week ${currentWeek} van ${totalWeeks}`
      : `Training ${nextIdx + 1}/${sessionCount}`;

    const firstEx = p.sessions[0]?.exercises[0];
    let weekBadge = null;
    if (firstEx && totalWeeks) {
      const wt = calcWeeklyTargets(firstEx, currentWeek, totalWeeks, goal || "peaking");
      if (wt.isDeload) weekBadge = { label: "DELOAD", color: "#888", bg: "#161616" };
      else if (wt.isPeak) weekBadge = { label: "PEAK WEEK", color: "#e63946", bg: "#1a0000" };
    }

    return (
      <div style={{
        background: "#0f0f0f",
        border: `1px solid ${isActive ? "#e63946" : "#252525"}`,
        borderRadius: 12,
        padding: "14px 16px",
        position: "relative",
        overflow: "hidden",
      }}>
        {isActive && (
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: "linear-gradient(90deg, #e63946, #b8000f)" }} />
        )}

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10, paddingTop: isActive ? 4 : 0 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
              <div style={{ fontWeight: 700, fontSize: 17 }}>{p.name}</div>
              {isActive && (
                <span style={{
                  fontSize: 10, fontWeight: 800, letterSpacing: "0.08em",
                  background: "#e63946", color: "#fff",
                  borderRadius: 4, padding: "2px 7px",
                  fontFamily: "'Barlow Condensed', sans-serif",
                  textTransform: "uppercase",
                }}>ACTIEF</span>
              )}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 13, color: "#555" }}>{weekLabel}</span>
              {weekBadge && (
                <span style={{ fontSize: 11, background: weekBadge.bg, color: weekBadge.color, borderRadius: 4, padding: "2px 6px", fontWeight: 700, border: `1px solid ${weekBadge.color}44` }}>
                  {weekBadge.label}
                </span>
              )}
            </div>
          </div>
          <Link href={`/programs/${p.id}`}>
            <span style={{ color: "#444", fontSize: 12, border: "1px solid #252525", borderRadius: 6, padding: "4px 8px" }}>Bewerk</span>
          </Link>
        </div>

        {/* Week progress */}
        <div style={{ marginBottom: isActive ? 4 : 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
            <span style={{ fontSize: 11, color: "#444" }}>Week voortgang</span>
            <span style={{ fontSize: 11, color: "#444" }}>{nextIdx}/{sessionCount}</span>
          </div>
          <div style={{ height: 4, background: "#161616", borderRadius: 2, overflow: "hidden" }}>
            <div style={{ height: "100%", background: isActive ? "#e63946" : "#333", borderRadius: 2, width: `${weekProgress}%`, transition: "width 0.3s" }} />
          </div>
        </div>

        {/* Block progress */}
        {totalWeeks && isActive && (
          <div style={{ marginBottom: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
              <span style={{ fontSize: 11, color: "#333" }}>Blok progressie</span>
              <span style={{ fontSize: 11, color: "#333" }}>{Math.round(((currentWeek - 1) / totalWeeks) * 100)}%</span>
            </div>
            <div style={{ height: 3, background: "#161616", borderRadius: 2, overflow: "hidden" }}>
              <div style={{ height: "100%", background: "#c0c0c033", borderRadius: 2, width: `${((currentWeek - 1) / totalWeeks) * 100}%`, transition: "width 0.3s" }} />
            </div>
          </div>
        )}

        {/* Next session + next week preview (active only) */}
        {isActive && (
          <div style={{ display: "grid", gridTemplateColumns: nextWeekPreview ? "1fr 1fr" : "1fr", gap: 8, marginBottom: 12 }}>
            <div style={{ background: "#161616", borderRadius: 8, padding: "10px 12px" }}>
              <div style={{ fontSize: 12, color: "#444", marginBottom: 2 }}>Volgende training</div>
              <div style={{ fontWeight: 600, fontSize: 14 }}>{nextSession.name}</div>
              <div style={{ fontSize: 12, color: "#444", marginTop: 2 }}>{nextSession.exercises.length} oefeningen</div>
            </div>
            {nextWeekPreview && (
              <div style={{ background: "#161616", borderRadius: 8, padding: "10px 12px" }}>
                <div style={{ fontSize: 12, color: "#444", marginBottom: 2 }}>Week {nextWeekPreview.week} preview</div>
                <div style={{ fontWeight: 600, fontSize: 14, color: nextWeekPreview.isPeak ? "#e63946" : nextWeekPreview.isDeload ? "#555" : "#c0c0c0" }}>
                  {nextWeekPreview.isDeload ? "Deload" : nextWeekPreview.isPeak ? "Peak Week" : `RPE ${nextWeekPreview.targetRpe}`}
                </div>
                <div style={{ fontSize: 12, color: "#444", marginTop: 2 }}>
                  {nextWeekPreview.isDeload ? "Rust en herstel" : nextWeekPreview.isPeak ? "Alles eruit" : "+0.5 RPE"}
                </div>
              </div>
            )}
          </div>
        )}

        {isActive ? (
          <button
            onClick={() => handleStart(p.id)}
            disabled={loading || !!activeLog}
            style={{ background: "#e63946", color: "#fff", width: "100%", padding: "14px 0", fontSize: 16, fontWeight: 700, borderRadius: 10 }}
          >
            {activeLog ? "Eerst actieve training afronden" : `Start ${nextSession.name}`}
          </button>
        ) : (
          <button
            onClick={() => { setActiveProgram(p.id); load(); }}
            style={{ background: "#161616", color: "#c0c0c0", width: "100%", padding: "11px 0", fontSize: 13, border: "1px solid #252525", borderRadius: 8, fontWeight: 600 }}
          >
            Activeer schema
          </button>
        )}
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 28, display: "flex", alignItems: "center", gap: 14 }}>
        <img src="/logo.png" alt="Rhino Performance" style={{ height: 52, width: 52, objectFit: "contain", flexShrink: 0 }} />
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 900, margin: 0, fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: "0.04em", textTransform: "uppercase" }}>
            <span style={{ color: "#e63946" }}>Rhino</span>{" "}
            <span style={{ color: "#c0c0c0" }}>Performance</span>
          </h1>
          <p style={{ color: "#444", fontSize: 12, margin: "2px 0 0", letterSpacing: "0.08em", textTransform: "uppercase", fontWeight: 600 }}>Kracht · RPE · Progressie</p>
        </div>
      </div>

      {/* Active training banner */}
      {activeLog && (
        <div style={{
          background: "linear-gradient(135deg, #1a0505 0%, #200808 100%)",
          border: "1px solid #e63946",
          borderRadius: 14,
          padding: "16px 18px",
          marginBottom: 20,
        }}>
          <div style={{ fontSize: 11, color: "#e63946", fontWeight: 700, letterSpacing: "0.1em", marginBottom: 6, textTransform: "uppercase" }}>
            Actieve training
          </div>
          <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 4 }}>{activeLog.sessionName}</div>
          <div style={{ color: "#555", fontSize: 13, marginBottom: 14 }}>
            Gestart op {activeLog.date} · {activeLog.exercises.length} oefeningen
          </div>
          <button
            onClick={() => router.push(`/train/${activeLog.id}`)}
            style={{ background: "#e63946", color: "#fff", width: "100%", padding: "14px 0", fontSize: 16, fontWeight: 700, borderRadius: 10 }}
          >
            Doorgaan met training →
          </button>
        </div>
      )}

      {/* Empty state */}
      {programs.length === 0 && (
        <div style={{ background: "#0f0f0f", border: "1px dashed #252525", borderRadius: 14, padding: "40px 24px", textAlign: "center" }}>
          <div style={{ fontSize: 13, color: "#555", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 20 }}>Geen schema&apos;s</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <Link href="/programs/new">
              <button style={{ background: "#e63946", color: "#fff", padding: "14px 28px", fontSize: 15, fontWeight: 700, width: "100%", borderRadius: 10 }}>
                Schema aanmaken
              </button>
            </Link>
            <button
              onClick={handleSeed}
              style={{ background: "#161616", color: "#555", padding: "12px 28px", fontSize: 14, border: "1px solid #252525", borderRadius: 10 }}
            >
              Laad testdata (6 weken peaking)
            </button>
          </div>
        </div>
      )}

      {/* Seed button — always visible as dev/demo helper */}
      {programs.length > 0 && (
        <div style={{ marginBottom: 16, textAlign: "right" }}>
          <button
            onClick={handleSeed}
            style={{ background: "transparent", color: "#333", fontSize: 12, border: "1px solid #1e1e1e", borderRadius: 6, padding: "6px 12px", fontWeight: 500 }}
          >
            + Laad testdata
          </button>
        </div>
      )}

      {/* Active program — primary */}
      {activeProgram && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#e63946", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 10 }}>
            Actief schema
          </div>
          <ProgramCard p={activeProgram} isActive={true} />
        </div>
      )}

      {/* No active program but programs exist */}
      {!activeProgram && programs.length > 0 && (
        <div style={{ background: "#0f0f0f", border: "1px dashed #e6394644", borderRadius: 12, padding: "16px 18px", marginBottom: 20, textAlign: "center" }}>
          <div style={{ fontSize: 13, color: "#555", marginBottom: 8 }}>Geen schema actief</div>
          <div style={{ fontSize: 12, color: "#333" }}>Ga naar Schema&apos;s en activeer een schema om te starten.</div>
        </div>
      )}

      {/* Inactive programs */}
      {inactivePrograms.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#333", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 10 }}>
            Overige schema&apos;s
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {inactivePrograms.map((p) => (
              <ProgramCard key={p.id} p={p} isActive={false} />
            ))}
          </div>
        </div>
      )}

      {/* Recent history */}
      {recentLogs.length > 0 && (
        <div style={{ marginTop: 8 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#444", letterSpacing: "0.1em", textTransform: "uppercase" }}>Recent</div>
            <Link href="/history" style={{ fontSize: 12, color: "#e63946", fontWeight: 600 }}>Alles →</Link>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {recentLogs.map((log) => (
              <Link href={`/history/${log.id}`} key={log.id}>
                <div style={{ background: "#0f0f0f", border: "1px solid #161616", borderRadius: 10, padding: "12px 14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{log.sessionName}</div>
                    <div style={{ color: "#444", fontSize: 12, marginTop: 2 }}>{log.exercises.length} oefeningen</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 12, color: "#444" }}>{log.date}</div>
                    <div style={{ fontSize: 11, color: "#2d9e47", marginTop: 2, fontWeight: 600 }}>✓ Voltooid</div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
