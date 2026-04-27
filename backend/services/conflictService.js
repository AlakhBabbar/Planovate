/**
 * conflictService.js — CRUD for the Conflict collection.
 *
 * Uses the dual-timetable schema:
 *   sourceTimetableId  — the timetable being edited
 *   conflictTimetableId — the timetable that already has the booking
 */

import Conflict from '../models/Conflict.js';

/**
 * Build the unique conflict key.
 * type|conflictingId|sourceTimetableId|conflictTimetableId
 */
function makeKey({ conflictType, conflictingId, sourceTimetableId, conflictTimetableId }) {
  return `${conflictType}|${String(conflictingId).trim().toLowerCase()}|${sourceTimetableId}|${conflictTimetableId}`;
}

/**
 * Upsert a list of enriched, active conflicts.
 * Each conflict must have the full dual-timetable fields.
 */
export async function upsertConflicts(conflicts) {
  if (!conflicts.length) return;

  const ops = conflicts.map(c => {
    const key = makeKey({
      conflictType:       c.type || c.conflictType,
      conflictingId:      c.conflictingId,
      sourceTimetableId:  c.sourceTimetableId,
      conflictTimetableId: c.conflictingTimetableId || c.conflictTimetableId,
    });

    return {
      updateOne: {
        filter: { conflictKey: key },
        update: {
          $set: {
            conflictKey:   key,
            conflictType:  c.type || c.conflictType,
            conflictingId: c.conflictingId,

            // Position (in source timetable)
            day:        c.day,
            time:       c.time,
            rowIndex:   c.rowIndex,
            colIndex:   c.colIndex,
            batchIndex: c.batchIndex ?? 0,

            // Source timetable
            sourceTimetableId:  c.sourceTimetableId,
            sourceScheduleId:   c.sourceScheduleId   || null,
            sourceScheduleType: c.sourceScheduleType || 'temp',
            sourceClass:        c.sourceClass        || null,
            sourceBranch:       c.sourceBranch       || null,
            sourceSemester:     c.sourceSemester      || null,
            sourceType:         c.sourceType         || null,

            // Conflict timetable
            conflictTimetableId:  c.conflictingTimetableId || c.conflictTimetableId,
            conflictScheduleId:   c.conflictScheduleId     || null,
            conflictScheduleType: c.conflictScheduleType || c.source || 'schedule',
            conflictClass:        c.displayClass     || null,
            conflictBranch:       c.displayBranch    || null,
            conflictSemester:     c.displaySemester  || null,
            conflictType_:        c.displayType      || null,

            // Entity display names
            teacherName: c.teacherName || null,
            roomName:    c.roomName    || null,

            status: 'active',
          },
          $setOnInsert: { createdAt: new Date() },
        },
        upsert: true,
      },
    };
  });

  await Conflict.bulkWrite(ops);
}

/**
 * Resolve conflicts for a cell when no conflicts are returned by the engine.
 * - temp source → mark 'resolved' (shown green until user saves)
 * - schedule source → delete (a perm conflict can't be resolved by temp edit)
 */
export async function resolveConflictsForCell({ sourceTimetableId, rowIndex, colIndex, batchIndex }) {
  const filter = { sourceTimetableId, rowIndex, colIndex, batchIndex: batchIndex ?? 0, status: 'active' };

  // Temp-sourced conflicts → mark resolved (green)
  await Conflict.updateMany(
    { ...filter, sourceScheduleType: 'temp' },
    { $set: { status: 'resolved', resolvedAt: new Date() } }
  );

  // Schedule-sourced conflicts were found in permanent data; can't resolve via temp edit
  // (they stay active until the permanent schedule is changed)
}

/**
 * Delete all conflicts for a cell permanently.
 * Called when user SAVES the temp schedule (conflict is gone for real).
 */
export async function deleteConflictsForCell({ sourceTimetableId, rowIndex, colIndex, batchIndex }) {
  await Conflict.deleteMany({ sourceTimetableId, rowIndex, colIndex, batchIndex: batchIndex ?? 0 });
}

/**
 * Load active/resolved conflicts for a specific timetable.
 * Used by socketHandler after open_timetable_ack.
 */
export async function loadConflictsForTimetable(sourceTimetableId) {
  return Conflict.find({ sourceTimetableId, status: { $in: ['active', 'resolved'] } }).lean();
}

/**
 * Load ALL active conflicts across ALL timetables.
 * Used by the REST endpoint for global page-load display.
 */
export async function loadAllActiveConflicts() {
  return Conflict.find({ status: { $in: ['active', 'resolved'] } })
    .sort({ createdAt: -1 })
    .lean();
}

/**
 * Delete ALL conflicts for a timetable (both source and conflict sides).
 * Called when a timetable is deleted or permanently saved with no conflicts.
 */
export async function deleteConflictsForTimetable(timetableId) {
  await Conflict.deleteMany({
    $or: [
      { sourceTimetableId: timetableId },
      { conflictTimetableId: timetableId },
    ],
  });
}
