// localStorage keys
const PROGRAMS_KEY = "rp_programs";
const LOGS_KEY = "rp_logs";

function generateId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

// ---- Programs ----

export function getPrograms() {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(PROGRAMS_KEY) || "[]");
  } catch {
    return [];
  }
}

export function savePrograms(programs) {
  localStorage.setItem(PROGRAMS_KEY, JSON.stringify(programs));
}

export function getProgram(id) {
  return getPrograms().find((p) => p.id === id) || null;
}

export function createProgram({ name, description, goal, totalWeeks, startRpe, active }) {
  const programs = getPrograms();
  const program = {
    id: generateId(),
    name,
    description: description || "",
    goal: goal || "peaking",
    totalWeeks: Number(totalWeeks) || 8,
    startRpe: Number(startRpe) || 7,
    currentIndex: 0,
    currentWeek: 1,
    active: active === true,
    sessions: [],
  };
  programs.push(program);
  savePrograms(programs);
  return program;
}

/**
 * Set a program as the active one. All others become inactive.
 */
export function setActiveProgram(id) {
  const programs = getPrograms().map((p) => ({ ...p, active: p.id === id }));
  savePrograms(programs);
}

/**
 * Get the currently active program, or null.
 */
export function getActiveProgram() {
  return getPrograms().find((p) => p.active) || null;
}

export function updateProgram(id, updates) {
  const programs = getPrograms().map((p) =>
    p.id === id ? { ...p, ...updates } : p
  );
  savePrograms(programs);
}

export function deleteProgram(id) {
  savePrograms(getPrograms().filter((p) => p.id !== id));
}

// ---- Sessions ----

export function addSession(programId, { name }) {
  const programs = getPrograms();
  const idx = programs.findIndex((p) => p.id === programId);
  if (idx === -1) return null;
  const session = { id: generateId(), name, exercises: [] };
  programs[idx].sessions.push(session);
  savePrograms(programs);
  return session;
}

export function updateSession(programId, sessionId, updates) {
  const programs = getPrograms();
  const p = programs.find((p) => p.id === programId);
  if (!p) return;
  p.sessions = p.sessions.map((s) =>
    s.id === sessionId ? { ...s, ...updates } : s
  );
  savePrograms(programs);
}

export function deleteSession(programId, sessionId) {
  const programs = getPrograms();
  const p = programs.find((prog) => prog.id === programId);
  if (!p) return;
  p.sessions = p.sessions.filter((s) => s.id !== sessionId);
  savePrograms(programs);
}

// ---- Exercises ----

export function addExercise(programId, sessionId, { name, sets, targetReps, targetRpe, oneRepMax }) {
  const programs = getPrograms();
  const p = programs.find((prog) => prog.id === programId);
  if (!p) return null;
  const s = p.sessions.find((sess) => sess.id === sessionId);
  if (!s) return null;
  const baseRpe = Number(targetRpe) || (p.startRpe || 7);
  const exercise = {
    id: generateId(),
    name,
    sets: Number(sets) || 3,
    targetReps: Number(targetReps) || 5,
    targetRpe: baseRpe,
    startRpe: baseRpe,   // week-1 baseline for progression
    oneRepMax: Number(oneRepMax) || 0,
  };
  s.exercises.push(exercise);
  savePrograms(programs);
  return exercise;
}

export function updateExercise(programId, sessionId, exerciseId, updates) {
  const programs = getPrograms();
  const p = programs.find((prog) => prog.id === programId);
  if (!p) return;
  const s = p.sessions.find((sess) => sess.id === sessionId);
  if (!s) return;
  s.exercises = s.exercises.map((e) =>
    e.id === exerciseId ? { ...e, ...updates } : e
  );
  savePrograms(programs);
}

export function deleteExercise(programId, sessionId, exerciseId) {
  const programs = getPrograms();
  const p = programs.find((prog) => prog.id === programId);
  if (!p) return;
  const s = p.sessions.find((sess) => sess.id === sessionId);
  if (!s) return;
  s.exercises = s.exercises.filter((e) => e.id !== exerciseId);
  savePrograms(programs);
}

// ---- Logs ----

export function getLogs() {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(LOGS_KEY) || "[]");
  } catch {
    return [];
  }
}

export function saveLogs(logs) {
  localStorage.setItem(LOGS_KEY, JSON.stringify(logs));
}

export function getLog(id) {
  return getLogs().find((l) => l.id === id) || null;
}

export function getActiveLog() {
  return getLogs().find((l) => l.status === "active") || null;
}

export function startTraining(programId) {
  const program = getProgram(programId);
  if (!program || program.sessions.length === 0) return null;

  // Only one active log at a time
  const existing = getActiveLog();
  if (existing) return existing;

  const sessionIdx = program.currentIndex % program.sessions.length;
  const session = program.sessions[sessionIdx];
  const currentWeek = program.currentWeek || 1;

  const logExercises = session.exercises.map((ex) => {
    // Calculate this week's RPE and weight targets
    const weekTargets = calcWeeklyTargets(ex, currentWeek, program.totalWeeks || 8, program.goal || "peaking");
    const effectiveRpe = weekTargets.targetRpe;
    const effectiveSets = weekTargets.sets || ex.sets;
    const targetWeight = calcTargetWeight(ex.oneRepMax, ex.targetReps, effectiveRpe);
    const w = targetWeight ? String(targetWeight) : "";
    const r = String(ex.targetReps);
    const impliedRpe =
      w && r && ex.oneRepMax > 0
        ? String(calcImpliedRpe(w, r, ex.oneRepMax) ?? "")
        : String(effectiveRpe);
    return {
      exerciseId: ex.id,
      name: ex.name,
      targetReps: ex.targetReps,
      targetRpe: effectiveRpe,
      oneRepMax: ex.oneRepMax,
      weekNumber: currentWeek,
      sets: Array.from({ length: effectiveSets }, () => ({
        id: generateId(),
        weight: w,
        reps: r,
        rpe: impliedRpe,
        completed: false,
      })),
    };
  });

  const log = {
    id: generateId(),
    programId,
    sessionId: session.id,
    sessionName: session.name,
    sessionIndex: sessionIdx,
    weekNumber: currentWeek,
    date: new Date().toISOString().slice(0, 10),
    status: "active",
    exercises: logExercises,
  };

  const logs = getLogs();
  logs.unshift(log);
  saveLogs(logs);
  return log;
}

export function updateLog(id, updates) {
  const logs = getLogs().map((l) => (l.id === id ? { ...l, ...updates } : l));
  saveLogs(logs);
}

/**
 * Complete a log. Returns { weekCompleted, newWeek } so callers can react.
 */
export function completeLog(logId) {
  const logs = getLogs();
  const log = logs.find((l) => l.id === logId);
  if (!log) return { weekCompleted: false, newWeek: 1 };

  log.status = "completed";
  saveLogs(logs);

  const program = getProgram(log.programId);
  if (!program) return { weekCompleted: false, newWeek: 1 };

  const newIndex = log.sessionIndex + 1;
  const weekCompleted = newIndex >= program.sessions.length;
  const newWeek = weekCompleted ? (program.currentWeek || 1) + 1 : (program.currentWeek || 1);

  updateProgram(program.id, {
    currentIndex: weekCompleted ? 0 : newIndex,
    currentWeek: newWeek,
  });

  return { weekCompleted, newWeek, prevWeek: program.currentWeek || 1 };
}

export function deleteLog(id) {
  saveLogs(getLogs().filter((l) => l.id !== id));
}

// ---- RPE Calculations ----

// Multi-rep RPE percentage table (Raastad/RTS based)
// rpeTable[rpe][reps] = percentage of 1RM
const RPE_TABLE = {
  10: [1.00, 0.955, 0.922, 0.892, 0.863, 0.837, 0.811, 0.786, 0.762, 0.739],
  9:  [0.955, 0.922, 0.892, 0.863, 0.837, 0.811, 0.786, 0.762, 0.739, 0.707],
  8:  [0.922, 0.892, 0.863, 0.837, 0.811, 0.786, 0.762, 0.739, 0.707, 0.680],
  7:  [0.892, 0.863, 0.837, 0.811, 0.786, 0.762, 0.739, 0.707, 0.680, 0.653],
  6:  [0.863, 0.837, 0.811, 0.786, 0.762, 0.739, 0.707, 0.680, 0.653, 0.626],
};

/**
 * Calculate target weight given 1RM, target reps, and target RPE.
 * Returns weight in kg, rounded to nearest 2.5kg.
 */
export function calcTargetWeight(oneRepMax, targetReps, targetRpe) {
  if (!oneRepMax || oneRepMax <= 0) return null;
  const rpe = Math.round(Math.min(10, Math.max(6, targetRpe)));
  const reps = Math.min(10, Math.max(1, targetReps));
  const row = RPE_TABLE[rpe] || RPE_TABLE[8];
  const pct = row[reps - 1] || row[0];
  const raw = oneRepMax * pct;
  return Math.round(raw / 2.5) * 2.5;
}

/**
 * Estimate 1RM from a performed set (Epley formula).
 */
export function calcE1RM(weight, reps) {
  if (!weight || !reps || reps < 1) return null;
  if (reps === 1) return weight;
  return Math.round(weight * (1 + reps * 0.0333));
}

/**
 * Returns RPE feedback color: green/orange/red based on diff from target.
 */
export function rpeColor(actual, target) {
  if (!actual || !target) return null;
  const diff = Math.abs(actual - target);
  if (diff <= 0.5) return "green";
  if (diff <= 1.5) return "orange";
  return "red";
}

/**
 * Calculate the implied RPE given actual weight, reps, and 1RM.
 * Looks up the closest match in the RPE table.
 * Returns a number (6–10) or null if 1RM is unknown.
 */
export function calcImpliedRpe(weight, reps, oneRepMax) {
  if (!weight || !reps || !oneRepMax || oneRepMax <= 0) return null;
  const pct = Number(weight) / Number(oneRepMax);
  const repIdx = Math.min(10, Math.max(1, Math.round(Number(reps)))) - 1;

  let bestRpe = null;
  let bestDiff = Infinity;

  for (const [rpeKey, row] of Object.entries(RPE_TABLE)) {
    const tablePct = row[repIdx] ?? row[0];
    const diff = Math.abs(tablePct - pct);
    if (diff < bestDiff) {
      bestDiff = diff;
      bestRpe = Number(rpeKey);
    }
  }

  return bestRpe;
}

/**
 * Get e1RM history for a named exercise across all completed logs.
 * Returns [{date, e1rm, label}] sorted oldest-first, limited to `limit` entries.
 */
export function getExerciseHistory(exerciseName, limit = 10) {
  const logs = getLogs().filter((l) => l.status === "completed");
  const results = [];

  for (const log of logs) {
    const ex = log.exercises.find(
      (e) => e.name.toLowerCase() === exerciseName.toLowerCase()
    );
    if (!ex) continue;

    let bestE1rm = 0;
    let bestWeight = 0;
    for (const s of ex.sets) {
      if (s.weight && s.reps) {
        const w = Number(s.weight);
        const e = calcE1RM(w, Number(s.reps));
        if (e && e > bestE1rm) bestE1rm = e;
        if (w > bestWeight) bestWeight = w;
      }
    }

    if (bestE1rm > 0) {
      results.push({ date: log.date, e1rm: bestE1rm, bestWeight, label: log.date });
    }
  }

  // Sort oldest first, deduplicate same date (keep highest e1rm)
  const byDate = {};
  for (const r of results) {
    if (!byDate[r.date] || r.e1rm > byDate[r.date].e1rm) {
      byDate[r.date] = r;
    }
  }

  return Object.values(byDate)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-limit);
}

/**
 * Get all unique exercise names from all logs.
 */
export function getAllExerciseNames() {
  const logs = getLogs().filter((l) => l.status === "completed");
  const names = new Set();
  for (const log of logs) {
    for (const ex of log.exercises) {
      if (ex.name) names.add(ex.name);
    }
  }
  return Array.from(names).sort();
}

// ---- Block / Week Progression ----

/**
 * Calculate the target RPE and set count for a given week.
 *
 * Peaking block (evidence-based: RTS / Mignone / Juggernaut):
 *   Weeks 1 … totalWeeks-2 : RPE climbs +0.5 per week from startRpe
 *   Week  totalWeeks-1      : Deload — RPE back to startRpe, sets -30%
 *   Week  totalWeeks        : Peak — RPE 9.5, sets -50%
 *
 * Maintenance block (minimum effective dose, 2024 research):
 *   All weeks: RPE = startRpe (7–7.5), sets unchanged
 */
export function calcWeeklyTargets(exercise, currentWeek, totalWeeks, goal) {
  const startRpe = exercise.startRpe || exercise.targetRpe || 7;
  const baseSets = exercise.sets || 3;

  if (goal === "maintenance") {
    return {
      targetRpe: startRpe,
      sets: baseSets,
      isDeload: false,
      isPeak: false,
    };
  }

  // Peaking
  const w = Math.max(1, Math.min(currentWeek, totalWeeks));
  const isDeload = w === totalWeeks - 1 && totalWeeks > 2;
  const isPeak = w === totalWeeks;

  if (isDeload) {
    return {
      targetRpe: startRpe,
      sets: Math.max(1, Math.round(baseSets * 0.7)),
      isDeload: true,
      isPeak: false,
    };
  }

  if (isPeak) {
    return {
      targetRpe: 9.5,
      sets: Math.max(1, Math.round(baseSets * 0.5)),
      isDeload: false,
      isPeak: true,
    };
  }

  // Regular build week: +0.5 RPE per week
  const rpeStep = 0.5;
  const rawRpe = startRpe + (w - 1) * rpeStep;
  // Cap at 9 before deload/peak
  const targetRpe = Math.min(9, Math.round(rawRpe * 2) / 2);

  return {
    targetRpe,
    sets: baseSets,
    isDeload: false,
    isPeak: false,
  };
}

/**
 * Given a program, return the weekly targets preview for the NEXT week.
 */
export function getNextWeekPreview(program) {
  if (!program || !program.sessions.length) return null;
  const nextWeek = (program.currentWeek || 1) + 1;
  if (nextWeek > (program.totalWeeks || 8)) return null;

  // Use the first exercise of the first session as representative
  const firstEx = program.sessions[0]?.exercises[0];
  if (!firstEx) return null;

  const targets = calcWeeklyTargets(firstEx, nextWeek, program.totalWeeks || 8, program.goal || "peaking");
  const nextWeight = calcTargetWeight(firstEx.oneRepMax, firstEx.targetReps, targets.targetRpe);

  return {
    week: nextWeek,
    targetRpe: targets.targetRpe,
    isDeload: targets.isDeload,
    isPeak: targets.isPeak,
    exampleWeight: nextWeight,
  };
}

/**
 * Generate a human-readable feedback summary after completing a training.
 * Returns { headline, body, tone } where tone is "good" | "warn" | "bad".
 */
export function generateWorkoutFeedback(log, weekCompleted, newWeek, program) {
  if (!log || !log.exercises) return null;

  // Collect all sets that have data
  let totalSets = 0;
  let weaklingSets = 0;
  let pushedSets = 0;
  let onTargetSets = 0;

  for (const ex of log.exercises) {
    for (const s of ex.sets) {
      if (!s.rpe || !ex.targetRpe) continue;
      totalSets++;
      const diff = Number(s.rpe) - ex.targetRpe;
      if (diff >= 2) pushedSets++;
      else if (diff <= -2) weaklingSets++;
      else onTargetSets++;
    }
  }

  // Volume
  let volume = 0;
  for (const ex of log.exercises) {
    for (const s of ex.sets) {
      if (s.weight && s.reps) volume += Number(s.weight) * Number(s.reps);
    }
  }

  let headline, body, tone;

  const weaklingRatio = totalSets > 0 ? weaklingSets / totalSets : 0;

  if (weaklingRatio >= 0.5) {
    headline = "WEAKLING SESSION";
    body = "Je hebt structureel te licht getraind. Verhoog het gewicht of wees eerlijk over je RPE. Kracht bouw je niet op door jezelf te sparen.";
    tone = "bad";
  } else if (weaklingSets > 0 && weaklingSets <= 2) {
    headline = "Bijna goed";
    body = `${weaklingSets} set${weaklingSets > 1 ? "s waren" : " was"} te licht. Houd het schema bij volgend keer.`;
    tone = "warn";
  } else if (pushedSets > onTargetSets && pushedSets > 0) {
    headline = "Je hebt gepushed";
    body = "Je trainde harder dan gepland. Goed als dit bewust was — pas op voor overtraining op lange termijn.";
    tone = "warn";
  } else {
    headline = "Sterke sessie";
    body = "Je hebt je aan het plan gehouden. Consistentie is de basis van kracht.";
    tone = "good";
  }

  // Week completion bonus message
  let weekMsg = null;
  if (weekCompleted && program) {
    const nextWeek = newWeek;
    const totalWeeks = program.totalWeeks || 8;
    if (nextWeek > totalWeeks) {
      weekMsg = `Blok voltooid na ${totalWeeks} weken. Tijd voor een test of een nieuw blok.`;
    } else {
      const firstEx = program.sessions[0]?.exercises[0];
      if (firstEx) {
        const next = calcWeeklyTargets(firstEx, nextWeek, totalWeeks, program.goal || "peaking");
        weekMsg = next.isDeload
          ? `Week ${nextWeek - 1} afgerond. Volgende week: DELOAD — RPE ${next.targetRpe}, ${next.sets} sets.`
          : next.isPeak
          ? `Week ${nextWeek - 1} afgerond. Volgende week: PEAK WEEK — alles eruit halen.`
          : `Week ${nextWeek - 1} afgerond. Volgende week: RPE ${next.targetRpe}.`;
      }
    }
  }

  return { headline, body, tone, volume: Math.round(volume), weekMsg };
}
