/**
 * Room service — reads the "rooms" Firestore collection.
 */

import { collection, getDocs } from "firebase/firestore";
import { db } from "../config/firebase.js";

const roomsCol = collection(db, "rooms");

/**
 * Fetch all rooms (one-shot).
 */
export async function getAllRooms() {
  const snap = await getDocs(roomsCol);
  return snap.docs.map((d) => ({
    ...d.data(),
    unid: Number(d.id) || d.data().unid,
  }));
}
