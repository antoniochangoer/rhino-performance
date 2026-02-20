/**
 * Seed test data: "Test Peaking Blok" — 6 weeks peaking from RPE 7.5
 * Back Squat (1RM 140), Bench Press (1RM 100), Deadlift (1RM 180)
 */
import {
  getPrograms, savePrograms, getLogs, saveLogs,
  calcWeeklyTargets, calcTargetWeight, calcE1RM,
} from "@/lib/storage";

function generateId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function dateWeeksAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n * 7);
  return d.toISOString().slice(0, 10);
}

export function seedTestData() {
  // Wipe existing seed if called twice (match by name)
  const existingPrograms = getPrograms().filter((p) => p.name !== "Test Peaking Blok");
  const existingLogs = getLogs();

  const programId = generateId();
  const sessionId = generateId();

  const EXERCISES = [
    { id: generateId(), name: "Back Squat",   sets: 4, targetReps: 3, targetRpe: 7.5, startRpe: 7.5, oneRepMax: 140 },
    { id: generateId(), name: "Bench Press",  sets: 4, targetReps: 3, targetRpe: 7.5, startRpe: 7.5, oneRepMax: 100 },
    { id: generateId(), name: "Deadlift",     sets: 3, targetReps: 3, targetRpe: 7.5, startRpe: 7.5, oneRepMax: 180 },
  ];

  const TOTAL_WEEKS = 6;
  const GOAL = "peaking";

  const program = {
    id: programId,
    name: "Test Peaking Blok",
    description: "Automatisch gegenereerde testdata — 6 weken peaking vanaf RPE 7.5",
    goal: GOAL,
    totalWeeks: TOTAL_WEEKS,
    startRpe: 7.5,
    currentIndex: 0,
    currentWeek: 7,  // all 6 weeks completed
    active: true,
    sessions: [
      { id: sessionId, name: "Training A", exercises: EXERCISES },
    ],
  };

  // Generate completed logs: one per week, spread over last 6 weeks (oldest first)
  const newLogs = [];
  for (let week = 1; week <= TOTAL_WEEKS; week++) {
    const logId = generateId();
    const weeksAgo = TOTAL_WEEKS - week; // week 1 = 5 weeks ago, week 6 = 0 weeks ago

    const logExercises = EXERCISES.map((ex) => {
      const weekTargets = calcWeeklyTargets(ex, week, TOTAL_WEEKS, GOAL);
      const effectiveRpe = weekTargets.targetRpe;
      const effectiveSets = weekTargets.sets;
      const targetWeight = calcTargetWeight(ex.oneRepMax, ex.targetReps, effectiveRpe) || (ex.oneRepMax * 0.8);

      // Add small realistic variation: last set slightly heavier or same
      const sets = Array.from({ length: effectiveSets }, (_, i) => {
        // Slight progression within session: sets are equal weight, last set could be slightly lower RPE
        const weight = targetWeight;
        const reps = ex.targetReps;
        // For peak/deload weeks, add small fatigue RPE variation
        const rpeVariation = week >= TOTAL_WEEKS - 1 ? 0 : (i === effectiveSets - 1 ? 0.5 : 0);
        const rpe = Math.min(10, effectiveRpe + rpeVariation);
        return {
          id: generateId(),
          weight: String(weight),
          reps: String(reps),
          rpe: String(rpe),
          completed: true,
        };
      });

      return {
        exerciseId: ex.id,
        name: ex.name,
        targetReps: ex.targetReps,
        targetRpe: effectiveRpe,
        oneRepMax: ex.oneRepMax,
        weekNumber: week,
        sets,
      };
    });

    newLogs.push({
      id: logId,
      programId,
      sessionId,
      sessionName: "Training A",
      sessionIndex: 0,
      weekNumber: week,
      date: dateWeeksAgo(weeksAgo),
      status: "completed",
      exercises: logExercises,
    });
  }

  // Deactivate other programs
  const updatedPrograms = existingPrograms.map((p) => ({ ...p, active: false }));
  updatedPrograms.push(program);
  savePrograms(updatedPrograms);

  // Append new logs (keep existing history)
  saveLogs([...newLogs, ...existingLogs]);
}
