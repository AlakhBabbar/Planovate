/**
 * conflictEngine.js — Backend Conflict Detection
 *
 * Checks a proposed (day, time, teacherId, roomId) assignment against ALL
 * schedules and tempSchedules in MongoDB.
 *
 * Returns a DEDUPLICATED array of ConflictDescriptor objects.
 *
 * Deduplication rule:
 *   Same (type, conflictingId, conflictingTimetable, rowIndex, colIndex, batchIndex)
 *   → keep only ONE entry, preferring source='schedule' over source='temp'.
 *
 * ConflictDescriptor:
 *   {
 *     type:                   "teacher" | "room"
 *     conflictingId:          string   — teacherId or roomId value
 *     conflictingTimetableId: string   — the OTHER timetable that has the same booking
 *     timetableId:            string   — the timetable being edited (caller's)
 *     day:                    string
 *     time:                   string
 *     rowIndex:               number
 *     colIndex:               number
 *     batchIndex:             number
 *     source:                 "schedule" | "temp"
 *   }
 */

import Schedule     from '../models/Schedule.js';
import TempSchedule from '../models/TempSchedule.js';

const norm = (v) => String(v ?? '').trim().toLowerCase();

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
  if (!day || !time)         return [];

  const normDay  = norm(day);
  const normTime = norm(time);
  const timeRegex = normTime.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  // Fetch all permanent + temp schedules at this day/time
  const [schedules, temps] = await Promise.all([
    Schedule.find({
      day:  { $regex: new RegExp(`^${normDay}$`, 'i') },
      time: { $regex: new RegExp(timeRegex, 'i') },
    }).lean(),
    TempSchedule.find({
      day:  { $regex: new RegExp(`^${normDay}$`, 'i') },
      time: { $regex: new RegExp(timeRegex, 'i') },
    }).lean(),
  ]);

  // Map: dedup key → ConflictDescriptor
  // Priority: 'schedule' wins over 'temp' for the same logical conflict.
  const deduped = new Map();

  function addConflict(s, type, entityId, source) {
    const conflictingTimetableId = s.timetableId;

    // Key: only on type + entity + conflicting timetable.
    // Position of the conflicting entry is irrelevant — same teacher/room
    // booked in the same foreign timetable at the same day/time is ONE conflict,
    // regardless of how rowIndex/colIndex are stored across Schedule vs TempSchedule.
    const key = `${type}|${norm(entityId)}|${conflictingTimetableId}`;

    const existing = deduped.get(key);
    // Only overwrite if upgrading from 'temp' → 'schedule'
    if (existing && existing.source === 'schedule') return;

    deduped.set(key, {
      type,
      conflictingId:           String(entityId),
      conflictingTimetableId,
      conflictScheduleId:      String(s._id || ''),  // MongoDB _id of conflicting doc
      conflictScheduleType:    source,                // 'schedule' | 'temp'
      timetableId,           // caller's timetable (the one being edited)
      day:       s.day,
      time:      s.time,
      rowIndex:  s.rowIndex  ?? 0,
      colIndex:  s.colIndex  ?? 0,
      batchIndex:s.batchIndex ?? 0,
      source,
    });
  }

  function scan(entries, source) {
    for (const s of entries) {
      // Skip ALL entries from the same timetable — conflicts are only
      // between DIFFERENT timetables. Same-timetable overlaps are handled
      // by frontend validation, not the conflict engine.
      if (s.timetableId === timetableId) continue;

      if (teacherId && s.teacherId && norm(s.teacherId) === norm(teacherId)) {
        addConflict(s, 'teacher', teacherId, source);
      }
      if (roomId && s.roomId && norm(s.roomId) === norm(roomId)) {
        addConflict(s, 'room', roomId, source);
      }
    }
  }

  // Schedule FIRST so its entries win dedup over temp
  scan(schedules, 'schedule');
  scan(temps,     'temp');

  return [...deduped.values()];
}
