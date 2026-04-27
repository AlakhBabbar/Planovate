/**
 * Conflict model — full dual-timetable conflict tracking.
 *
 * Each document records a complete, self-contained conflict:
 *   - Source timetable: the one that was being edited when conflict was detected
 *   - Conflict timetable: the one that already had the teacher/room booked
 *
 * This allows loading and displaying all conflicts on the TimetableManagement
 * page even before any timetable is opened in the current session.
 *
 * status:
 *   'active'   — conflict still exists
 *   'resolved' — temp schedule was edited to remove the conflict (shown green)
 */

import mongoose from 'mongoose';

const conflictSchema = new mongoose.Schema({
  // ── Unique dedup key ────────────────────────────────────────────────────────
  // Format: type|conflictingId|sourceTimetableId|conflictTimetableId
  conflictKey: { type: String, unique: true, index: true },

  // ── Conflict type ────────────────────────────────────────────────────────────
  conflictType:  { type: String, enum: ['teacher', 'room'], required: true },
  conflictingId: String, // the shared teacherId or roomId value

  // ── Position in source timetable ────────────────────────────────────────────
  day:        String,
  time:       String,
  rowIndex:   Number,
  colIndex:   Number,
  batchIndex: { type: Number, default: 0 },

  // ── Source timetable (the one being edited) ──────────────────────────────────
  sourceTimetableId:   { type: String, index: true }, // e.g. "tt_btech_cse_4_fulltime"
  sourceScheduleId:    String,                         // MongoDB _id of Schedule/TempSchedule
  sourceScheduleType:  { type: String, enum: ['schedule', 'temp'] }, // saved or temp

  // Display info for source timetable (denormalized for fast rendering)
  sourceClass:    String,
  sourceBranch:   String,
  sourceSemester: String,
  sourceType:     String, // e.g. 'full-time'

  // ── Conflict timetable (the one that already had the booking) ────────────────
  conflictTimetableId:   { type: String, index: true },
  conflictScheduleId:    String,  // MongoDB _id of that Schedule/TempSchedule
  conflictScheduleType:  { type: String, enum: ['schedule', 'temp'] },

  // Display info for conflict timetable
  conflictClass:    String,
  conflictBranch:   String,
  conflictSemester: String,
  conflictType_:    String,  // avoid naming collision with conflictType field

  // ── Entity display names ─────────────────────────────────────────────────────
  teacherName: String,
  roomName:    String,

  // ── Lifecycle ────────────────────────────────────────────────────────────────
  status:     { type: String, default: 'active', enum: ['active', 'resolved'] },
  resolvedAt: Date,
  createdAt:  { type: Date, default: Date.now },
});

export default mongoose.model('Conflict', conflictSchema);
