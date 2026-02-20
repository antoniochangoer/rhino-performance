// Curated list of strength & gym exercises for autocomplete
// Focused on powerlifting, strength sport, and standard gym movements
// No gimmicks — pure performance-focused exercises

export const EXERCISES = [
  // --- Squat ---
  "Back Squat",
  "Front Squat",
  "Box Squat",
  "Safety Bar Squat",
  "Pause Squat",
  "High Bar Squat",
  "Low Bar Squat",
  "Bulgarian Split Squat",
  "Goblet Squat",

  // --- Deadlift ---
  "Deadlift",
  "Sumo Deadlift",
  "Romanian Deadlift",
  "Trap Bar Deadlift",
  "Stiff Leg Deadlift",
  "Deficit Deadlift",
  "Block Pull",
  "Rack Pull",

  // --- Bench Press ---
  "Bench Press",
  "Close Grip Bench Press",
  "Incline Bench Press",
  "Decline Bench Press",
  "Pause Bench Press",
  "Floor Press",
  "DB Bench Press",
  "DB Incline Press",

  // --- Overhead ---
  "Overhead Press",
  "Push Press",
  "Seated Overhead Press",
  "Seated DB Press",
  "Arnold Press",
  "Z Press",

  // --- Horizontal Pull ---
  "Barbell Row",
  "Pendlay Row",
  "Seal Row",
  "Cable Row",
  "DB Row",
  "Chest Supported Row",
  "T-Bar Row",

  // --- Vertical Pull ---
  "Pull-Up",
  "Chin-Up",
  "Lat Pulldown",
  "Close Grip Pulldown",
  "Neutral Grip Pull-Up",

  // --- Hinge / Posterior Chain ---
  "Good Morning",
  "Hip Thrust",
  "Glute Bridge",
  "Leg Curl",
  "Nordic Curl",

  // --- Leg ---
  "Leg Press",
  "Hack Squat",
  "Lunge",
  "Step Up",
  "Leg Extension",

  // --- Arms & Shoulders ---
  "Tricep Pushdown",
  "Skull Crusher",
  "Tricep Dips",
  "Barbell Curl",
  "DB Curl",
  "Hammer Curl",
  "Face Pull",
  "Lateral Raise",
  "Rear Delt Fly",

  // --- Olympic ---
  "Power Clean",
  "Hang Clean",
  "Power Snatch",
  "Hang Snatch",
  "Clean and Jerk",
];

/**
 * Returns exercises matching the query string (case-insensitive, partial match).
 * Max 6 suggestions.
 */
export function searchExercises(query) {
  if (!query || query.trim().length < 1) return [];
  const q = query.trim().toLowerCase();
  return EXERCISES.filter((name) => name.toLowerCase().includes(q)).slice(0, 6);
}
