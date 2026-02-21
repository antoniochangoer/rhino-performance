"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getProfile, updateUsername, getGymPartners } from "@/lib/storage";
import { getSupabase } from "@/lib/supabase";

export default function ProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState(null);
  const [partners, setPartners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingUsername, setEditingUsername] = useState(false);
  const [newUsername, setNewUsername] = useState("");
  const [usernameError, setUsernameError] = useState("");
  const [usernameSaved, setUsernameSaved] = useState(false);

  async function load() {
    setLoading(true);
    const [p, gym] = await Promise.all([getProfile(), getGymPartners()]);
    setProfile(p);
    setPartners(gym);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

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
      await load();
    }
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
