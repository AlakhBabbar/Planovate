/**
 * Schedule service — queries the "schedules" Firestore collection.
 * Provides both one-shot fetches and live onSnapshot listeners.
 */

import {
  collection,
  query,
  where,
  getDocs,
  onSnapshot,
} from "firebase/firestore";
import { db } from "../config/firebase.js";

const schedulesCol = collection(db, "schedules");

/**
 * Fetch all schedules for a specific timetable (one-shot).
 */
export async function getSchedulesByTimetableId(timetableId) {
  if (!timetableId) return [];
  const snap = await getDocs(
    query(schedulesCol, where("timetableId", "==", String(timetableId)))
  );
  return snap.docs.map((d) => ({ _docId: d.id, ...d.data() }));
}

/**
 * Fetch ALL schedules across every timetable (one-shot).
 */
export async function getAllSchedules() {
  const snap = await getDocs(schedulesCol);
  return snap.docs.map((d) => ({ _docId: d.id, ...d.data() }));
}

/**
 * Live listener for schedules of ONE timetable.
 * Returns an unsubscribe function.
 *
 * @param {string} timetableId
 * @param {(schedules: Array) => void} onData  - called on every change
 * @param {(err: Error) => void} onError
 * @returns {() => void} unsubscribe
 */
export function watchSchedulesByTimetableId(timetableId, onData, onError) {
  const q = query(
    schedulesCol,
    where("timetableId", "==", String(timetableId))
  );
  return onSnapshot(
    q,
    (snap) => {
      const schedules = snap.docs.map((d) => ({ _docId: d.id, ...d.data() }));
      onData(schedules);
    },
    (err) => {
      console.error(`[scheduleService] snapshot error for ${timetableId}:`, err);
      if (onError) onError(err);
    }
  );
}

/**
 * Live listener for ALL schedules EXCEPT a given timetableId.
 * Since Firestore client SDK doesn't support "!=" with onSnapshot efficiently,
 * we listen to the entire collection and filter in memory.
 *
 * Returns an unsubscribe function.
 */
export function watchAllOtherSchedules(excludeTimetableId, onData, onError) {
  return onSnapshot(
    schedulesCol,
    (snap) => {
      const schedules = snap.docs
        .map((d) => ({ _docId: d.id, ...d.data() }))
        .filter((s) => s.timetableId !== excludeTimetableId);
      onData(schedules);
    },
    (err) => {
      console.error("[scheduleService] snapshot error (all others):", err);
      if (onError) onError(err);
    }
  );
}
