/**
 * conflictEngine.js — Backend Conflict Detection
 *
 * Checks a proposed (day, time, teacherId, roomId) assignment against ALL
 * schedules and tempSchedules in MongoDB.
 *
 * Returns an array of ConflictDescriptor objects, empty if no conflict.
 *
 * ConflictDescriptor:
 *   {
 *     type:         "teacher" | "room"
 *     conflictingId: string             — teacherId or roomId
 *     conflictingName: string           — for display
 *     timetableId:  string
 *     day:          string
 *     time:         string
 *     rowIndex:     number
 *     colIndex:     number
 *     batchIndex:   number
 *     source:       "schedule" | "temp" — which collection the conflict came from
 *   }
 */

import Schedule    from '../models/Schedule.js';
import TempSchedule from '../models/TempSchedule.js';

const norm = (v) => String(v ?? '').trim().toLowerCase();

/**
 * Main entry point.
 *
 * @param {object} params
 * @param {string}  params.timetableId    — the timetable being edited
 * @param {string}  params.day            — e.g. "mon"
 * @param {string}  params.time           — e.g. "7:00 - 7:55"
 * @param {number}  params.rowIndex
 * @param {number}  params.colIndex
 * @param {number}  params.batchIndex
 * @param {string}  [params.teacherId]
 * @param {string}  [params.roomId]
 *
 * @returns {Promise<ConflictDescriptor[]>}
 */
export async function checkCellConflicts({
  timetableId,
  day,
  time,
  rowIndex,
  colIndex,
  batchIndex,
  teacherId,
  roomId,
}) {
  if (!teacherId && !roomId) return [];
  if (!day || !time) return [];

  const normDay  = norm(day);
  const normTime = norm(time);

  const conflicts = [];

  // ── Fetch all permanent + temp schedules at this day/time ──────────────────
  const [schedules, temps] = await Promise.all([
    Schedule.find({ day: { $regex: new RegExp(`^${normDay}$`, 'i') }, time: { $regex: new RegExp(normTime.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') } }).lean(),
    TempSchedule.find({ day: { $regex: new RegExp(`^${normDay}$`, 'i') }, time: { $regex: new RegExp(normTime.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') } }).lean(),
  ]);

  // ── Helper: check one collection's entries ─────────────────────────────────
  function scan(entries, source) {
    for (const s of entries) {
      // Skip the exact cell being edited (same timetable + position + batch)
      const isSelf =
        s.timetableId === timetableId &&
        s.rowIndex    === rowIndex    &&
        s.colIndex    === colIndex    &&
        s.batchIndex  === batchIndex;
      if (isSelf) continue;

      // Teacher conflict
      if (teacherId && s.teacherId && norm(s.teacherId) === norm(teacherId)) {
        conflicts.push({
          type:          'teacher',
          conflictingId: String(teacherId),
          timetableId:   s.timetableId,
          day:           s.day,
          time:          s.time,
          rowIndex:      s.rowIndex,
          colIndex:      s.colIndex,
          batchIndex:    s.batchIndex ?? 0,
          source,
        });
      }

      // Room conflict
      if (roomId && s.roomId && norm(s.roomId) === norm(roomId)) {
        conflicts.push({
          type:          'room',
          conflictingId: String(roomId),
          timetableId:   s.timetableId,
          day:           s.day,
          time:          s.time,
          rowIndex:      s.rowIndex,
          colIndex:      s.colIndex,
          batchIndex:    s.batchIndex ?? 0,
          source,
        });
      }
    }
  }

  scan(schedules, 'schedule');
  scan(temps,     'temp');

  return conflicts;
}
