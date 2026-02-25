import { calcWeeklyTargets } from "./storage";

/**
 * Expected target RPE for the current week in a peaking program.
 * @param {Object} program - normalized program with currentWeek, totalWeeks, goal, sessions[].exercises[]
 * @returns {number|null} expected RPE or null
 */
export function getExpectedRpeForWeek(program) {
  if (!program || (program.goal || "peaking") !== "peaking") return null;
  const firstEx = program.sessions?.[0]?.exercises?.[0];
  if (!firstEx) return null;
  const currentWeek = program.currentWeek || 1;
  const totalWeeks = program.totalWeeks || 8;
  const targets = calcWeeklyTargets(firstEx, currentWeek, totalWeeks, program.goal || "peaking");
  return targets.targetRpe;
}

/**
 * Whether to show the "RPE too high too early" warning for a peaking block.
 * Shows when still in first ~35% of block and any exercise has target RPE >= 8.
 */
export function shouldShowRpeEarlyWarning(program) {
  if (!program || (program.goal || "peaking") !== "peaking") return false;
  const totalWeeks = program.totalWeeks || 8;
  const currentWeek = program.currentWeek || 1;
  if (totalWeeks < 2) return false;
  const earlyThreshold = totalWeeks * 0.35;
  if (currentWeek > earlyThreshold) return false;

  const expectedRpe = getExpectedRpeForWeek(program);
  if (expectedRpe == null) return false;

  for (const session of program.sessions || []) {
    for (const ex of session.exercises || []) {
      const targetRpe = ex.targetRpe ?? 7;
      if (targetRpe >= 8 && targetRpe >= expectedRpe + 0.5) return true;
    }
  }
  return false;
}
