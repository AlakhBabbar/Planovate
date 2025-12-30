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

const teachersCol = collection(db, "teachers");

const normalize = (value) =>
  String(value ?? "")
    .trim()
    .replace(/\s+/g, " ");

export async function listTeachers({ faculty, department } = {}) {
  const constraints = [];
  if (faculty) constraints.push(where("faculty", "==", faculty));
  if (department) constraints.push(where("department", "==", department));

  const q = constraints.length ? query(teachersCol, ...constraints) : teachersCol;
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ ...d.data(), unid: Number(d.id) || d.data().unid }));
}

export async function upsertTeacher(teacher) {
  const unid = teacher.unid ?? Date.now();
  const payload = {
    unid,
    ID: normalize(teacher.ID),
    name: normalize(teacher.name),
    faculty: normalize(teacher.faculty),
    department: normalize(teacher.department),
  };

  await setDoc(doc(teachersCol, String(unid)), payload, { merge: true });
  return unid;
}

export async function deleteTeacher(unid) {
  await deleteDoc(doc(teachersCol, String(unid)));
}

export async function listFaculties() {
  const snap = await getDocs(teachersCol);
  const set = new Set();
  snap.docs.forEach((d) => {
    const faculty = normalize(d.data().faculty);
    if (faculty) set.add(faculty);
  });
  return Array.from(set).sort((a, b) => a.localeCompare(b));
}

export async function listDepartments(faculty) {
  if (!faculty) return [];
  const snap = await getDocs(query(teachersCol, where("faculty", "==", faculty)));
  const set = new Set();
  snap.docs.forEach((d) => {
    const department = normalize(d.data().department);
    if (department) set.add(department);
  });
  return Array.from(set).sort((a, b) => a.localeCompare(b));
}
