/**
 * Firebase Firestore operations for tempSchedules collection.
 *
 * tempSchedules mirrors the schedules collection but holds UNSAVED
 * (in-progress) work. Entries are auto-saved every 5 seconds.
 *
 * Doc ID pattern: same as schedules — {timetableId}__{tableId}-{row}-{col}-{batch}
 * Extra fields: createdAt, updatedAt (serverTimestamp)
 *
 * Lifecycle:
 *  - Written every 5 s from the active timetable (auto-save)
 *  - Deleted automatically when the permanent schedule is newer than the temp entry
 *  - Deleted in bulk when the user saves (Ctrl+S / Save button)
 */

import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  where,
  writeBatch,
} from "firebase/firestore";

import { db } from "../firebaseConfig";
import { normalize, safeId } from "../../utils/dataHelpers";

const tempSchedulesCol = collection(db, "tempSchedules");

/**
 * Build a tempSchedule doc ID (same pattern as schedules).
 */
export function buildTempDocId(timetableId, tableId, row, col, batch) {
  return safeId(`${timetableId}__${tableId}-${row}-${col}-${batch}`);
}

/**
 * One-shot fetch of all temp entries for a timetable.
 */
export async function getTempSchedulesByTimetableId(timetableId) {
  if (!timetableId) return [];
  const snap = await getDocs(
    query(tempSchedulesCol, where("timetableId", "==", String(timetableId)))
  );
  return snap.docs.map((d) => ({ _docId: d.id, ...d.data() }));
}

/**
 * Save (upsert) a list of temp schedule entries.
 * Also handles deletion of entries that are no longer in the new list.
 *
 * @param {string} timetableId
 * @param {Array}  schedules   - array of schedule objects (same shape as schedules collection)
 */
export async function saveTempSchedules(timetableId, schedules) {
  if (!timetableId) return;
  const list = Array.isArray(schedules) ? schedules : [];

  // Fetch existing temp entries for this timetable
  const existing = await getTempSchedulesByTimetableId(timetableId);
  const existingIds = new Set(existing.map((e) => e._docId));

  const newIds = new Set();

  // Upsert in batches of 400
  for (let i = 0; i < list.length; i += 400) {
    const batch = writeBatch(db);
    list.slice(i, i + 400).forEach((s) => {
      const id = buildTempDocId(
        timetableId,
        s.tableId,
        s.rowIndex,
        s.colIndex,
        s.batchIndex
      );
      newIds.add(id);
      batch.set(
        doc(tempSchedulesCol, id),
        {
          timetableId: String(timetableId),
          tableId: normalize(s.tableId),
          rowIndex: Number(s.rowIndex) || 0,
          colIndex: Number(s.colIndex) || 0,
          batchIndex: Number(s.batchIndex) || 0,
          day: normalize(s.day),
          time: normalize(s.time),
          class: normalize(s.class),
          branch: normalize(s.branch),
          batch: normalize(s.batch),
          type: normalize(s.type),
          courseId: s.courseId ? String(s.courseId) : "",
          teacherId: s.teacherId ? String(s.teacherId) : "",
          roomId: s.roomId ? String(s.roomId) : "",
          updatedAt: serverTimestamp(),
          createdAt: serverTimestamp(), // merge:true means this only writes on creation
        },
        { merge: true }
      );
    });
    await batch.commit();
  }

  // Delete orphaned temp entries (cell was cleared)
  const toDelete = [...existingIds].filter((id) => !newIds.has(id));
  for (let i = 0; i < toDelete.length; i += 450) {
    const batch = writeBatch(db);
    toDelete.slice(i, i + 450).forEach((id) =>
      batch.delete(doc(tempSchedulesCol, id))
    );
    await batch.commit();
  }
}

/**
 * Upsert a list of temp schedule entries WITHOUT deleting others.
 * This is optimized for incremental auto-saves and saves massive DB quotas.
 */
export async function upsertTempSchedules(timetableId, schedules) {
  if (!timetableId) return;
  const list = Array.isArray(schedules) ? schedules : [];
  if (list.length === 0) return;

  // Upsert in batches of 400
  for (let i = 0; i < list.length; i += 400) {
    const batch = writeBatch(db);
    list.slice(i, i + 400).forEach((s) => {
      const id = buildTempDocId(
        timetableId,
        s.tableId,
        s.rowIndex,
        s.colIndex,
        s.batchIndex
      );
      batch.set(
        doc(tempSchedulesCol, id),
        {
          timetableId: String(timetableId),
          tableId: normalize(s.tableId),
          rowIndex: Number(s.rowIndex) || 0,
          colIndex: Number(s.colIndex) || 0,
          batchIndex: Number(s.batchIndex) || 0,
          day: normalize(s.day),
          time: normalize(s.time),
          class: normalize(s.class),
          branch: normalize(s.branch),
          batch: normalize(s.batch),
          type: normalize(s.type),
          courseId: s.courseId ? String(s.courseId) : "",
          teacherId: s.teacherId ? String(s.teacherId) : "",
          roomId: s.roomId ? String(s.roomId) : "",
          updatedAt: serverTimestamp(),
          createdAt: serverTimestamp(),
        },
        { merge: true }
      );
    });
    await batch.commit();
  }
}

/**
 * Delete ALL temp schedule entries for a timetable.
 * Called after a successful permanent save.
 */
export async function deleteTempSchedulesByTimetableId(timetableId) {
  if (!timetableId) return;
  const snap = await getDocs(
    query(tempSchedulesCol, where("timetableId", "==", String(timetableId)))
  );
  if (snap.empty) return;
  for (let i = 0; i < snap.docs.length; i += 450) {
    const batch = writeBatch(db);
    snap.docs.slice(i, i + 450).forEach((d) => batch.delete(d.ref));
    await batch.commit();
  }
}

/**
 * Delete a single temp entry by doc ID (used when schedule is newer).
 */
export async function deleteTempScheduleById(docId) {
  await deleteDoc(doc(tempSchedulesCol, String(docId)));
}

/**
 * Live listener for temp schedules of ONE timetable.
 * Returns an unsubscribe function.
 *
 * @param {string}   timetableId
 * @param {Function} onData   - called with array of temp schedule docs on every change
 * @param {Function} onError
 * @returns {() => void} unsubscribe
 */
export function watchTempSchedules(timetableId, onData, onError) {
  if (!timetableId) return () => {};
  const q = query(
    tempSchedulesCol,
    where("timetableId", "==", String(timetableId))
  );
  return onSnapshot(
    q,
    (snap) => {
      onData(snap.docs.map((d) => ({ _docId: d.id, ...d.data() })));
    },
    (err) => {
      console.error("[tempSchedules] snapshot error:", err);
      if (onError) onError(err);
    }
  );
}
