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

const coursesCol = collection(db, "courses");

const normalize = (value) =>
  String(value ?? "")
    .trim()
    .replace(/\s+/g, " ");

export async function listCourses({ faculty, department, semester } = {}) {
  const constraints = [];
  if (faculty) constraints.push(where("faculty", "==", faculty));
  if (department) constraints.push(where("department", "==", department));
  if (semester) constraints.push(where("semester", "==", semester));

  const q = constraints.length ? query(coursesCol, ...constraints) : coursesCol;
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ ...d.data(), unid: Number(d.id) || d.data().unid }));
}

export async function upsertCourse(course) {
  const unid = course.unid ?? Date.now();
  const payload = {
    unid,
    ID: normalize(course.ID),
    name: normalize(course.name),
    code: normalize(course.code),
    credits: normalize(course.credits),
    teachers: Array.isArray(course.teachers) ? course.teachers : [],
    faculty: normalize(course.faculty),
    department: normalize(course.department),
    semester: normalize(course.semester),
  };

  await setDoc(doc(coursesCol, String(unid)), payload, { merge: true });
  return unid;
}

export async function deleteCourse(unid) {
  await deleteDoc(doc(coursesCol, String(unid)));
}

export async function listSemesters({ faculty, department } = {}) {
  if (!faculty || !department) return [];
  const snap = await getDocs(
    query(
      coursesCol,
      where("faculty", "==", faculty),
      where("department", "==", department)
    )
  );
  const set = new Set();
  snap.docs.forEach((d) => {
    const semester = normalize(d.data().semester);
    if (semester) set.add(semester);
  });
  return Array.from(set).sort((a, b) => a.localeCompare(b));
}
