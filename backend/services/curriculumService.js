/**
 * Curriculum service — reads the "curriculums" Firestore collection.
 */

import { collection, getDocs, doc, getDoc } from "firebase/firestore";
import { db } from "../config/firebase.js";

const curriculumsCol = collection(db, "curriculums");

/**
 * Fetch all curriculums (one-shot).
 */
export async function getAllCurriculums() {
  const snap = await getDocs(curriculumsCol);
  return snap.docs.map((d) => d.data());
}

/**
 * Fetch a specific curriculum by its ID.
 */
export async function getCurriculumById(curriculumId) {
  const snap = await getDoc(doc(curriculumsCol, curriculumId));
  return snap.exists() ? snap.data() : null;
}

/**
 * Find curriculum matching a timetable's metadata.
 */
export function findCurriculumForMeta(curriculums, meta) {
  const norm = (v) => String(v ?? "").trim().toLowerCase();
  return curriculums.find(
    (c) =>
      norm(c.class) === norm(meta.class) &&
      norm(c.branch) === norm(meta.branch) &&
      norm(c.semester) === norm(meta.semester) &&
      norm(c.type) === norm(meta.type)
  ) || null;
}
