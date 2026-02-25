/** Zone labels for display (technical / accurate terms) */
export const ZONE_LABELS = {
  1: "Recovery",
  2: "Fat burn / aeroob",
  3: "Aeroob",
  4: "Anaeroob",
  5: "VO2max",
};

/**
 * Max HR estimation: Tanaka (208 - 0.7 × age) — current standard.
 * @param {number} age - age in years
 * @returns {number} estimated max HR (bpm)
 */
export function getMaxHR(age) {
  if (age == null || age < 10 || age > 100) return null;
  return Math.round(208 - 0.7 * age);
}

/**
 * Karvonen formula: Target HR = (MaxHR - RestHR) × %intensity + RestHR
 * Returns the 5 standard zones (Z1–Z5) with min/max bpm.
 * @param {number} restHR - resting heart rate (bpm). Default 70 if not provided.
 * @param {number} maxHR - max heart rate (bpm). From getMaxHR(age) if not measured.
 * @returns {{ zone: number, label: string, pctMin: number, pctMax: number, bpmMin: number, bpmMax: number, type: string }[]}
 */
export function getKarvonenZones(restHR = 70, maxHR) {
  if (maxHR == null || maxHR < 100) return [];
  const rest = Math.max(30, Math.min(100, Number(restHR) || 70));
  const max = Math.max(120, Number(maxHR));

  const zones = [
    { zone: 1, pctMin: 0.5, pctMax: 0.6, label: "Recovery", type: "aerobic" },
    { zone: 2, pctMin: 0.6, pctMax: 0.7, label: "Fat burn / aeroob", type: "aerobic" },
    { zone: 3, pctMin: 0.7, pctMax: 0.8, label: "Aeroob", type: "aerobic" },
    { zone: 4, pctMin: 0.8, pctMax: 0.9, label: "Anaeroob", type: "anaerobic" },
    { zone: 5, pctMin: 0.9, pctMax: 1.0, label: "VO2max", type: "anaerobic" },
  ];

  return zones.map((z) => {
    const bpmMin = Math.round((max - rest) * z.pctMin + rest);
    const bpmMax = Math.round((max - rest) * z.pctMax + rest);
    return {
      ...z,
      bpmMin,
      bpmMax,
    };
  });
}

/**
 * Get age from birth year (current year - birth_year).
 */
export function ageFromBirthYear(birthYear) {
  if (birthYear == null || birthYear < 1900 || birthYear > new Date().getFullYear()) return null;
  return new Date().getFullYear() - Number(birthYear);
}
