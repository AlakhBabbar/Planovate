import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  setDoc,
  where,
} from "firebase/firestore";

import { db } from "../firebaseConfig";

const roomsCol = collection(db, "rooms");

const normalize = (value) =>
  String(value ?? "")
    .trim()
    .replace(/\s+/g, " ");

export async function listRooms({ faculty } = {}) {
  const q = faculty ? query(roomsCol, where("faculty", "==", faculty)) : roomsCol;
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ ...d.data(), unid: Number(d.id) || d.data().unid }));
}

export async function upsertRoom(room) {
  const unid = room.unid ?? Date.now();
  const payload = {
    unid,
    ID: normalize(room.ID),
    name: normalize(room.name),
    capacity: typeof room.capacity === "number" ? room.capacity : Number(room.capacity) || 0,
    faculty: normalize(room.faculty),
    availability: room.availability ?? {
      day: {
        mon: { time: [] },
        tue: { time: [] },
        wed: { time: [] },
        thu: { time: [] },
        fri: { time: [] },
        sat: { time: [] },
      },
    },
  };

  await setDoc(doc(roomsCol, String(unid)), payload, { merge: true });
  return unid;
}

export async function deleteRoom(unid) {
  await deleteDoc(doc(roomsCol, String(unid)));
}

export async function listFaculties() {
  const snap = await getDocs(roomsCol);
  const set = new Set();
  snap.docs.forEach((d) => {
    const faculty = normalize(d.data().faculty);
    if (faculty) set.add(faculty);
  });
  return Array.from(set).sort((a, b) => a.localeCompare(b));
}
