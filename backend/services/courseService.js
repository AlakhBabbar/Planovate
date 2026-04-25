/**
 * Course service — reads the "courses" Firestore collection.
 */

import { collection, getDocs } from "firebase/firestore";
import { db } from "../config/firebase.js";

const coursesCol = collection(db, "courses");

/**
 * Fetch all courses (one-shot).
 * Returns array with unid attached.
 */
export async function getAllCourses() {
  const snap = await getDocs(coursesCol);
  return snap.docs.map((d) => ({
    ...d.data(),
    unid: Number(d.id) || d.data().unid,
  }));
}
