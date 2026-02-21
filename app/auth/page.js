"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabase } from "@/lib/supabase";

export default function AuthPage() {
  const router = useRouter();
  const [mode, setMode] = useState("login"); // "login" | "register" | "forgot"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setInfo("");
    setLoading(true);

    const supabase = getSupabase();

    if (mode === "login") {
      // persistSession: true = onthoud mij (standaard), false = sessie vergeet na sluiten browser
      await supabase.auth.setSession && null; // no-op, handled via options below
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
        options: { persistSession: rememberMe },
      });
      if (error) {
        setError("Inloggen mislukt. Controleer je e-mail en wachtwoord.");
      } else {
        router.replace("/");
      }
    } else if (mode === "register") {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) {
        setError(error.message);
      } else {
        setInfo("Account aangemaakt! Controleer je e-mail om te bevestigen, dan kun je inloggen.");
        setMode("login");
      }
    } else if (mode === "forgot") {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset`,
      });
      if (error) {
        setError(error.message);
      } else {
        setInfo("Wachtwoord-reset e-mail verstuurd. Controleer je inbox.");
      }
    }

    setLoading(false);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 48 }}>
      {/* Logo */}
      <div style={{ marginBottom: 36, textAlign: "center" }}>
        <img src="/logo.png" alt="Rhino Performance" style={{ height: 64, width: 64, objectFit: "contain", marginBottom: 12 }} />
        <h1 style={{
          fontSize: 28, fontWeight: 900, margin: 0,
          fontFamily: "'Barlow Condensed', sans-serif",
          letterSpacing: "0.04em", textTransform: "uppercase",
        }}>
          <span style={{ color: "#e63946" }}>Rhino</span>{" "}
          <span style={{ color: "#c0c0c0" }}>Performance</span>
        </h1>
        <p style={{ color: "#444", fontSize: 12, margin: "4px 0 0", letterSpacing: "0.08em", textTransform: "uppercase", fontWeight: 600 }}>
          Kracht · RPE · Progressie
        </p>
      </div>

      {/* Card */}
      <div style={{ width: "100%", maxWidth: 380, background: "#0f0f0f", border: "1px solid #252525", borderRadius: 16, padding: "28px 24px" }}>
        {/* Tab switcher */}
        {mode !== "forgot" && (
          <div style={{ display: "flex", gap: 2, marginBottom: 24, background: "#161616", borderRadius: 8, padding: 3 }}>
            {[["login", "Inloggen"], ["register", "Account aanmaken"]].map(([m, label]) => (
              <button
                key={m}
                type="button"
                onClick={() => { setMode(m); setError(""); setInfo(""); }}
                style={{
                  flex: 1, padding: "9px 0", fontSize: 13, fontWeight: 600,
                  borderRadius: 6,
                  background: mode === m ? "#e63946" : "transparent",
                  color: mode === m ? "#fff" : "#555",
                  border: "none", cursor: "pointer", transition: "background 0.15s",
                }}
              >
                {label}
              </button>
            ))}
          </div>
        )}

        {mode === "forgot" && (
          <div style={{ marginBottom: 20 }}>
            <button
              type="button"
              onClick={() => { setMode("login"); setError(""); setInfo(""); }}
              style={{ background: "transparent", color: "#888", fontSize: 22, padding: 0 }}
            >←</button>
            <div style={{ fontWeight: 700, fontSize: 17, marginTop: 8 }}>Wachtwoord vergeten</div>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: "block", fontSize: 13, color: "#888", marginBottom: 6 }}>E-mailadres</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="jij@example.com"
              required
              autoComplete="email"
              style={{ width: "100%", padding: "12px 14px", fontSize: 15 }}
            />
          </div>

          {mode !== "forgot" && (
            <div style={{ marginBottom: mode === "login" ? 14 : 20 }}>
              <label style={{ display: "block", fontSize: 13, color: "#888", marginBottom: 6 }}>Wachtwoord</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={mode === "register" ? "Minimaal 6 tekens" : "Jouw wachtwoord"}
                required
                minLength={6}
                autoComplete={mode === "register" ? "new-password" : "current-password"}
                style={{ width: "100%", padding: "12px 14px", fontSize: 15 }}
              />
            </div>
          )}

          {mode === "login" && (
            <div style={{ marginBottom: 20 }}>
              <label style={{
                display: "flex", alignItems: "center", gap: 10,
                cursor: "pointer", userSelect: "none",
              }}>
                <div
                  onClick={() => setRememberMe((v) => !v)}
                  style={{
                    width: 18, height: 18, borderRadius: 4, flexShrink: 0,
                    background: rememberMe ? "#e63946" : "transparent",
                    border: `2px solid ${rememberMe ? "#e63946" : "#333"}`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    transition: "background 0.15s, border-color 0.15s",
                  }}
                >
                  {rememberMe && (
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                      <polyline points="1.5,5 4,7.5 8.5,2" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </div>
                <span style={{ fontSize: 13, color: "#888" }}>Onthoud mij</span>
              </label>
            </div>
          )}

          {error && (
            <div style={{ background: "#1a0000", border: "1px solid #e6394644", borderRadius: 8, padding: "10px 14px", marginBottom: 14, fontSize: 13, color: "#e63946" }}>
              {error}
            </div>
          )}

          {info && (
            <div style={{ background: "#0d1f12", border: "1px solid #2d9e4744", borderRadius: 8, padding: "10px 14px", marginBottom: 14, fontSize: 13, color: "#2d9e47" }}>
              {info}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              background: "#e63946", color: "#fff", width: "100%",
              padding: "14px 0", fontSize: 15, fontWeight: 700,
              borderRadius: 10, border: "none", cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? "Even wachten..." : mode === "login" ? "Inloggen" : mode === "register" ? "Account aanmaken" : "Reset link versturen"}
          </button>
        </form>

        {mode === "login" && (
          <button
            type="button"
            onClick={() => { setMode("forgot"); setError(""); setInfo(""); }}
            style={{ background: "transparent", color: "#444", fontSize: 13, width: "100%", marginTop: 14, padding: "6px 0" }}
          >
            Wachtwoord vergeten?
          </button>
        )}
      </div>
    </div>
  );
}
