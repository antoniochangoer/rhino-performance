"use client";

import { useState, useEffect, useRef } from "react";
import {
  getCardioActivities,
  createCardioActivity,
  deleteCardioActivity,
} from "@/lib/storage";
import { searchCardioModalities } from "@/lib/cardio";

function formatDate(dateStr) {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("nl-NL", { weekday: "short", day: "numeric", month: "short" });
}

export default function CardioPage() {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    name: "",
    durationMinutes: 30,
    type: "aerobic",
    zone: "",
    avgHr: "",
    maxHr: "",
    notes: "",
  });
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const suggestionsRef = useRef(null);

  function getDateRange() {
    const to = new Date();
    const from = new Date();
    from.setDate(from.getDate() - 14);
    to.setDate(to.getDate() + 7);
    return {
      fromDate: from.toISOString().slice(0, 10),
      toDate: to.toISOString().slice(0, 10),
    };
  }

  async function load() {
    setLoading(true);
    const { fromDate, toDate } = getDateRange();
    const list = await getCardioActivities(fromDate, toDate);
    setActivities(list);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.name.trim()) return;
    await createCardioActivity({
      date: form.date,
      name: form.name.trim(),
      durationMinutes: Number(form.durationMinutes) || 0,
      type: form.type,
      zone: form.zone ? Number(form.zone) : undefined,
      avgHr: form.avgHr ? Number(form.avgHr) : undefined,
      maxHr: form.maxHr ? Number(form.maxHr) : undefined,
      notes: form.notes.trim() || undefined,
    });
    setForm({
      date: new Date().toISOString().slice(0, 10),
      name: "",
      durationMinutes: 30,
      type: "aerobic",
      zone: "",
      avgHr: "",
      maxHr: "",
      notes: "",
    });
    setShowForm(false);
    await load();
  }

  async function handleDelete(id) {
    if (!confirm("Deze cardio-sessie verwijderen?")) return;
    await deleteCardioActivity(id);
    await load();
  }

  const typeLabel = (type) => (type === "anaerobic" ? "Anaeroob" : "Aeroob");

  return (
    <div>
      <h1 style={{
        fontSize: 28,
        fontWeight: 900,
        margin: "0 0 20px",
        fontFamily: "'Barlow Condensed', sans-serif",
        letterSpacing: "0.04em",
        textTransform: "uppercase",
      }}>
        Cardio
      </h1>

      <p style={{ fontSize: 13, color: "#888", marginBottom: 20 }}>
        Aeroob = vooral zone 1–3 · Anaeroob = zone 4–5
      </p>

      {!showForm ? (
        <button
          onClick={() => setShowForm(true)}
          style={{
            width: "100%",
            background: "#e63946",
            color: "#fff",
            padding: "14px 0",
            fontSize: 15,
            fontWeight: 700,
            borderRadius: 10,
            marginBottom: 24,
          }}
        >
          Cardio toevoegen
        </button>
      ) : (
        <form
          onSubmit={handleSubmit}
          style={{
            background: "#0f0f0f",
            border: "1px solid #252525",
            borderRadius: 12,
            padding: 16,
            marginBottom: 24,
          }}
        >
          <div style={{ marginBottom: 12, position: "relative" }} ref={suggestionsRef}>
            <label style={{ fontSize: 12, color: "#555", display: "block", marginBottom: 4 }}>Modaliteit *</label>
            <input
              value={form.name}
              onChange={(e) => {
                setForm((f) => ({ ...f, name: e.target.value }));
                setSuggestions(searchCardioModalities(e.target.value));
                setShowSuggestions(true);
              }}
              onFocus={() => {
                if (form.name) {
                  setSuggestions(searchCardioModalities(form.name));
                  setShowSuggestions(true);
                }
              }}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
              placeholder="bijv. Hardlopen, Roeier"
              required
              autoComplete="off"
              style={{ width: "100%", padding: "10px 12px", fontSize: 15, background: "#111", border: "1px solid #252525", borderRadius: 8, color: "#f0f0f0" }}
            />
            {showSuggestions && suggestions.length > 0 && (
              <div style={{
                position: "absolute",
                top: "100%",
                left: 0,
                right: 0,
                background: "#1a1a1a",
                border: "1px solid #2a2a2a",
                borderRadius: "0 0 8px 8px",
                zIndex: 50,
                overflow: "hidden",
                marginTop: 2,
              }}>
                {suggestions.map((name) => (
                  <button
                    key={name}
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      setForm((f) => ({ ...f, name }));
                      setShowSuggestions(false);
                    }}
                    style={{
                      display: "block",
                      width: "100%",
                      textAlign: "left",
                      padding: "10px 14px",
                      background: "transparent",
                      color: "#f0f0f0",
                      fontSize: 14,
                      borderBottom: "1px solid #2a2a2a",
                    }}
                  >
                    {name}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
            <div>
              <label style={{ fontSize: 12, color: "#555", display: "block", marginBottom: 4 }}>Datum</label>
              <input
                type="date"
                value={form.date}
                onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                style={{ width: "100%", padding: "10px 12px", fontSize: 14, background: "#111", border: "1px solid #252525", borderRadius: 8, color: "#f0f0f0" }}
              />
            </div>
            <div>
              <label style={{ fontSize: 12, color: "#555", display: "block", marginBottom: 4 }}>Duur (min)</label>
              <input
                type="number"
                min="1"
                value={form.durationMinutes}
                onChange={(e) => setForm((f) => ({ ...f, durationMinutes: e.target.value }))}
                style={{ width: "100%", padding: "10px 12px", fontSize: 14, background: "#111", border: "1px solid #252525", borderRadius: 8, color: "#f0f0f0" }}
              />
            </div>
          </div>

          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 12, color: "#555", display: "block", marginBottom: 4 }}>Type</label>
            <div style={{ display: "flex", gap: 8 }}>
              {["aerobic", "anaerobic"].map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, type: t }))}
                  style={{
                    flex: 1,
                    padding: "10px 0",
                    fontSize: 14,
                    fontWeight: 600,
                    background: form.type === t ? "#e63946" : "#111",
                    color: form.type === t ? "#fff" : "#888",
                    border: `1px solid ${form.type === t ? "#e63946" : "#252525"}`,
                    borderRadius: 8,
                  }}
                >
                  {t === "aerobic" ? "Aeroob" : "Anaeroob"}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 12 }}>
            <div>
              <label style={{ fontSize: 12, color: "#555", display: "block", marginBottom: 4 }}>Zone (1–5)</label>
              <input
                type="number"
                min="1"
                max="5"
                placeholder="—"
                value={form.zone}
                onChange={(e) => setForm((f) => ({ ...f, zone: e.target.value }))}
                style={{ width: "100%", padding: "8px 10px", fontSize: 14, background: "#111", border: "1px solid #252525", borderRadius: 8, color: "#f0f0f0" }}
              />
            </div>
            <div>
              <label style={{ fontSize: 12, color: "#555", display: "block", marginBottom: 4 }}>Gem. HR</label>
              <input
                type="number"
                min="40"
                max="220"
                placeholder="—"
                value={form.avgHr}
                onChange={(e) => setForm((f) => ({ ...f, avgHr: e.target.value }))}
                style={{ width: "100%", padding: "8px 10px", fontSize: 14, background: "#111", border: "1px solid #252525", borderRadius: 8, color: "#f0f0f0" }}
              />
            </div>
            <div>
              <label style={{ fontSize: 12, color: "#555", display: "block", marginBottom: 4 }}>Max HR</label>
              <input
                type="number"
                min="40"
                max="220"
                placeholder="—"
                value={form.maxHr}
                onChange={(e) => setForm((f) => ({ ...f, maxHr: e.target.value }))}
                style={{ width: "100%", padding: "8px 10px", fontSize: 14, background: "#111", border: "1px solid #252525", borderRadius: 8, color: "#f0f0f0" }}
              />
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 12, color: "#555", display: "block", marginBottom: 4 }}>Notities</label>
            <input
              type="text"
              placeholder="Optioneel"
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              style={{ width: "100%", padding: "10px 12px", fontSize: 14, background: "#111", border: "1px solid #252525", borderRadius: 8, color: "#f0f0f0" }}
            />
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            <button
              type="submit"
              style={{ flex: 1, background: "#e63946", color: "#fff", padding: "12px 0", fontSize: 15, fontWeight: 700, borderRadius: 8 }}
            >
              Opslaan
            </button>
            <button
              type="button"
              onClick={() => { setShowForm(false); setSuggestions([]); }}
              style={{ flex: 1, background: "#252525", color: "#888", padding: "12px 0", fontSize: 14, borderRadius: 8 }}
            >
              Annuleren
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div style={{ color: "#888", padding: 32, textAlign: "center" }}>Laden...</div>
      ) : activities.length === 0 ? (
        <div style={{ textAlign: "center", padding: "40px 0", color: "#555" }}>
          <p style={{ fontSize: 15, marginBottom: 8 }}>Nog geen cardio ingepland of gelogd</p>
          <p style={{ fontSize: 13 }}>Voeg een sessie toe om je aeroob/anaeroob training bij te houden.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {activities.map((a) => (
            <div
              key={a.id}
              style={{
                background: "#0f0f0f",
                border: "1px solid #252525",
                borderRadius: 12,
                padding: "14px 44px 14px 16px",
                position: "relative",
              }}
            >
              <button
                onClick={() => handleDelete(a.id)}
                style={{
                  position: "absolute",
                  top: 14,
                  right: 12,
                  background: "transparent",
                  color: "#555",
                  fontSize: 18,
                  padding: "2px 6px",
                }}
              >
                ×
              </button>
              <div style={{ fontWeight: 700, fontSize: 16 }}>{a.name}</div>
              <div style={{ fontSize: 13, color: "#888", marginTop: 2 }}>{formatDate(a.date)}</div>
              <div style={{ display: "flex", gap: 12, marginTop: 6, flexWrap: "wrap" }}>
                <span style={{ fontSize: 13, color: "#e63946" }}>{a.durationMinutes} min</span>
                <span style={{ fontSize: 13, color: a.type === "anaerobic" ? "#e67e22" : "#2d9e47" }}>
                  {typeLabel(a.type)}
                </span>
                {a.zone && <span style={{ fontSize: 13, color: "#555" }}>Zone {a.zone}</span>}
                {a.avgHr && <span style={{ fontSize: 13, color: "#555" }}>~{a.avgHr} bpm</span>}
              </div>
              {a.notes && <div style={{ fontSize: 12, color: "#555", marginTop: 6 }}>{a.notes}</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
