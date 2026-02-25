"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  getProfile, updateUsername, getGymPartners,
  getPendingShareRequests, acceptShareRequest, declineShareRequest,
  getMainLifts1RM, saveMainLifts1RM, updateProfileHR, getCardioActivities,
} from "@/lib/storage";
import { getSupabase } from "@/lib/supabase";
import { getMaxHR, getKarvonenZones, ageFromBirthYear } from "@/lib/hrZones";

export default function ProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState(null);
  const [partners, setPartners] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingUsername, setEditingUsername] = useState(false);
  const [newUsername, setNewUsername] = useState("");
  const [usernameError, setUsernameError] = useState("");
  const [usernameSaved, setUsernameSaved] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);
  const [mainLifts, setMainLifts] = useState({ squat: "", bench: "", deadlift: "", ohp: "" });
  const [mainLiftsSaved, setMainLiftsSaved] = useState(false);
  const [birthYear, setBirthYear] = useState("");
  const [restingHeartRate, setRestingHeartRate] = useState("");
  const [hrSaved, setHrSaved] = useState(false);
  const [cardioSummary, setCardioSummary] = useState({ aerobic: 0, anaerobic: 0 });

  async function load(showSpinner = false) {
    if (showSpinner) setLoading(true);
    const [p, gym, reqs] = await Promise.all([
      getProfile(),
      getGymPartners(),
      getPendingShareRequests(),
    ]);
    setProfile(p);
    setPartners(gym);
    setRequests(reqs);
    if (showSpinner) setLoading(false);
  }

  useEffect(() => {
    load(true);
    getMainLifts1RM().then((lifts) => {
      if (lifts && Object.keys(lifts).length > 0) {
        setMainLifts({
          squat: lifts.squat || "",
          bench: lifts.bench || "",
          deadlift: lifts.deadlift || "",
          ohp: lifts.ohp || "",
        });
      }
    });
  }, []);

  useEffect(() => {
    if (profile) {
      setBirthYear(profile.birth_year ? String(profile.birth_year) : "");
      setRestingHeartRate(profile.resting_heart_rate ? String(profile.resting_heart_rate) : "");
    }
  }, [profile]);

  useEffect(() => {
    const from = new Date();
    from.setDate(from.getDate() - 14);
    getCardioActivities(from.toISOString().slice(0, 10), null).then((list) => {
      let aerobic = 0;
      let anaerobic = 0;
      for (const a of list) {
        if (a.type === "aerobic") aerobic += a.durationMinutes || 0;
        else anaerobic += a.durationMinutes || 0;
      }
      setCardioSummary({ aerobic, anaerobic });
    });
  }, [profile]);

  async function handleSaveUsername(e) {
    e.preventDefault();
    if (!newUsername.trim()) return;
    setUsernameError("");
    const result = await updateUsername(newUsername.trim());
    if (result.error) {
      setUsernameError(result.error);
    } else {
      setUsernameSaved(true);
      setEditingUsername(false);
      setTimeout(() => setUsernameSaved(false), 2000);
      await load(false);
    }
  }

  async function handleAccept(programId) {
    setActionLoading(programId + "_accept");
    await acceptShareRequest(programId);
    await load(false);
    setActionLoading(null);
  }

  async function handleDecline(programId) {
    setActionLoading(programId + "_decline");
    await declineShareRequest(programId);
    await load(false);
    setActionLoading(null);
  }

  async function handleSaveMainLifts(e) {
    e.preventDefault();
    const toSave = {};
    if (mainLifts.squat && Number(mainLifts.squat) > 0) toSave.squat = Number(mainLifts.squat);
    if (mainLifts.bench && Number(mainLifts.bench) > 0) toSave.bench = Number(mainLifts.bench);
    if (mainLifts.deadlift && Number(mainLifts.deadlift) > 0) toSave.deadlift = Number(mainLifts.deadlift);
    if (mainLifts.ohp && Number(mainLifts.ohp) > 0) toSave.ohp = Number(mainLifts.ohp);
    await saveMainLifts1RM(toSave);
    setMainLiftsSaved(true);
    setTimeout(() => setMainLiftsSaved(false), 2000);
  }

  async function handleSaveHR(e) {
    e.preventDefault();
    const result = await updateProfileHR({
      birthYear: birthYear ? Number(birthYear) : null,
      restingHeartRate: restingHeartRate ? Number(restingHeartRate) : null,
    });
    if (result.error) return;
    setHrSaved(true);
    setTimeout(() => setHrSaved(false), 2000);
    await load(false);
  }

  async function handleLogout() {
    const supabase = getSupabase();
    await supabase.auth.signOut();
    router.replace("/auth");
  }

  if (loading) return <div style={{ color: "#888", padding: 32, textAlign: "center" }}>Laden...</div>;

  return (
    <div>
      <h1 style={{
        fontSize: 26, fontWeight: 900, margin: "0 0 24px",
        fontFamily: "'Barlow Condensed', sans-serif",
        letterSpacing: "0.04em", textTransform: "uppercase", color: "#f0f0f0",
      }}>
        Profiel
      </h1>

      {/* Inkomende share requests */}
      {requests.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, color: "#e63946", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 10, display: "flex", alignItems: "center", gap: 8 }}>
            Uitnodigingen
            <span style={{ background: "#e63946", color: "#fff", borderRadius: 10, fontSize: 11, fontWeight: 800, padding: "1px 7px" }}>
              {requests.length}
            </span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {requests.map((req) => (
              <div key={req.programId} style={{ background: "#0f0f0f", border: "1px solid #e6394644", borderRadius: 12, padding: 14 }}>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10, marginBottom: 10 }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 2 }}>{req.programName}</div>
                    <div style={{ fontSize: 12, color: "#555" }}>
                      Van: <span style={{ color: "#888" }}>{req.fromUsername}</span>
                      {req.fromEmail && <span style={{ color: "#444" }}> · {req.fromEmail}</span>}
                    </div>
                    <div style={{ fontSize: 12, color: "#444", marginTop: 2 }}>
                      {req.programGoal && <span style={{ textTransform: "capitalize" }}>{req.programGoal}</span>}
                      {req.programWeeks && <span> · {req.programWeeks} weken</span>}
                    </div>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    onClick={() => handleAccept(req.programId)}
                    disabled={actionLoading !== null}
                    style={{ flex: 1, background: "#e63946", color: "#fff", padding: "10px 0", fontSize: 13, fontWeight: 700, borderRadius: 8 }}
                  >
                    {actionLoading === req.programId + "_accept" ? "..." : "Accepteren"}
                  </button>
                  <button
                    onClick={() => handleDecline(req.programId)}
                    disabled={actionLoading !== null}
                    style={{ flex: 1, background: "#1a1a1a", color: "#888", padding: "10px 0", fontSize: 13, fontWeight: 600, borderRadius: 8, border: "1px solid #2a2a2a" }}
                  >
                    {actionLoading === req.programId + "_decline" ? "..." : "Weigeren"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Account info */}
      <div style={{ background: "#0f0f0f", border: "1px solid #252525", borderRadius: 12, padding: 16, marginBottom: 16 }}>
        <div style={{ fontSize: 11, color: "#555", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 12 }}>
          Account
        </div>

        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 12, color: "#555", marginBottom: 3 }}>E-mailadres</div>
          <div style={{ fontSize: 15, color: "#f0f0f0", fontWeight: 600 }}>{profile?.email}</div>
        </div>

        <div>
          <div style={{ fontSize: 12, color: "#555", marginBottom: 6 }}>Gebruikersnaam</div>
          {editingUsername ? (
            <form onSubmit={handleSaveUsername} style={{ display: "flex", gap: 8 }}>
              <input
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                placeholder={profile?.username || "Kies een gebruikersnaam"}
                autoFocus
                style={{ flex: 1, padding: "9px 12px", fontSize: 14 }}
              />
              <button type="submit" style={{ background: "#e63946", color: "#fff", padding: "9px 14px", fontSize: 13, flexShrink: 0 }}>
                OK
              </button>
              <button type="button" onClick={() => { setEditingUsername(false); setUsernameError(""); }} style={{ background: "#2a2a2a", color: "#888", padding: "9px 12px", fontSize: 13, flexShrink: 0 }}>
                ✕
              </button>
            </form>
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: profile?.username ? "#f0f0f0" : "#555" }}>
                {profile?.username || "Nog niet ingesteld"}
              </div>
              <button
                onClick={() => { setEditingUsername(true); setNewUsername(profile?.username || ""); }}
                style={{ background: "transparent", color: "#444", fontSize: 12, border: "1px solid #252525", borderRadius: 6, padding: "4px 10px" }}
              >
                Wijzig
              </button>
              {usernameSaved && <span style={{ fontSize: 12, color: "#2d9e47", fontWeight: 600 }}>✓ Opgeslagen</span>}
            </div>
          )}
          {usernameError && <div style={{ color: "#e63946", fontSize: 13, marginTop: 6 }}>{usernameError}</div>}
          <div style={{ fontSize: 12, color: "#444", marginTop: 6 }}>
            Gym partners kunnen je vinden via je gebruikersnaam of e-mailadres.
          </div>
        </div>
      </div>

      {/* Main lifts 1RM */}
      <div style={{ background: "#0f0f0f", border: "1px solid #252525", borderRadius: 12, padding: 16, marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div style={{ fontSize: 11, color: "#555", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}>
            Main Lifts 1RM
          </div>
          {mainLiftsSaved && <span style={{ fontSize: 12, color: "#2d9e47", fontWeight: 600 }}>✓ Opgeslagen</span>}
        </div>
        <p style={{ fontSize: 12, color: "#444", marginBottom: 14, marginTop: 0 }}>
          Wordt automatisch ingevuld als je deze oefeningen aan een dag toevoegt.
        </p>
        <form onSubmit={handleSaveMainLifts}>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 14 }}>
            {[
              { key: "squat", label: "Back Squat", icon: "🏋️" },
              { key: "bench", label: "Bench Press", icon: "💪" },
              { key: "deadlift", label: "Deadlift", icon: "⛓️" },
              { key: "ohp", label: "Overhead Press", icon: "🔝" },
            ].map((lift) => (
              <div key={lift.key} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "#111", borderRadius: 8, padding: "10px 14px" }}>
                <span style={{ fontSize: 14, fontWeight: 600 }}>
                  <span style={{ marginRight: 8 }}>{lift.icon}</span>{lift.label}
                </span>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <input
                    type="number"
                    min="0"
                    step="2.5"
                    value={mainLifts[lift.key]}
                    onChange={(e) => setMainLifts((prev) => ({ ...prev, [lift.key]: e.target.value }))}
                    placeholder="0"
                    style={{ width: 80, padding: "7px 10px", fontSize: 14, textAlign: "right" }}
                  />
                  <span style={{ fontSize: 13, color: "#555", minWidth: 18 }}>kg</span>
                </div>
              </div>
            ))}
          </div>
          <button
            type="submit"
            style={{ background: "#e63946", color: "#fff", width: "100%", padding: "11px 0", fontSize: 14, fontWeight: 700, borderRadius: 8 }}
          >
            Opslaan
          </button>
        </form>
      </div>

      {/* Hartslagzones (Karvonen) */}
      <div style={{ background: "#0f0f0f", border: "1px solid #252525", borderRadius: 12, padding: 16, marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div style={{ fontSize: 11, color: "#555", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}>
            Hartslagzones
          </div>
          {hrSaved && <span style={{ fontSize: 12, color: "#2d9e47", fontWeight: 600 }}>✓ Opgeslagen</span>}
        </div>
        <p style={{ fontSize: 12, color: "#444", marginBottom: 14, marginTop: 0 }}>
          Zones worden berekend met de Karvonen-formule (max HR: Tanaka).
        </p>
        <form onSubmit={handleSaveHR}>
          <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: 12, color: "#555", display: "block", marginBottom: 4 }}>Geboortejaar</label>
              <input
                type="number"
                min="1920"
                max={new Date().getFullYear()}
                value={birthYear}
                onChange={(e) => setBirthYear(e.target.value)}
                placeholder="bijv. 1990"
                style={{ width: "100%", padding: "9px 12px", fontSize: 14, background: "#111", border: "1px solid #252525", borderRadius: 8, color: "#f0f0f0" }}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: 12, color: "#555", display: "block", marginBottom: 4 }}>Rustpols (bpm)</label>
              <input
                type="number"
                min="40"
                max="100"
                value={restingHeartRate}
                onChange={(e) => setRestingHeartRate(e.target.value)}
                placeholder="bijv. 60"
                style={{ width: "100%", padding: "9px 12px", fontSize: 14, background: "#111", border: "1px solid #252525", borderRadius: 8, color: "#f0f0f0" }}
              />
            </div>
          </div>
          <button
            type="submit"
            style={{ background: "#e63946", color: "#fff", width: "100%", padding: "10px 0", fontSize: 14, fontWeight: 700, borderRadius: 8 }}
          >
            Opslaan
          </button>
        </form>
        {(() => {
          const age = ageFromBirthYear(birthYear ? Number(birthYear) : null);
          const maxHR = age != null ? getMaxHR(age) : null;
          const restHR = restingHeartRate ? Number(restingHeartRate) : 70;
          const zones = maxHR ? getKarvonenZones(restHR, maxHR) : [];
          if (zones.length === 0) return null;
          return (
            <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid #252525" }}>
              <div style={{ fontSize: 12, color: "#555", marginBottom: 8 }}>Jouw zones</div>
              {zones.map((z) => (
                <div key={z.zone} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", fontSize: 13 }}>
                  <span style={{ color: "#888" }}>Z{z.zone} · {z.label}</span>
                  <span style={{ color: "#f0f0f0", fontWeight: 600 }}>{z.bpmMin}–{z.bpmMax} bpm</span>
                </div>
              ))}
            </div>
          );
        })()}
      </div>

      {/* Gym partners */}
      <div style={{ background: "#0f0f0f", border: "1px solid #252525", borderRadius: 12, padding: 16, marginBottom: 16 }}>
        <div style={{ fontSize: 11, color: "#555", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 12 }}>
          Gym Partners
        </div>

        {partners.length === 0 ? (
          <div style={{ color: "#444", fontSize: 14, textAlign: "center", padding: "20px 0" }}>
            <div style={{ marginBottom: 6 }}>Nog geen gym partners.</div>
            <div style={{ fontSize: 13, color: "#333" }}>Deel een schema via Schema&apos;s → Bewerk → Deel.</div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {partners.map((p) => (
              <div key={p.id} style={{ background: "#111", borderRadius: 10, padding: "12px 14px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: "50%",
                    background: "#e63946", display: "flex", alignItems: "center",
                    justifyContent: "center", fontSize: 14, fontWeight: 700, color: "#fff", flexShrink: 0,
                  }}>
                    {(p.username || p.email || "?")[0].toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{p.username || "—"}</div>
                    <div style={{ fontSize: 12, color: "#555" }}>{p.email}</div>
                  </div>
                </div>
                {p.sharedByMe.length > 0 && (
                  <div style={{ fontSize: 12, color: "#888", marginTop: 4 }}>
                    <span style={{ color: "#555" }}>Jij deelt: </span>
                    {p.sharedByMe.join(", ")}
                  </div>
                )}
                {p.sharedWithMe.length > 0 && (
                  <div style={{ fontSize: 12, color: "#888", marginTop: 2 }}>
                    <span style={{ color: "#555" }}>Zij delen: </span>
                    {p.sharedWithMe.join(", ")}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Cardio overzicht */}
      <div style={{ background: "#0f0f0f", border: "1px solid #252525", borderRadius: 12, padding: 16, marginBottom: 16 }}>
        <div style={{ fontSize: 11, color: "#555", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 12 }}>
          Cardio (laatste 14 dagen)
        </div>
        {(cardioSummary.aerobic > 0 || cardioSummary.anaerobic > 0) ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 14, color: "#2d9e47" }}>Aeroob</span>
              <span style={{ fontWeight: 700, color: "#f0f0f0" }}>{cardioSummary.aerobic} min</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 14, color: "#e67e22" }}>Anaeroob</span>
              <span style={{ fontWeight: 700, color: "#f0f0f0" }}>{cardioSummary.anaerobic} min</span>
            </div>
            <Link href="/cardio" style={{ marginTop: 8 }}>
              <span style={{ fontSize: 13, color: "#e63946", fontWeight: 600 }}>Bekijk & plan cardio →</span>
            </Link>
          </div>
        ) : (
          <div style={{ color: "#444", fontSize: 14, textAlign: "center", padding: "12px 0" }}>
            <p style={{ marginBottom: 8 }}>Nog geen cardio gelogd.</p>
            <Link href="/cardio">
              <span style={{ fontSize: 13, color: "#e63946", fontWeight: 600 }}>Cardio toevoegen →</span>
            </Link>
          </div>
        )}
      </div>

      {/* Logout */}
      <button
        onClick={handleLogout}
        style={{
          width: "100%", background: "transparent", color: "#444",
          border: "1px solid #252525", borderRadius: 10,
          padding: "14px 0", fontSize: 14, fontWeight: 600, marginTop: 8,
        }}
      >
        Uitloggen
      </button>
    </div>
  );
}
