/**
 * Firebase Firestore operations for curriculums
 */

import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  where,
} from "firebase/firestore";

import { db } from "../firebaseConfig";
import { normalize } from "../../utils/dataHelpers";

const curriculumsCol = collection(db, "curriculums");

/**
 * Generate curriculum ID from class, branch, semester, and type
 */
export function generateCurriculumId({ className, branch, semester, type }) {
  return normalize(`${className}_${branch}_${semester}_${type}`);
}

/**
 * Save a curriculum document
 */
export async function saveCurriculum(curriculumData) {
  const { className, branch, semester, type, courses } = curriculumData;
  
  if (!className || !branch || !semester || !type) {
    throw new Error("Missing required fields: className, branch, semester, type");
  }

  const curriculumId = generateCurriculumId({ className, branch, semester, type });

  const payload = {
    curriculumId,
    class: normalize(className),
    branch: normalize(branch),
    semester: normalize(semester),
    type: normalize(type),
    courses: courses || [],
    updatedAt: serverTimestamp(),
    createdAt: serverTimestamp(),
  };

  const curriculumRef = doc(curriculumsCol, curriculumId);
  await setDoc(curriculumRef, payload, { merge: true });

  return curriculumId;
}

/**
 * Fetch a single curriculum by ID
 */
export async function getCurriculum(curriculumId) {
  const curriculumRef = doc(curriculumsCol, curriculumId);
  const snap = await getDoc(curriculumRef);
  
  if (!snap.exists()) return null;
  
  return snap.data();
}

/**
 * Fetch all curriculums
 */
export async function listCurriculums() {
  const snap = await getDocs(curriculumsCol);
  return snap.docs.map((d) => d.data());
}

/**
 * Delete a curriculum
 */
export async function deleteCurriculum(curriculumId) {
  await deleteDoc(doc(curriculumsCol, curriculumId));
}

/**
 * Extract curriculum data from timetable schedules
 * Returns a map of classes with their courses and teachers
 */
export function extractCurriculumFromSchedules(schedules) {
  // Group by class + branch + semester to handle multiple semesters
  const classesMap = new Map();

  console.log("Extracting from schedules:", schedules.length);

  schedules.forEach((schedule) => {
    const { courseId, teacherId, class: className, branch, type, semester } = schedule;
    
    // Skip empty cells
    if (!courseId) return;

    // Create unique class key including semester AND type
    const classType = type || "Full Time";
    const classSemester = semester || '1';
    const classKey = `${className}_${branch}_${classSemester}_${classType}`;
    
    if (!classesMap.has(classKey)) {
      console.log("Creating new class entry:", classKey);
      classesMap.set(classKey, {
        className,
        branch,
        semester: classSemester,
        type: classType,
        coursesMap: new Map(), // courseId -> Set of teacherIds
      });
    }

    const classData = classesMap.get(classKey);
    
    // Add course-teacher mapping
    if (!classData.coursesMap.has(courseId)) {
      classData.coursesMap.set(courseId, new Set());
    }
    
    if (teacherId) {
      classData.coursesMap.get(courseId).add(teacherId);
    }
  });

  // Convert Map structure to array format
  const classes = [];
  classesMap.forEach((classData, classKey) => {
    const courses = [];
    classData.coursesMap.forEach((teacherIds, courseId) => {
      courses.push({
        courseId,
        teacherIds: Array.from(teacherIds),
      });
    });

    classes.push({
      classKey,
      className: classData.className,
      branch: classData.branch,
      semester: classData.semester,
      type: classData.type,
      courses,
    });
  });

  return classes;
}
