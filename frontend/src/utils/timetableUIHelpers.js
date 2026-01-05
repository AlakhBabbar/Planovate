/**
 * UI helper functions for timetable management
 * These handle UI-specific logic and data processing
 */

import { generateTimetableId } from "./timetableHelpers";

/**
 * Default time slots for a new timetable
 */
export const DEFAULT_TIME_SLOTS = [
  "7:00 - 7:55",
  "8:00 - 8:55",
  "9:00 - 9:55",
  "10:00 - 10:55",
  "11:00 - 11:55",
  "12:00 - 12:55",
  "1:00 - 1:55",
  "2:00 - 2:55",
];

/**
 * Checks if an existing timetable exists and returns it
 */
export async function checkExistingTimetable(className, branch, semester, type, timetableService) {
  // Only check if all three fields are filled
  if (!className?.trim() || !branch?.trim() || !semester?.trim() || !type?.trim()) {
    return null;
  }

  try {
    const timetableId = generateTimetableId({
      class: className,
      branch: branch,
      semester: semester,
      type: type,
    });

    const existingTimetable = await timetableService.loadTimetable(timetableId);
    
    if (existingTimetable) {
      return {
        ...existingTimetable,
        timetableId,
        tables: existingTimetable.tables || ["Table 1"],
        timeSlots: existingTimetable.timeSlots || DEFAULT_TIME_SLOTS,
        batchesByTable: existingTimetable.batchesByTable || {},
        batchDataByTable: existingTimetable.batchDataByTable || {},
      };
    }
    
    return null;
  } catch (error) {
    console.error("Error checking for existing timetable:", error);
    return null;
  }
}

/**
 * Calculates conflict statistics from conflicts data
 */
export function calculateConflictStats(conflicts) {
  const teacherConflicts = new Set();
  const roomConflicts = new Set();
  
  Object.values(conflicts).forEach((tableConflicts) => {
    Object.entries(tableConflicts).forEach(([key, conflictData]) => {
      if (conflictData.teacher?.conflict) {
        const cellKey = key.split("-").slice(0, 2).join("-");
        conflictData.teacher.matches?.forEach(match => {
          if (match.teacher) teacherConflicts.add(`${match.teacher}-${cellKey}`);
        });
      }
      if (conflictData.room?.conflict) {
        const cellKey = key.split("-").slice(0, 2).join("-");
        conflictData.room.matches?.forEach(match => {
          if (match.room) roomConflicts.add(`${match.room}-${cellKey}`);
        });
      }
    });
  });
  
  return {
    teacherConflicts: teacherConflicts.size,
    roomConflicts: roomConflicts.size
  };
}

/**
 * Creates a new batch in the batches data structure
 */
export function createBatchInCell(currentBatches, activeTable, rowIndex, colIndex) {
  const key = `${rowIndex}-${colIndex}`;
  const tableData = currentBatches[activeTable] || {};
  
  return {
    ...currentBatches,
    [activeTable]: {
      ...tableData,
      [key]: (tableData[key] || 1) + 1
    }
  };
}

/**
 * Updates batch data and handles conflict checking
 */
export function updateBatchData({
  currentBatchData,
  currentBatches,
  activeTable,
  rowIndex,
  colIndex,
  batchIndex,
  field,
  value,
  tables,
  checkConflictsFn,
}) {
  const key = `${rowIndex}-${colIndex}-${batchIndex}`;
  const tableData = currentBatchData[activeTable] || {};
  
  const updated = {
    ...currentBatchData,
    [activeTable]: {
      ...tableData,
      [key]: {
        ...(tableData[key] || {}),
        [field]: value
      }
    }
  };
  
  let conflictResult = null;
  if (field === "teacher" || field === "room") {
    conflictResult = checkConflictsFn({
      rowIndex,
      colIndex,
      batchIndex,
      field,
      nextValue: value,
      batchesByTable: {
        ...currentBatches,
        [activeTable]: updated[activeTable]
      },
      batchDataByTable: updated,
      tableId: activeTable,
      tableIds: tables
    });
  }
  
  return {
    updatedBatchData: updated,
    conflictResult
  };
}

/**
 * Updates conflicts state based on conflict result
 */
export function updateConflictsState(currentConflicts, activeTable, key, field, conflictResult) {
  const tableConflicts = currentConflicts[activeTable] || {};
  
  return {
    ...currentConflicts,
    [activeTable]: {
      ...tableConflicts,
      [key]: {
        ...(tableConflicts[key] || {}),
        teacher: field === "teacher" 
          ? conflictResult.teacher 
          : (tableConflicts[key]?.teacher || { conflict: false }),
        room: field === "room" 
          ? conflictResult.room 
          : (tableConflicts[key]?.room || { conflict: false })
      }
    }
  };
}

/**
 * Generates a new table name
 */
export function generateTableName(currentTables) {
  return `Table ${currentTables.length + 1}`;
}

/**
 * Generates the next time slot
 */
export function generateNextTimeSlot(currentTimeSlots) {
  const lastSlot = currentTimeSlots[currentTimeSlots.length - 1];
  const [startHour, startMinute] = lastSlot.split(" - ")[1].split(":");
  let newHour = parseInt(startHour) + 1;
  return `${newHour}:00 - ${newHour}:55`;
}
