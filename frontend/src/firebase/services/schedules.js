/**
 * Firebase Firestore operations for schedules
 * This file contains ONLY database read/write operations
 * Business logic is in utils/timetableHelpers.js
 */

import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  where,
  writeBatch,
} from "firebase/firestore";

import { db } from "../firebaseConfig";
import { normalize, safeId } from "../../utils/dataHelpers";

const schedulesCol = collection(db, "schedules");

/**
 * Fetches all schedules for a timetable
 */
export async function getSchedulesByTimetableId(timetableId) {
  if (!timetableId) return [];
  const snap = await getDocs(
    query(schedulesCol, where("timetableId", "==", String(timetableId)))
  );
  return snap.docs.map((d) => d.data());
}

/**
 * Deletes all schedules for a timetable
 */
export async function deleteSchedulesByTimetableId(timetableId) {
  if (!timetableId) return;

  const snap = await getDocs(
    query(schedulesCol, where("timetableId", "==", String(timetableId)))
  );
  if (snap.empty) return;

  const docs = snap.docs;
  for (let i = 0; i < docs.length; i += 450) {
    const batch = writeBatch(db);
    docs.slice(i, i + 450).forEach((d) => batch.delete(d.ref));
    await batch.commit();
  }
}

/**
 * Saves multiple schedule records intelligently
 * - Updates existing entries when cell has data
 * - Deletes entries only when cell is completely empty
 * - Handles migration from single to multiple batches
 */
export async function saveSchedules({ timetableId, schedules }) {
  const list = Array.isArray(schedules) ? schedules : [];
  if (!timetableId) throw new Error("timetableId is required");

  // Get all existing schedules for this timetable
  const existingSchedules = await getSchedulesByTimetableId(timetableId);
  
  // Create a map of existing schedules by their full ID
  const existingById = new Map();
  existingSchedules.forEach((schedule) => {
    const id = safeId(
      `${timetableId}__${schedule.tableId}-${schedule.rowIndex}-${schedule.colIndex}-${schedule.batchIndex || 0}`
    );
    existingById.set(id, schedule);
  });
  
  // Create a map of cells that should have schedules (from new data)
  const cellsWithData = new Map();
  list.forEach((s) => {
    const cellKey = `${s.tableId}-${s.rowIndex}-${s.colIndex}`;
    if (!cellsWithData.has(cellKey)) {
      cellsWithData.set(cellKey, []);
    }
    cellsWithData.get(cellKey).push(s);
  });

  // Process updates and creates
  for (let i = 0; i < list.length; i += 400) {
    const batch = writeBatch(db);
    list.slice(i, i + 400).forEach((s) => {
      const id = safeId(
        `${timetableId}__${s.tableId}-${s.rowIndex}-${s.colIndex}-${s.batchIndex}`
      );
      
      batch.set(
        doc(schedulesCol, id),
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
          course: normalize(s.course),
          teacher: normalize(s.teacher),
          room: normalize(s.room),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
    });
    await batch.commit();
  }
  
  // Delete orphaned entries: entries that exist in DB but not in new data
  // This handles cases where:
  // - User completely empties a cell
  // - User reduces number of batches (e.g., from 3 batches to 1 batch)
  const newScheduleIds = new Set(
    list.map(s => safeId(
      `${timetableId}__${s.tableId}-${s.rowIndex}-${s.colIndex}-${s.batchIndex}`
    ))
  );
  
  const toDelete = [];
  existingById.forEach((schedule, id) => {
    if (!newScheduleIds.has(id)) {
      toDelete.push(id);
    }
  });
  
  // Delete orphaned entries in batches
  if (toDelete.length > 0) {
    for (let i = 0; i < toDelete.length; i += 450) {
      const batch = writeBatch(db);
      toDelete.slice(i, i + 450).forEach((id) => {
        batch.delete(doc(schedulesCol, id));
      });
      await batch.commit();
    }
  }
}

/**
 * Deletes a single schedule by ID
 */
export async function deleteScheduleById(scheduleId) {
  await deleteDoc(doc(schedulesCol, String(scheduleId)));
}
