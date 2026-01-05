/**
 * Firebase Firestore operations for timetables
 * This file contains ONLY database read/write operations
 * Business logic is in utils/timetableHelpers.js
 */

import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  where,
} from "firebase/firestore";

import { db } from "../firebaseConfig";
import { normalize, DEFAULT_DAYS } from "../../utils/dataHelpers";
import {
  generateTimetableId,
  prepareTimetablePayload,
  buildScheduleOccurrences,
  reconstructTimetableFromSchedules,
} from "../../utils/timetableHelpers";
import {
  deleteSchedulesByTimetableId,
  getSchedulesByTimetableId,
  saveSchedules,
} from "./schedules";

const timetablesCol = collection(db, "timetables");

/**
 * Fetches all timetables with optional filters
 */
export async function listTimetables({ faculty, department, semester } = {}) {
  let q = query(timetablesCol, orderBy("updatedAt", "desc"), limit(50));

  const whereClauses = [];
  if (faculty) whereClauses.push(where("faculty", "==", normalize(faculty)));
  if (department) whereClauses.push(where("department", "==", normalize(department)));
  if (semester) whereClauses.push(where("semester", "==", normalize(semester)));

  if (whereClauses.length) {
    q = query(timetablesCol, ...whereClauses, orderBy("updatedAt", "desc"), limit(50));
  }

  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data());
}

/**
 * Saves a complete timetable with schedules
 */
export async function saveTimetable({
  meta,
  tables,
  days,
  timeSlots,
  batchesByTable,
  batchDataByTable,
}) {
  // Use utility function to generate ID
  const timetableId = generateTimetableId(meta);

  // Use utility function to prepare payload (table names not stored)
  const payload = prepareTimetablePayload(meta, days, timeSlots);

  // Save timetable document
  const timetableRef = doc(timetablesCol, String(timetableId));
  await setDoc(
    timetableRef,
    {
      ...payload,
      updatedAt: serverTimestamp(),
      createdAt: serverTimestamp(),
    },
    { merge: true }
  );

  // NOTE: We no longer delete all schedules first
  // Instead, saveSchedules will intelligently handle updates and new entries
  // This prevents orphaned entries when migrating from no-batch to multi-batch cells

  // Use utility function to build schedule occurrences
  // Tables are derived from batchesByTable keys
  console.log('🔍 Building schedules with:', {
    timetableId,
    tables: Object.keys(batchesByTable || {}),
    batchesByTable,
    batchDataByTable,
    daysCount: payload.days?.length,
    timeSlotsCount: payload.timeSlots?.length
  });
  
  const schedules = buildScheduleOccurrences({
    timetableId,
    meta: payload,
    tables: Object.keys(batchesByTable || {}),
    days: payload.days,
    timeSlots: payload.timeSlots,
    batchesByTable,
    batchDataByTable,
  });

  console.log('📋 Built schedules:', schedules.length, 'occurrences');
  console.log('📋 Sample schedule:', schedules[0]);

  // Save new schedules (intelligently updates existing entries)
  await saveSchedules({ timetableId, schedules });

  return timetableId;
}

/**
 * Loads a complete timetable with schedules
 */
export async function loadTimetable(timetableId) {
  const timetableRef = doc(timetablesCol, String(timetableId));
  const metaSnap = await getDoc(timetableRef);
  
  if (!metaSnap.exists()) return null;

  const meta = metaSnap.data();
  const schedules = await getSchedulesByTimetableId(timetableId);

  // Use utility function to reconstruct timetable data
  const { batchesByTable, batchDataByTable } = reconstructTimetableFromSchedules(schedules);

  // Derive table list from schedules instead of storing in meta
  const tableIds = Object.keys(batchesByTable);
  const tables = tableIds.length > 0 ? tableIds : ["Table 1"];

  return {
    meta,
    tables,
    days: meta.days ?? DEFAULT_DAYS,
    timeSlots: meta.timeSlots ?? [],
    batchesByTable,
    batchDataByTable,
  };
}

/**
 * Deletes a timetable and all its schedules
 */
export async function deleteTimetable(timetableId) {
  await deleteSchedulesByTimetableId(timetableId);
  await deleteDoc(doc(timetablesCol, String(timetableId)));
}
