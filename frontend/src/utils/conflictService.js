/**
 * conflictService.js
 *
 * Thin wrapper around the backend conflict-detection API.
 * Keeps TimetableManagement.jsx free of raw fetch() plumbing.
 */

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:3002";

/**
 * Build the flat schedule list that represents one open (unsaved) timetable tab.
 *
 * @param {object} batchData  - batchData[activeTable]  e.g. { "0-1-0": { teacherId, roomId, ... } }
 * @param {object} batches    - batches[activeTable]    e.g. { "0-1": 2 }
 * @param {string[]} days     - ["Mon","Tue","Wed","Thu","Fri","Sat"]
 * @param {string[]} timeSlots - ["7:00 - 7:55", ...]
 * @returns {Array<{day, time, teacherId, roomId}>}
 */
export function buildUnsavedSchedules(batchData, batches, days, timeSlots) {
  const schedules = [];
  const numRows = timeSlots.length;
  const numCols = days.length;

  for (let rowIndex = 0; rowIndex < numRows; rowIndex++) {
    for (let colIndex = 0; colIndex < numCols; colIndex++) {
      const cellKey = `${rowIndex}-${colIndex}`;
      const batchCount = batches?.[cellKey] ?? 1;

      for (let batchIdx = 0; batchIdx < batchCount; batchIdx++) {
        const dataKey = `${rowIndex}-${colIndex}-${batchIdx}`;
        const entry = batchData?.[dataKey];
        if (!entry) continue;

        // Only include cells that have at least a teacher or room
        if (!entry.teacherId && !entry.roomId) continue;

        schedules.push({
          day: (days[colIndex] ?? "").toString().toLowerCase(),
          time: (timeSlots[rowIndex] ?? "").toString().toLowerCase(),
          teacherId: entry.teacherId ?? "",
          roomId: entry.roomId ?? "",
        });
      }
    }
  }

  return schedules;
}

/**
 * Call the backend to check conflicts for a single cell entry.
 *
 * @param {object} params
 * @param {string} params.day           - e.g. "mon"
 * @param {string} params.time          - e.g. "7:00 - 7:55"
 * @param {string} params.teacherId
 * @param {string} params.roomId
 * @param {string} params.timetableId   - timetable this entry belongs to
 * @param {Array}  params.unsavedTimetables - [{ timetableId, schedules }]
 *
 * @returns {Promise<Array<{timetableId, day, time, conflictType}>>}
 */
export async function checkConflictsWithBackend({
  day,
  time,
  teacherId,
  roomId,
  timetableId,
  unsavedTimetables,
}) {
  try {
    const response = await fetch(`${BACKEND_URL}/api/check-conflicts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        entry: { day, time, teacherId: teacherId ?? "", roomId: roomId ?? "", timetableId: timetableId ?? "" },
        unsavedTimetables: unsavedTimetables ?? [],
      }),
    });

    if (!response.ok) {
      console.warn("[conflictService] backend returned", response.status);
      return [];
    }

    const data = await response.json();
    return data.conflicts ?? [];
  } catch (err) {
    // Network error — fail silently, local conflict check still works
    console.warn("[conflictService] backend unreachable:", err.message);
    return [];
  }
}
