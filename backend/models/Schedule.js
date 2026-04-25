/**
 * Schedule document shape.
 *
 * Firestore collection: "schedules"
 * Doc ID pattern: {timetableId}__{tableId}-{row}-{col}-{batch}
 */

/**
 * @typedef {Object} Schedule
 * @property {string} timetableId
 * @property {string} tableId
 * @property {number} rowIndex
 * @property {number} colIndex
 * @property {number} batchIndex
 * @property {string} day          - e.g. "mon"
 * @property {string} time         - e.g. "7:00 - 7:55"
 * @property {string} class
 * @property {string} branch
 * @property {string} batch
 * @property {string} type
 * @property {string} courseId
 * @property {string} teacherId
 * @property {string} roomId
 */

/** Normalize helper (mirrors frontend dataHelpers) */
export const normalize = (v) =>
  String(v ?? "")
    .trim()
    .replace(/\s+/g, " ");

export const safeId = (v) =>
  normalize(v)
    .toLowerCase()
    .replace(/\//g, "-")
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_-]/g, "")
    .slice(0, 180);

/**
 * Build a schedule doc ID (same logic as frontend)
 */
export function buildScheduleDocId(timetableId, tableId, row, col, batch) {
  return safeId(
    `${timetableId}__${tableId}-${row}-${col}-${batch}`
  );
}
