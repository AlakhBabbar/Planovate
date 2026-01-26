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
  const tp = safeId(meta?.type);
  if (!cls || !br || !sem || !tp) {
    throw new Error("Timetable requires class, branch, and semester and type");
  }
  return `tt_${cls}__${br}__${sem}__${tp}`;
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
  console.log('📦 buildScheduleOccurrences called with:', {
    timetableId,
    tablesProvided: tables,
    daysCount: days?.length,
    timeSlotsCount: timeSlots?.length,
    batchesByTableKeys: Object.keys(batchesByTable ?? {}),
    batchDataByTableKeys: Object.keys(batchDataByTable ?? {})
  });
  
  const normalizedDays = (days?.length ? days : DEFAULT_DAYS).map(normalize);
  const normalizedSlots = (timeSlots ?? []).map(normalize);
  const tableIds = tables?.length ? tables : Object.keys(batchesByTable ?? {});

  console.log('📋 Processing tables:', tableIds);

  const occurrences = [];

  for (const tableId of tableIds) {
    const batchesForTable = batchesByTable?.[tableId] ?? {};
    const dataForTable = batchDataByTable?.[tableId] ?? {};
    
    console.log(`🔍 Processing table "${tableId}":`, {
      batchesForTable,
      dataForTable,
      batchesKeys: Object.keys(batchesForTable),
      dataKeys: Object.keys(dataForTable)
    });

    for (let rowIndex = 0; rowIndex < normalizedSlots.length; rowIndex += 1) {
      for (let colIndex = 0; colIndex < normalizedDays.length; colIndex += 1) {
        const count = getBatchCount(batchesForTable, rowIndex, colIndex);
        for (let batchIndex = 0; batchIndex < count; batchIndex += 1) {
          const key = dataKey(rowIndex, colIndex, batchIndex);
          const entry = dataForTable?.[key] ?? {};
          console.log(`🔎 Looking for data at key "${key}":`, entry);
          
          const course = normalize(entry.course);
          const teacher = normalize(entry.teacher);
          const room = normalize(entry.room);
          const batch = normalize(entry.batchName);
          
          // Get ID fields if available (for new data structure)
          const courseId = entry.courseId ? String(entry.courseId) : "";
          const teacherId = entry.teacherId ? String(entry.teacherId) : "";
          const roomId = entry.roomId ? String(entry.roomId) : "";

          // Skip truly empty blocks to keep the DB clean
          if (!course && !teacher && !room && !batch && !courseId && !teacherId && !roomId) {
            console.log(`⏭️ Skipping empty cell: ${tableId} [${rowIndex}, ${colIndex}, ${batchIndex}]`);
            continue;
          }
          
          console.log(`✅ Adding schedule: ${tableId} [${rowIndex}, ${colIndex}, ${batchIndex}] - ${course || '(no course)'}`);

          const occurrence = {
            timetableId,
            tableId: normalize(tableId),
            rowIndex,
            colIndex,
            batchIndex,
            day: normalizedDays[rowIndex] ?? "",
            time: normalizedSlots[colIndex] ?? "",
            class: normalize(meta?.class),
            branch: normalize(meta?.branch),
            batch,
            course,
            teacher,
            type: normalize(meta?.type),
            room,
          };
          
          // Add ID fields if they exist
          if (courseId) occurrence.courseId = courseId;
          if (teacherId) occurrence.teacherId = teacherId;
          if (roomId) occurrence.roomId = roomId;
          
          occurrences.push(occurrence);
        }
      }
    }
  }

  console.log(`📊 Total occurrences built: ${occurrences.length}`);
  if (occurrences.length > 0) {
    console.log('📊 First occurrence:', occurrences[0]);
  } else {
    console.warn('⚠️ No occurrences were built! Check if batchData has any entries.');
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

    const batchEntry = {
      course: o.course ?? "",
      teacher: o.teacher ?? "",
      room: o.room ?? "",
      batchName: o.batch ?? "",
    };
    
    // Add ID fields if they exist (new data structure)
    if (o.courseId) batchEntry.courseId = String(o.courseId);
    if (o.teacherId) batchEntry.teacherId = String(o.teacherId);
    if (o.roomId) batchEntry.roomId = String(o.roomId);
    
    batchDataByTable[tableId][dataKey(o.rowIndex, o.colIndex, o.batchIndex ?? 0)] = batchEntry;
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
    type: normalize(meta?.type),
    days: (days?.length ? days : DEFAULT_DAYS).map(normalize),
    timeSlots: (timeSlots ?? []).map(normalize),
  };
}
