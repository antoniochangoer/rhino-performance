import { getSupabase } from "./supabase";

// ---- Programs ----

export async function getPrograms() {
  const supabase = getSupabase();
  const { data: programs, error } = await supabase
    .from("programs")
    .select(`
      *,
      sessions (
        *,
        exercises ( * )
      )
    `)
    .order("created_at", { ascending: false });

  if (error) { console.error("getPrograms:", error); return []; }

  return (programs || []).map(normalizeProgram);
}

export async function getProgram(id) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("programs")
    .select(`
      *,
      sessions (
        *,
        exercises ( * )
      )
    `)
    .eq("id", id)
    .single();

  if (error) { console.error("getProgram:", error); return null; }
  return data ? normalizeProgram(data) : null;
}

export async function createProgram({ name, description, goal, totalWeeks, startRpe }) {
  const supabase = getSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("programs")
    .insert({
      user_id: user.id,
      name,
      description: description || "",
      goal: goal || "peaking",
      total_weeks: Number(totalWeeks) || 8,
      start_rpe: Number(startRpe) || 7,
      current_index: 0,
      current_week: 1,
      active: false,
    })
    .select()
    .single();

  if (error) { console.error("createProgram:", error); return null; }
  return normalizeProgram(data);
}

export async function setActiveProgram(id) {
  const supabase = getSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  // Deactivate all, then activate the chosen one
  await supabase.from("programs").update({ active: false }).eq("user_id", user.id);
  await supabase.from("programs").update({ active: true }).eq("id", id);
}

export async function getActiveProgram() {
  const supabase = getSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("programs")
    .select(`
      *,
      sessions (
        *,
        exercises ( * )
      )
    `)
    .eq("user_id", user.id)
    .eq("active", true)
    .maybeSingle();

  if (error) { console.error("getActiveProgram:", error); return null; }
  return data ? normalizeProgram(data) : null;
}

export async function updateProgram(id, updates) {
  const supabase = getSupabase();
  const dbUpdates = {};
  if (updates.name !== undefined) dbUpdates.name = updates.name;
  if (updates.description !== undefined) dbUpdates.description = updates.description;
  if (updates.goal !== undefined) dbUpdates.goal = updates.goal;
  if (updates.totalWeeks !== undefined) dbUpdates.total_weeks = updates.totalWeeks;
  if (updates.startRpe !== undefined) dbUpdates.start_rpe = updates.startRpe;
  if (updates.currentIndex !== undefined) dbUpdates.current_index = updates.currentIndex;
  if (updates.currentWeek !== undefined) dbUpdates.current_week = updates.currentWeek;
  if (updates.active !== undefined) dbUpdates.active = updates.active;

  const { error } = await supabase.from("programs").update(dbUpdates).eq("id", id);
  if (error) console.error("updateProgram:", error);
}

export async function deleteProgram(id) {
  const supabase = getSupabase();
  const { error } = await supabase.from("programs").delete().eq("id", id);
  if (error) console.error("deleteProgram:", error);
}

// ---- Sessions ----

export async function addSession(programId, { name }) {
  const supabase = getSupabase();

  // Get current max position
  const { data: existing } = await supabase
    .from("sessions")
    .select("position")
    .eq("program_id", programId)
    .order("position", { ascending: false })
    .limit(1);

  const position = existing?.[0]?.position != null ? existing[0].position + 1 : 0;

  const { data, error } = await supabase
    .from("sessions")
    .insert({ program_id: programId, name, position })
    .select()
    .single();

  if (error) { console.error("addSession:", error); return null; }
  return { ...data, exercises: [] };
}

export async function updateSession(programId, sessionId, updates) {
  const supabase = getSupabase();
  const dbUpdates = {};
  if (updates.name !== undefined) dbUpdates.name = updates.name;
  if (updates.position !== undefined) dbUpdates.position = updates.position;

  const { error } = await supabase.from("sessions").update(dbUpdates).eq("id", sessionId);
  if (error) console.error("updateSession:", error);
}

export async function deleteSession(programId, sessionId) {
  const supabase = getSupabase();
  const { error } = await supabase.from("sessions").delete().eq("id", sessionId);
  if (error) console.error("deleteSession:", error);
}

// ---- Exercises ----

export async function addExercise(programId, sessionId, { name, sets, targetReps, targetRpe, oneRepMax }) {
  const supabase = getSupabase();

  // Need program startRpe for baseline
  const { data: prog } = await supabase
    .from("programs")
    .select("start_rpe")
    .eq("id", programId)
    .single();

  const baseRpe = Number(targetRpe) || (prog?.start_rpe || 7);

  // Get current max position
  const { data: existing } = await supabase
    .from("exercises")
    .select("position")
    .eq("session_id", sessionId)
    .order("position", { ascending: false })
    .limit(1);

  const position = existing?.[0]?.position != null ? existing[0].position + 1 : 0;

  const { data, error } = await supabase
    .from("exercises")
    .insert({
      session_id: sessionId,
      name,
      sets: Number(sets) || 3,
      target_reps: Number(targetReps) || 5,
      target_rpe: baseRpe,
      start_rpe: baseRpe,
      one_rep_max: Number(oneRepMax) || 0,
      position,
    })
    .select()
    .single();

  if (error) { console.error("addExercise:", error); return null; }
  return normalizeExercise(data);
}

export async function updateExercise(programId, sessionId, exerciseId, updates) {
  const supabase = getSupabase();
  const dbUpdates = {};
  if (updates.name !== undefined) dbUpdates.name = updates.name;
  if (updates.sets !== undefined) dbUpdates.sets = updates.sets;
  if (updates.targetReps !== undefined) dbUpdates.target_reps = updates.targetReps;
  if (updates.targetRpe !== undefined) dbUpdates.target_rpe = updates.targetRpe;
  if (updates.startRpe !== undefined) dbUpdates.start_rpe = updates.startRpe;
  if (updates.oneRepMax !== undefined) dbUpdates.one_rep_max = updates.oneRepMax;

  const { error } = await supabase.from("exercises").update(dbUpdates).eq("id", exerciseId);
  if (error) console.error("updateExercise:", error);
}

export async function deleteExercise(programId, sessionId, exerciseId) {
  const supabase = getSupabase();
  const { error } = await supabase.from("exercises").delete().eq("id", exerciseId);
  if (error) console.error("deleteExercise:", error);
}

// ---- Logs ----

export async function getLogs() {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("training_logs")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) { console.error("getLogs:", error); return []; }
  return (data || []).map(normalizeLog);
}

export async function getLog(id) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("training_logs")
    .select("*")
    .eq("id", id)
    .single();

  if (error) { console.error("getLog:", error); return null; }
  return data ? normalizeLog(data) : null;
}

export async function getActiveLog() {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("training_logs")
    .select("*")
    .eq("status", "active")
    .maybeSingle();

  if (error) { console.error("getActiveLog:", error); return null; }
  return data ? normalizeLog(data) : null;
}

export async function startTraining(programId) {
  const program = await getProgram(programId);
  if (!program || program.sessions.length === 0) return null;

  const existing = await getActiveLog();
  if (existing) return existing;

  const sessionIdx = program.currentIndex % program.sessions.length;
  const session = program.sessions[sessionIdx];
  const currentWeek = program.currentWeek || 1;

  const logExercises = session.exercises.map((ex) => {
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
        id: Math.random().toString(36).slice(2) + Date.now().toString(36),
        weight: w,
        reps: r,
        rpe: impliedRpe,
        completed: false,
      })),
    };
  });

  const supabase = getSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("training_logs")
    .insert({
      user_id: user.id,
      program_id: programId,
      session_id: session.id,
      session_name: session.name,
      session_index: sessionIdx,
      week_number: currentWeek,
      date: new Date().toISOString().slice(0, 10),
      status: "active",
      exercises: logExercises,
    })
    .select()
    .single();

  if (error) { console.error("startTraining:", error); return null; }
  return normalizeLog(data);
}

export async function updateLog(id, updates) {
  const supabase = getSupabase();
  const dbUpdates = {};
  if (updates.exercises !== undefined) dbUpdates.exercises = updates.exercises;
  if (updates.status !== undefined) dbUpdates.status = updates.status;

  const { error } = await supabase.from("training_logs").update(dbUpdates).eq("id", id);
  if (error) console.error("updateLog:", error);
}

export async function completeLog(logId) {
  const log = await getLog(logId);
  if (!log) return { weekCompleted: false, newWeek: 1 };

  await updateLog(logId, { status: "completed" });

  const program = await getProgram(log.programId);
  if (!program) return { weekCompleted: false, newWeek: 1 };

  const newIndex = log.sessionIndex + 1;
  const weekCompleted = newIndex >= program.sessions.length;
  const newWeek = weekCompleted ? (program.currentWeek || 1) + 1 : (program.currentWeek || 1);

  await updateProgram(program.id, {
    currentIndex: weekCompleted ? 0 : newIndex,
    currentWeek: newWeek,
  });

  return { weekCompleted, newWeek, prevWeek: program.currentWeek || 1 };
}

export async function deleteLog(id) {
  const supabase = getSupabase();
  const { error } = await supabase.from("training_logs").delete().eq("id", id);
  if (error) console.error("deleteLog:", error);
}

// ---- Progress / History ----

export async function getExerciseHistory(exerciseName, limit = 10) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("training_logs")
    .select("date, exercises")
    .eq("status", "completed")
    .order("date", { ascending: true });

  if (error) { console.error("getExerciseHistory:", error); return []; }

  const results = [];
  for (const log of data || []) {
    const ex = (log.exercises || []).find(
      (e) => e.name?.toLowerCase() === exerciseName.toLowerCase()
    );
    if (!ex) continue;

    let bestE1rm = 0;
    let bestWeight = 0;
    for (const s of ex.sets || []) {
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

export async function getAllExerciseNames() {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("training_logs")
    .select("exercises")
    .eq("status", "completed");

  if (error) { console.error("getAllExerciseNames:", error); return []; }

  const names = new Set();
  for (const log of data || []) {
    for (const ex of log.exercises || []) {
      if (ex.name) names.add(ex.name);
    }
  }
  return Array.from(names).sort();
}

// ---- Sharing ----

export async function shareProgram(programId, emailOrUsername) {
  const supabase = getSupabase();
  const input = emailOrUsername.trim().toLowerCase();

  // Try by username first, then by email (stored in profiles)
  const { data: byUsername } = await supabase
    .from("profiles")
    .select("id, username, email")
    .eq("username", input)
    .maybeSingle();

  const { data: byEmail } = byUsername ? { data: null } : await supabase
    .from("profiles")
    .select("id, username, email")
    .eq("email", input)
    .maybeSingle();

  const found = byUsername || byEmail;

  if (!found) {
    return { error: "Gebruiker niet gevonden. Zorg dat ze een account hebben op Rhino Performance." };
  }

  // Prevent sharing with yourself
  const { data: { user } } = await supabase.auth.getUser();
  if (found.id === user?.id) {
    return { error: "Je kunt een schema niet met jezelf delen." };
  }

  const { error } = await supabase
    .from("program_shares")
    .insert({ program_id: programId, shared_with: found.id });

  if (error) {
    if (error.code === "23505") return { error: "Dit schema is al gedeeld met deze gebruiker." };
    return { error: error.message };
  }

  return { success: true, username: found.username };
}

export async function getSharedWith(programId) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("program_shares")
    .select("shared_with, profiles!program_shares_shared_with_fkey(username, email)")
    .eq("program_id", programId);

  if (error) { console.error("getSharedWith:", error); return []; }
  return (data || []).map((row) => ({
    id: row.shared_with,
    username: row.profiles?.username || "—",
    email: row.profiles?.email || "",
  }));
}

export async function unshareProgram(programId, userId) {
  const supabase = getSupabase();
  const { error } = await supabase
    .from("program_shares")
    .delete()
    .eq("program_id", programId)
    .eq("shared_with", userId);

  if (error) console.error("unshareProgram:", error);
}

// ---- Profile ----

export async function getProfile() {
  const supabase = getSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (error) { console.error("getProfile:", error); return null; }
  return { ...data, email: user.email };
}

export async function updateUsername(username) {
  const supabase = getSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Niet ingelogd" };

  // Check uniqueness
  const { data: existing } = await supabase
    .from("profiles")
    .select("id")
    .eq("username", username)
    .neq("id", user.id)
    .maybeSingle();

  if (existing) return { error: "Deze gebruikersnaam is al bezet." };

  const { error } = await supabase
    .from("profiles")
    .update({ username })
    .eq("id", user.id);

  if (error) return { error: error.message };
  return { success: true };
}

export async function getGymPartners() {
  const supabase = getSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  // People I shared programs with + people who shared programs with me
  const { data: sharedByMe } = await supabase
    .from("program_shares")
    .select("shared_with, profiles!program_shares_shared_with_fkey(username, email), programs!inner(name)")
    .eq("programs.user_id", user.id);

  const { data: sharedWithMe } = await supabase
    .from("program_shares")
    .select("programs!inner(id, name, user_id), profiles!program_shares_program_id_fkey(username, email)")
    .eq("shared_with", user.id);

  const partnersMap = {};

  for (const row of sharedByMe || []) {
    const id = row.shared_with;
    if (!partnersMap[id]) {
      partnersMap[id] = {
        id,
        username: row.profiles?.username || "—",
        email: row.profiles?.email || "",
        sharedByMe: [],
        sharedWithMe: [],
      };
    }
    if (row.programs?.name) partnersMap[id].sharedByMe.push(row.programs.name);
  }

  for (const row of sharedWithMe || []) {
    const ownerId = row.programs?.user_id;
    if (!ownerId) continue;
    if (!partnersMap[ownerId]) {
      partnersMap[ownerId] = {
        id: ownerId,
        username: row.profiles?.username || "—",
        email: row.profiles?.email || "",
        sharedByMe: [],
        sharedWithMe: [],
      };
    }
    if (row.programs?.name) partnersMap[ownerId].sharedWithMe.push(row.programs.name);
  }

  return Object.values(partnersMap);
}

// ---- Normalization helpers ----
// Convert snake_case DB columns → camelCase JS objects

function normalizeProgram(p) {
  if (!p) return null;
  const sessions = (p.sessions || [])
    .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
    .map((s) => ({
      id: s.id,
      name: s.name,
      position: s.position,
      exercises: (s.exercises || [])
        .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
        .map(normalizeExercise),
    }));

  return {
    id: p.id,
    name: p.name,
    description: p.description || "",
    goal: p.goal || "peaking",
    totalWeeks: p.total_weeks || 8,
    startRpe: p.start_rpe || 7,
    currentIndex: p.current_index || 0,
    currentWeek: p.current_week || 1,
    active: p.active || false,
    createdAt: p.created_at,
    sessions,
  };
}

function normalizeExercise(e) {
  return {
    id: e.id,
    name: e.name,
    sets: e.sets || 3,
    targetReps: e.target_reps || 5,
    targetRpe: e.target_rpe || 7,
    startRpe: e.start_rpe || 7,
    oneRepMax: e.one_rep_max || 0,
    position: e.position || 0,
  };
}

function normalizeLog(l) {
  return {
    id: l.id,
    programId: l.program_id,
    sessionId: l.session_id,
    sessionName: l.session_name,
    sessionIndex: l.session_index || 0,
    weekNumber: l.week_number || 1,
    date: l.date,
    status: l.status,
    exercises: l.exercises || [],
    createdAt: l.created_at,
  };
}

// ---- RPE Calculations (pure functions, unchanged) ----

const RPE_TABLE = {
  10: [1.00, 0.955, 0.922, 0.892, 0.863, 0.837, 0.811, 0.786, 0.762, 0.739],
  9:  [0.955, 0.922, 0.892, 0.863, 0.837, 0.811, 0.786, 0.762, 0.739, 0.707],
  8:  [0.922, 0.892, 0.863, 0.837, 0.811, 0.786, 0.762, 0.739, 0.707, 0.680],
  7:  [0.892, 0.863, 0.837, 0.811, 0.786, 0.762, 0.739, 0.707, 0.680, 0.653],
  6:  [0.863, 0.837, 0.811, 0.786, 0.762, 0.739, 0.707, 0.680, 0.653, 0.626],
};

export function calcTargetWeight(oneRepMax, targetReps, targetRpe) {
  if (!oneRepMax || oneRepMax <= 0) return null;
  const rpe = Math.round(Math.min(10, Math.max(6, targetRpe)));
  const reps = Math.min(10, Math.max(1, targetReps));
  const row = RPE_TABLE[rpe] || RPE_TABLE[8];
  const pct = row[reps - 1] || row[0];
  const raw = oneRepMax * pct;
  return Math.round(raw / 2.5) * 2.5;
}

export function calcE1RM(weight, reps) {
  if (!weight || !reps || reps < 1) return null;
  if (reps === 1) return weight;
  return Math.round(weight * (1 + reps * 0.0333));
}

export function rpeColor(actual, target) {
  if (!actual || !target) return null;
  const diff = Math.abs(actual - target);
  if (diff <= 0.5) return "green";
  if (diff <= 1.5) return "orange";
  return "red";
}

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

export function calcWeeklyTargets(exercise, currentWeek, totalWeeks, goal) {
  const startRpe = exercise.startRpe || exercise.targetRpe || 7;
  const baseSets = exercise.sets || 3;

  if (goal === "maintenance") {
    return { targetRpe: startRpe, sets: baseSets, isDeload: false, isPeak: false };
  }

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

  const rpeStep = 0.5;
  const rawRpe = startRpe + (w - 1) * rpeStep;
  const targetRpe = Math.min(9, Math.round(rawRpe * 2) / 2);

  return { targetRpe, sets: baseSets, isDeload: false, isPeak: false };
}

export function getNextWeekPreview(program) {
  if (!program || !program.sessions.length) return null;
  const nextWeek = (program.currentWeek || 1) + 1;
  if (nextWeek > (program.totalWeeks || 8)) return null;

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

export function generateWorkoutFeedback(log, weekCompleted, newWeek, program) {
  if (!log || !log.exercises) return null;

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
