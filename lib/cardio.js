// Curated list of performance / athletic cardio modalities for autocomplete
// Users can still type custom modalities (e.g. cross trainer variants, classes)

export const CARDIO_MODALITIES = [
  "Hardlopen",
  "Loopband",
  "Fietsen",
  "Stationaire fiets",
  "Ski-erg",
  "Assault Bike",
  "Roeier",
  "Rowing",
  "Sled Push",
  "Sled Pull",
  "Cross Trainer",
  "Elliptical",
  "Battling Ropes",
  "Jump Rope",
  "Swimming",
  "Zwemmen",
];

/**
 * Returns modalities matching the query (case-insensitive, partial match).
 * Max 8 suggestions.
 */
export function searchCardioModalities(query) {
  if (!query || query.trim().length < 1) return [];
  const q = query.trim().toLowerCase();
  return CARDIO_MODALITIES.filter((name) => name.toLowerCase().includes(q)).slice(0, 8);
}
