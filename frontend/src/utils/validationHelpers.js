/**
 * Validation helpers for timetable data
 * Ensures courses, teachers, and rooms entered are valid and exist in database
 */

import { courseService, teacherService, roomService } from "../firebase/services";

// Cache for validation data
const validationCache = {
  courses: new Map(), // ID -> true
  teachers: new Map(), // ID -> true
  rooms: new Map(), // "ID Faculty" -> true
  lastFetch: {
    courses: 0,
    teachers: 0,
    rooms: 0
  }
};

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Fetch and cache all valid course IDs
 */
export async function fetchValidCourses() {
  const now = Date.now();
  if (now - validationCache.lastFetch.courses < CACHE_DURATION && validationCache.courses.size > 0) {
    return validationCache.courses;
  }
  
  const courses = await courseService.listCourses({});
  validationCache.courses.clear();
  
  courses.forEach(c => {
    if (c.ID) validationCache.courses.set(c.ID.trim(), true);
    if (c.code && c.code !== c.ID) validationCache.courses.set(c.code.trim(), true);
  });
  
  validationCache.lastFetch.courses = now;
  return validationCache.courses;
}

/**
 * Fetch and cache all valid teacher IDs
 */
export async function fetchValidTeachers() {
  const now = Date.now();
  if (now - validationCache.lastFetch.teachers < CACHE_DURATION && validationCache.teachers.size > 0) {
    return validationCache.teachers;
  }
  
  const teachers = await teacherService.listTeachers({});
  validationCache.teachers.clear();
  
  teachers.forEach(t => {
    if (t.ID) validationCache.teachers.set(t.ID.trim(), true);
  });
  
  validationCache.lastFetch.teachers = now;
  return validationCache.teachers;
}

/**
 * Fetch and cache all valid room IDs (format: "ID Faculty")
 */
export async function fetchValidRooms() {
  const now = Date.now();
  if (now - validationCache.lastFetch.rooms < CACHE_DURATION && validationCache.rooms.size > 0) {
    return validationCache.rooms;
  }
  
  const rooms = await roomService.listRooms({});
  validationCache.rooms.clear();
  
  rooms.forEach(r => {
    if (r.ID && r.faculty) {
      // Store in format "ID Faculty" (space-separated)
      validationCache.rooms.set(`${r.ID.trim()} ${r.faculty.trim()}`, true);
    }
    if (r.ID) {
      // Also store just the ID for partial matches
      validationCache.rooms.set(r.ID.trim(), true);
    }
  });
  
  validationCache.lastFetch.rooms = now;
  return validationCache.rooms;
}

/**
 * Validate if a course ID exists in the database
 */
export async function validateCourse(courseValue) {
  if (!courseValue || !courseValue.trim()) {
    return { isValid: true, error: null }; // Empty is valid (optional field)
  }
  
  const validCourses = await fetchValidCourses();
  const isValid = validCourses.has(courseValue.trim());
  
  return {
    isValid,
    error: isValid ? null : `Course "${courseValue}" not found in database`
  };
}

/**
 * Validate if a teacher ID exists in the database
 */
export async function validateTeacher(teacherValue) {
  if (!teacherValue || !teacherValue.trim()) {
    return { isValid: true, error: null }; // Empty is valid (optional field)
  }
  
  const validTeachers = await fetchValidTeachers();
  const isValid = validTeachers.has(teacherValue.trim());
  
  return {
    isValid,
    error: isValid ? null : `Teacher "${teacherValue}" not found in database`
  };
}

/**
 * Validate if a room ID exists in the database
 */
export async function validateRoom(roomValue) {
  if (!roomValue || !roomValue.trim()) {
    return { isValid: true, error: null }; // Empty is valid (optional field)
  }
  
  const validRooms = await fetchValidRooms();
  const roomStr = roomValue.trim();
  
  // Check exact match first
  if (validRooms.has(roomStr)) {
    return { isValid: true, error: null };
  }
  
  // Check if it's just the room ID without faculty
  const parts = roomStr.split(' ');
  if (parts.length === 1 && validRooms.has(parts[0])) {
    return { isValid: true, error: null };
  }
  
  return {
    isValid: false,
    error: `Room "${roomValue}" not found in database`
  };
}

/**
 * Validate all batch data in the timetable
 * Returns an object with validation errors for each cell
 */
export async function validateAllBatchData(batchData) {
  const errors = {};
  
  // Fetch all valid data at once
  await Promise.all([
    fetchValidCourses(),
    fetchValidTeachers(),
    fetchValidRooms()
  ]);
  
  // Validate each batch entry
  for (const [key, value] of Object.entries(batchData)) {
    const cellErrors = {};
    
    if (value.course) {
      const courseValidation = await validateCourse(value.course);
      if (!courseValidation.isValid) {
        cellErrors.course = courseValidation.error;
      }
    }
    
    if (value.teacher) {
      const teacherValidation = await validateTeacher(value.teacher);
      if (!teacherValidation.isValid) {
        cellErrors.teacher = teacherValidation.error;
      }
    }
    
    if (value.room) {
      const roomValidation = await validateRoom(value.room);
      if (!roomValidation.isValid) {
        cellErrors.room = roomValidation.error;
      }
    }
    
    // Only add to errors if there are any validation errors
    if (Object.keys(cellErrors).length > 0) {
      errors[key] = cellErrors;
    }
  }
  
  return errors;
}

/**
 * Check if there are any validation errors
 */
export function hasValidationErrors(validationErrors) {
  return Object.keys(validationErrors).length > 0;
}

/**
 * Get a summary of validation errors
 */
export function getValidationSummary(validationErrors) {
  const summary = {
    totalErrors: 0,
    courseErrors: 0,
    teacherErrors: 0,
    roomErrors: 0,
    errorMessages: []
  };
  
  for (const [key, errors] of Object.entries(validationErrors)) {
    if (errors.course) {
      summary.courseErrors++;
      summary.totalErrors++;
      summary.errorMessages.push(errors.course);
    }
    if (errors.teacher) {
      summary.teacherErrors++;
      summary.totalErrors++;
      summary.errorMessages.push(errors.teacher);
    }
    if (errors.room) {
      summary.roomErrors++;
      summary.totalErrors++;
      summary.errorMessages.push(errors.room);
    }
  }
  
  return summary;
}

/**
 * Clear validation cache (useful after updates)
 */
export function clearValidationCache() {
  validationCache.courses.clear();
  validationCache.teachers.clear();
  validationCache.rooms.clear();
  validationCache.lastFetch.courses = 0;
  validationCache.lastFetch.teachers = 0;
  validationCache.lastFetch.rooms = 0;
}
