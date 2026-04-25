/**
 * Teacher service — reads the "teachers" Firestore collection.
 */

import { collection, getDocs } from "firebase/firestore";
import { db } from "../config/firebase.js";

const teachersCol = collection(db, "teachers");

/**
 * Fetch all teachers (one-shot).
 */
export async function getAllTeachers() {
  const snap = await getDocs(teachersCol);
  return snap.docs.map((d) => ({
    ...d.data(),
    unid: Number(d.id) || d.data().unid,
  }));
}
