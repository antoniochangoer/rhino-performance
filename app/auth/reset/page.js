"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabase } from "@/lib/supabase";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const supabase = getSupabase();
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setError(error.message);
    } else {
      setDone(true);
      setTimeout(() => router.replace("/"), 2000);
    }
    setLoading(false);
  }

  if (done) {
    return (
      <div style={{ textAlign: "center", padding: "60px 16px" }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>✓</div>
        <div style={{ fontWeight: 700, fontSize: 18 }}>Wachtwoord bijgewerkt!</div>
        <div style={{ color: "#888", fontSize: 14, marginTop: 8 }}>Je wordt doorgestuurd...</div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 80 }}>
      <div style={{ width: "100%", maxWidth: 380, background: "#0f0f0f", border: "1px solid #252525", borderRadius: 16, padding: "28px 24px" }}>
        <div style={{ fontWeight: 700, fontSize: 20, marginBottom: 20 }}>Nieuw wachtwoord instellen</div>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: "block", fontSize: 13, color: "#888", marginBottom: 6 }}>Nieuw wachtwoord</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Minimaal 6 tekens"
              required
              minLength={6}
              autoComplete="new-password"
              style={{ width: "100%", padding: "12px 14px", fontSize: 15 }}
            />
          </div>
          {error && (
            <div style={{ background: "#1a0000", border: "1px solid #e6394644", borderRadius: 8, padding: "10px 14px", marginBottom: 14, fontSize: 13, color: "#e63946" }}>
              {error}
            </div>
          )}
          <button
            type="submit"
            disabled={loading}
            style={{ background: "#e63946", color: "#fff", width: "100%", padding: "14px 0", fontSize: 15, fontWeight: 700, borderRadius: 10, opacity: loading ? 0.7 : 1 }}
          >
            {loading ? "Opslaan..." : "Wachtwoord opslaan"}
          </button>
        </form>
      </div>
    </div>
  );
}
