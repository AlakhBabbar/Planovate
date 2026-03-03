/**
 * Firebase Firestore operations for admin settings
 */

import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";

import { db } from "../firebaseConfig";
import { normalize } from "../../utils/dataHelpers";

const settingsCol = collection(db, "settings");

/**
 * Get all programs (class names like B.Tech, M.Tech)
 */
export async function getPrograms() {
  const docRef = doc(settingsCol, "programs");
  const snap = await getDoc(docRef);
  
  if (!snap.exists()) {
    return [];
  }
  
  return snap.data().list || [];
}

/**
 * Save programs list
 */
export async function savePrograms(programs) {
  const docRef = doc(settingsCol, "programs");
  await setDoc(docRef, {
    list: programs,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Get all branches with their associated programs
 */
export async function getBranches() {
  const docRef = doc(settingsCol, "branches");
  const snap = await getDoc(docRef);
  
  if (!snap.exists()) {
    return [];
  }
  
  return snap.data().list || [];
}

/**
 * Save branches list
 * Each branch has: { name, programs: [] }
 */
export async function saveBranches(branches) {
  const docRef = doc(settingsCol, "branches");
  await setDoc(docRef, {
    list: branches,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Get all settings at once
 */
export async function getAllSettings() {
  const [programs, branches] = await Promise.all([
    getPrograms(),
    getBranches(),
  ]);
  
  return {
    programs,
    branches,
  };
}
