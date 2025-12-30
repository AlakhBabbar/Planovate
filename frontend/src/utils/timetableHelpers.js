/**
 * Business logic for timetable operations
 */

import { normalize, safeId, cellKey, dataKey, DEFAULT_DAYS } from "./dataHelpers";

/**
 * Gets the batch count for a specific cell
 */
export function getBatchCount(batchesForTable, rowIndex, colIndex) {
  const k = cellKey(rowIndex, colIndex);
  const count = batchesForTable?.[k];
  if (typeof count === "number" && Number.isFinite(count) && count > 0) return count;
  return 1;
}

/**
 * Generates a timetable document ID from metadata
 */
export function generateTimetableId(meta) {
  const cls = safeId(meta?.class);
  const br = safeId(meta?.branch);
  const sem = safeId(meta?.semester);
  if (!cls || !br || !sem) {
    throw new Error("Timetable requires class, branch, and semester");
  }
  return `tt_${cls}__${br}__${sem}`;
}

/**
 * Builds schedule occurrences from timetable data
 * Each occurrence represents a single batch in a cell
 */
export function buildScheduleOccurrences({
  timetableId,
  meta,
  tables,
  days,
  timeSlots,
  batchesByTable,
  batchDataByTable,
}) {
  const normalizedDays = (days?.length ? days : DEFAULT_DAYS).map(normalize);
  const normalizedSlots = (timeSlots ?? []).map(normalize);
  const tableIds = tables?.length ? tables : Object.keys(batchesByTable ?? {});

  const occurrences = [];

  for (const tableId of tableIds) {
    const batchesForTable = batchesByTable?.[tableId] ?? {};
    const dataForTable = batchDataByTable?.[tableId] ?? {};

    for (let rowIndex = 0; rowIndex < normalizedSlots.length; rowIndex += 1) {
      for (let colIndex = 0; colIndex < normalizedDays.length; colIndex += 1) {
        const count = getBatchCount(batchesForTable, rowIndex, colIndex);
        for (let batchIndex = 0; batchIndex < count; batchIndex += 1) {
          const entry = dataForTable?.[dataKey(rowIndex, colIndex, batchIndex)] ?? {};
          const course = normalize(entry.course);
          const teacher = normalize(entry.teacher);
          const room = normalize(entry.room);
          const batch = normalize(entry.batchName);

          // Skip truly empty blocks to keep the DB clean
          if (!course && !teacher && !room && !batch) continue;

          occurrences.push({
            timetableId,
            tableId: normalize(tableId),
            rowIndex,
            colIndex,
            batchIndex,
            day: normalizedDays[colIndex] ?? "",
            time: normalizedSlots[rowIndex] ?? "",
            class: normalize(meta?.class),
            branch: normalize(meta?.branch),
            batch,
            course,
            teacher,
            room,
          });
        }
      }
    }
  }

  return occurrences;
}

/**
 * Reconstructs timetable data structure from schedule list
 */
export function reconstructTimetableFromSchedules(schedules) {
  const batchesByTable = {};
  const batchDataByTable = {};

  schedules.forEach((o) => {
    const tableId = o.tableId || "Table 1";

    if (!batchesByTable[tableId]) batchesByTable[tableId] = {};
    if (!batchDataByTable[tableId]) batchDataByTable[tableId] = {};

    const cell = cellKey(o.rowIndex, o.colIndex);
    const currentCount = batchesByTable[tableId][cell] || 1;
    const nextCount = Math.max(currentCount, (o.batchIndex ?? 0) + 1);
    batchesByTable[tableId][cell] = nextCount;

    batchDataByTable[tableId][dataKey(o.rowIndex, o.colIndex, o.batchIndex ?? 0)] = {
      course: o.course ?? "",
      teacher: o.teacher ?? "",
      room: o.room ?? "",
      batchName: o.batch ?? "",
    };
  });

  return { batchesByTable, batchDataByTable };
}

/**
 * Prepares timetable metadata for storage
 * Note: table names are NOT stored as they are derived from schedules
 */
export function prepareTimetablePayload(meta, days, timeSlots) {
  const timetableId = generateTimetableId(meta);
  
  return {
    unid: timetableId,
    timetableId,
    name: normalize(meta?.name) || `Timetable ${timetableId}`,
    class: normalize(meta?.class),
    branch: normalize(meta?.branch),
    faculty: normalize(meta?.faculty),
    department: normalize(meta?.department),
    semester: normalize(meta?.semester),
    days: (days?.length ? days : DEFAULT_DAYS).map(normalize),
    timeSlots: (timeSlots ?? []).map(normalize),
  };
}
