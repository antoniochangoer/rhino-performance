/**
 * Seed test data: "Test Peaking Blok" — 6 weeks peaking from RPE 7.5
 * Back Squat (1RM 140), Bench Press (1RM 100), Deadlift (1RM 180)
 *
 * Calling this multiple times is safe: it deletes the old seed first.
 */
import {
  createProgram, addSession, addExercise, setActiveProgram,
  calcWeeklyTargets, calcTargetWeight,
} from "@/lib/storage";
import { getSupabase } from "@/lib/supabase";

const SEED_NAME = "Test Peaking Blok";

function generateId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function dateWeeksAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n * 7);
  return d.toISOString().slice(0, 10);
}

export async function seedTestData() {
  const supabase = getSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  // Delete any existing seed programs (and their logs via CASCADE)
  const { data: existing } = await supabase
    .from("programs")
    .select("id")
    .eq("user_id", user.id)
    .eq("name", SEED_NAME);

  if (existing?.length) {
    const ids = existing.map((p) => p.id);
    await supabase.from("training_logs").delete().in("program_id", ids);
    await supabase.from("programs").delete().in("id", ids);
  }

  const TOTAL_WEEKS = 6;
  const GOAL = "peaking";
  const START_RPE = 7.5;

  const EXERCISE_DEFS = [
    { name: "Back Squat",  sets: 4, targetReps: 3, targetRpe: 7.5, startRpe: 7.5, oneRepMax: 140 },
    { name: "Bench Press", sets: 4, targetReps: 3, targetRpe: 7.5, startRpe: 7.5, oneRepMax: 100 },
    { name: "Deadlift",    sets: 3, targetReps: 3, targetRpe: 7.5, startRpe: 7.5, oneRepMax: 180 },
  ];

  const program = await createProgram({
    name: SEED_NAME,
    description: "Automatisch gegenereerde testdata — 6 weken peaking vanaf RPE 7.5",
    goal: GOAL,
    totalWeeks: TOTAL_WEEKS,
    startRpe: START_RPE,
  });
  if (!program) return;

  await setActiveProgram(program.id);

  const session = await addSession(program.id, { name: "Training A" });
  if (!session) return;

  const exercises = [];
  for (const def of EXERCISE_DEFS) {
    const ex = await addExercise(program.id, session.id, def);
    if (ex) exercises.push({ ...def, id: ex.id });
  }

  const logs = [];
  for (let week = 1; week <= TOTAL_WEEKS; week++) {
    const weeksAgo = TOTAL_WEEKS - week;

    const logExercises = exercises.map((ex) => {
      const weekTargets = calcWeeklyTargets(ex, week, TOTAL_WEEKS, GOAL);
      const effectiveRpe = weekTargets.targetRpe;
      const effectiveSets = weekTargets.sets;
      const targetWeight = calcTargetWeight(ex.oneRepMax, ex.targetReps, effectiveRpe) || (ex.oneRepMax * 0.8);

      const sets = Array.from({ length: effectiveSets }, (_, i) => {
        const rpeVariation = week >= TOTAL_WEEKS - 1 ? 0 : (i === effectiveSets - 1 ? 0.5 : 0);
        const rpe = Math.min(10, effectiveRpe + rpeVariation);
        return {
          id: generateId(),
          weight: String(targetWeight),
          reps: String(ex.targetReps),
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

    logs.push({
      user_id: user.id,
      program_id: program.id,
      session_id: session.id,
      session_name: "Training A",
      session_index: 0,
      week_number: week,
      date: dateWeeksAgo(weeksAgo),
      status: "completed",
      exercises: logExercises,
    });
  }

  await supabase.from("training_logs").insert(logs);

  await supabase
    .from("programs")
    .update({ current_week: 7, current_index: 0 })
    .eq("id", program.id);
}
