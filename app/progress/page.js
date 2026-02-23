"use client";

import { useState, useEffect } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from "recharts";
import {
  getAllExerciseNames, getExerciseHistory,
  getPartnerExerciseHistory,
} from "@/lib/storage";

const PERIODS = [
  { label: "4 weken", days: 28 },
  { label: "3 maanden", days: 91 },
  { label: "Alles", days: null },
];

const PARTNER_COLORS = ["#f4a261", "#2a9d8f", "#a8dadc", "#e9c46a", "#48cae4"];

function filterByPeriod(data, days) {
  if (!days) return data;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  const cutoffStr = cutoff.toISOString().slice(0, 10);
  return data.filter((d) => d.date >= cutoffStr);
}

function formatDate(dateStr) {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("nl-NL", { day: "numeric", month: "short" });
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "#0f0f0f", border: "1px solid #252525", borderRadius: 8, padding: "10px 14px" }}>
      <div style={{ color: "#555", fontSize: 12, marginBottom: 6 }}>{label}</div>
      {payload.map((entry) => (
        <div key={entry.dataKey} style={{ color: entry.color, fontWeight: 700, fontSize: 15, marginBottom: 2 }}>
          {entry.name}: {entry.value} kg
        </div>
      ))}
    </div>
  );
};

export default function ProgressPage() {
  const [exercises, setExercises] = useState([]);
  const [selected, setSelected] = useState("");
  const [period, setPeriod] = useState(1);
  const [allData, setAllData] = useState([]);
  const [loading, setLoading] = useState(true);

  const [partnerSeries, setPartnerSeries] = useState([]);
  const [partnerLoading, setPartnerLoading] = useState(false);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const names = await getAllExerciseNames();
      setExercises(names);
      if (names.length > 0) setSelected(names[0]);
      setLoading(false);
    }
    load();
  }, []);

  useEffect(() => {
    async function loadHistory() {
      if (selected) {
        setAllData(await getExerciseHistory(selected, 200));
      }
    }
    loadHistory();
  }, [selected]);

  useEffect(() => {
    async function loadPartnerData() {
      if (!selected) { setPartnerSeries([]); return; }
      setPartnerLoading(true);
      const series = await getPartnerExerciseHistory(selected);
      setPartnerSeries(series || []);
      setPartnerLoading(false);
    }
    loadPartnerData();
  }, [selected]);

  if (loading) {
    return <div style={{ color: "#888", padding: 32, textAlign: "center" }}>Laden...</div>;
  }

  const data = filterByPeriod(allData, PERIODS[period].days);
  const chartData = data.map((d) => ({ ...d, label: formatDate(d.date) }));

  // Merge partner data into chart entries by date label
  const partnerByDate = {};
  for (const partner of partnerSeries) {
    const filtered = filterByPeriod(partner.data, PERIODS[period].days);
    for (const entry of filtered) {
      const label = formatDate(entry.date);
      if (!partnerByDate[label]) partnerByDate[label] = {};
      partnerByDate[label][`partner_${partner.partnerId}`] = entry.e1rm;
    }
  }

  // Build merged chart data: combine own data + partner data by label
  const allLabels = new Set([
    ...chartData.map((d) => d.label),
    ...Object.keys(partnerByDate),
  ]);
  const sortedLabels = Array.from(allLabels).sort((a, b) => {
    // sort by original date string — reconstruct from own data or partner data
    const aDate = data.find((d) => formatDate(d.date) === a)?.date || a;
    const bDate = data.find((d) => formatDate(d.date) === b)?.date || b;
    return aDate.localeCompare(bDate);
  });

  const mergedChartData = sortedLabels.map((label) => {
    const own = chartData.find((d) => d.label === label) || {};
    return { label, e1rm: own.e1rm || null, bestWeight: own.bestWeight || null, ...(partnerByDate[label] || {}) };
  });

  const hasOwnData = chartData.length > 0;
  const hasPartnerData = partnerSeries.some((p) => p.data.length > 0);
  const hasData = hasOwnData || hasPartnerData;
  const maxE1rm = hasOwnData ? Math.max(...chartData.map((d) => d.e1rm)) : 0;
  const minVal = hasOwnData ? Math.min(...chartData.map((d) => Math.min(d.e1rm, d.bestWeight || d.e1rm))) : 0;
  const trend = chartData.length >= 2
    ? chartData[chartData.length - 1].e1rm - chartData[0].e1rm
    : null;

  return (
    <div>
      <h1 style={{ fontSize: 28, fontWeight: 900, margin: "0 0 20px", fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: "0.04em", textTransform: "uppercase" }}>
        Progressie
      </h1>

      {exercises.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 0", color: "#555" }}>
          <p style={{ fontSize: 16, marginBottom: 8, color: "#888" }}>Nog geen trainingsdata</p>
          <p style={{ fontSize: 14 }}>Rond een training af om progressie bij te houden.</p>
        </div>
      ) : (
        <>
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 12, color: "#555", display: "block", marginBottom: 6, letterSpacing: "0.06em", textTransform: "uppercase", fontWeight: 600 }}>Oefening</label>
            <select
              value={selected}
              onChange={(e) => setSelected(e.target.value)}
              style={{ width: "100%", padding: "12px 14px", fontSize: 15, background: "#0f0f0f", color: "#f0f0f0", border: "1px solid #252525", borderRadius: 10 }}
            >
              {exercises.map((name) => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          </div>

          <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
            {PERIODS.map((p, i) => (
              <button
                key={p.label}
                onClick={() => setPeriod(i)}
                style={{
                  flex: 1, padding: "10px 0", fontSize: 13,
                  background: period === i ? "#e63946" : "#0f0f0f",
                  color: period === i ? "#fff" : "#555",
                  border: `1px solid ${period === i ? "#e63946" : "#252525"}`,
                  borderRadius: 8,
                  fontWeight: period === i ? 700 : 400,
                }}
              >
                {p.label}
              </button>
            ))}
          </div>

          {hasOwnData && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 24 }}>
              {[
                ["Beste e1RM", `${maxE1rm} kg`],
                ["Sessies", chartData.length],
                ["Trend", trend !== null ? `${trend >= 0 ? "+" : ""}${trend} kg` : "-"],
              ].map(([label, val]) => (
                <div key={label} style={{ background: "#0f0f0f", border: "1px solid #252525", borderRadius: 10, padding: "12px 10px", textAlign: "center" }}>
                  <div style={{
                    fontSize: 17, fontWeight: 700,
                    color: label === "Trend" && trend !== null
                      ? (trend > 0 ? "#2d9e47" : trend < 0 ? "#e63946" : "#f0f0f0")
                      : "#f0f0f0",
                  }}>{val}</div>
                  <div style={{ fontSize: 12, color: "#555", marginTop: 2 }}>{label}</div>
                </div>
              ))}
            </div>
          )}

          {!hasData && !partnerLoading ? (
            <div style={{ background: "#0f0f0f", border: "1px solid #252525", borderRadius: 12, padding: "40px 16px", textAlign: "center", color: "#555" }}>
              Geen data voor deze periode
            </div>
          ) : (
            <div style={{ background: "#0f0f0f", border: "1px solid #252525", borderRadius: 12, padding: "20px 8px 16px" }}>
              <div style={{ fontSize: 12, color: "#555", paddingLeft: 16, marginBottom: 12, letterSpacing: "0.06em", textTransform: "uppercase", fontWeight: 600 }}>
                {selected}
              </div>
              <ResponsiveContainer width="100%" height={230}>
                <LineChart data={mergedChartData} margin={{ top: 5, right: 16, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#161616" />
                  <XAxis
                    dataKey="label"
                    tick={{ fill: "#444", fontSize: 11 }}
                    axisLine={{ stroke: "#252525" }}
                    tickLine={false}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    domain={["auto", "auto"]}
                    tick={{ fill: "#444", fontSize: 11 }}
                    axisLine={{ stroke: "#252525" }}
                    tickLine={false}
                    width={40}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Line
                    type="monotone" dataKey="e1rm" stroke="#e63946" strokeWidth={2.5}
                    dot={{ fill: "#e63946", r: 4, strokeWidth: 0 }}
                    activeDot={{ fill: "#fff", stroke: "#e63946", r: 6, strokeWidth: 2 }}
                    name="Jouw e1RM"
                    connectNulls
                  />
                  <Line
                    type="monotone" dataKey="bestWeight" stroke="#c0c0c0" strokeWidth={2}
                    strokeDasharray="5 3"
                    dot={{ fill: "#c0c0c0", r: 3, strokeWidth: 0 }}
                    activeDot={{ fill: "#fff", stroke: "#c0c0c0", r: 5, strokeWidth: 2 }}
                    name="Zwaarste set"
                    connectNulls
                  />
                  {partnerSeries.map((partner, idx) => (
                    <Line
                      key={partner.partnerId}
                      type="monotone"
                      dataKey={`partner_${partner.partnerId}`}
                      stroke={PARTNER_COLORS[idx % PARTNER_COLORS.length]}
                      strokeWidth={2}
                      strokeDasharray="4 2"
                      dot={{ fill: PARTNER_COLORS[idx % PARTNER_COLORS.length], r: 3, strokeWidth: 0 }}
                      activeDot={{ fill: "#fff", stroke: PARTNER_COLORS[idx % PARTNER_COLORS.length], r: 5, strokeWidth: 2 }}
                      name={partner.username}
                      connectNulls
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>

              <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 16, marginTop: 12, paddingTop: 12, borderTop: "1px solid #161616" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <div style={{ width: 20, height: 3, background: "#e63946", borderRadius: 2 }} />
                  <span style={{ fontSize: 12, color: "#888" }}>Jouw e1RM</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <div style={{ width: 20, height: 3, background: "#c0c0c0", borderRadius: 2, opacity: 0.7 }} />
                  <span style={{ fontSize: 12, color: "#888" }}>Zwaarste set (kg)</span>
                </div>
                {partnerSeries.map((partner, idx) => (
                  <div key={partner.partnerId} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <div style={{ width: 20, height: 3, background: PARTNER_COLORS[idx % PARTNER_COLORS.length], borderRadius: 2 }} />
                    <span style={{ fontSize: 12, color: "#888" }}>{partner.username}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {partnerLoading && (
            <div style={{ textAlign: "center", color: "#555", fontSize: 13, marginTop: 12 }}>
              Partner data laden...
            </div>
          )}
        </>
      )}
    </div>
  );
}
