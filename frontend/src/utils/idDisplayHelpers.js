/**
 * Helper functions to fetch display names from IDs
 * Used for displaying timetable data after migration
 */

import { courseService, teacherService, roomService } from "../firebase/services";

// Cache to avoid repeated fetches
const cache = {
  teachers: new Map(),
  courses: new Map(),
  rooms: new Map(),
  lastFetch: {
    teachers: 0,
    courses: 0,
    rooms: 0
  }
};

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Fetch all teachers and cache them
 */
export async function fetchTeachersCache() {
  const now = Date.now();
  if (now - cache.lastFetch.teachers < CACHE_DURATION && cache.teachers.size > 0) {
    return cache.teachers;
  }
  
  const teachers = await teacherService.listTeachers({});
  cache.teachers.clear();
  teachers.forEach(t => {
    cache.teachers.set(String(t.unid), t);
  });
  cache.lastFetch.teachers = now;
  
  return cache.teachers;
}

/**
 * Fetch all courses and cache them
 */
export async function fetchCoursesCache() {
  const now = Date.now();
  if (now - cache.lastFetch.courses < CACHE_DURATION && cache.courses.size > 0) {
    return cache.courses;
  }
  
  const courses = await courseService.listCourses({});
  cache.courses.clear();
  courses.forEach(c => {
    cache.courses.set(String(c.unid), c);
  });
  cache.lastFetch.courses = now;
  
  return cache.courses;
}

/**
 * Fetch all rooms and cache them
 */
export async function fetchRoomsCache() {
  const now = Date.now();
  if (now - cache.lastFetch.rooms < CACHE_DURATION && cache.rooms.size > 0) {
    return cache.rooms;
  }
  
  const rooms = await roomService.listRooms({});
  cache.rooms.clear();
  rooms.forEach(r => {
    cache.rooms.set(String(r.unid), r);
  });
  cache.lastFetch.rooms = now;
  
  return cache.rooms;
}

/**
 * Get teacher display name by ID
 * Returns teacher ID if name not found
 */
export async function getTeacherDisplayName(teacherId) {
  if (!teacherId) return "";
  
  const teachers = await fetchTeachersCache();
  const teacher = teachers.get(String(teacherId));
  
  if (teacher) {
    return teacher.ID || teacher.name || teacherId;
  }
  
  return teacherId;
}

/**
 * Get teacher ID from display name
 * Returns null if not found
 */
export async function getTeacherIdFromDisplay(displayName) {
  if (!displayName) return null;
  
  const teachers = await fetchTeachersCache();
  const trimmedName = displayName.trim();
  
  for (const [id, teacher] of teachers) {
    if (teacher.ID && teacher.ID.trim() === trimmedName) {
      return id;
    }
  }
  
  return null;
}

/**
 * Get course display name by ID
 * Returns course ID if not found
 */
export async function getCourseDisplayName(courseId) {
  if (!courseId) return "";
  
  const courses = await fetchCoursesCache();
  const course = courses.get(String(courseId));
  
  if (course) {
    return course.ID || course.code || courseId;
  }
  
  return courseId;
}

/**
 * Get course ID from display name
 * Returns null if not found
 */
export async function getCourseIdFromDisplay(displayName) {
  if (!displayName) return null;
  
  const courses = await fetchCoursesCache();
  const trimmedName = displayName.trim();
  
  for (const [id, course] of courses) {
    if ((course.ID && course.ID.trim() === trimmedName) || 
        (course.code && course.code.trim() === trimmedName)) {
      return id;
    }
  }
  
  return null;
}

/**
 * Get room display name by ID
 * Returns room ID if not found
 */
export async function getRoomDisplayName(roomId) {
  if (!roomId) return "";
  
  const rooms = await fetchRoomsCache();
  const room = rooms.get(String(roomId));
  
  if (room) {
    // Return in format: RoomID Faculty (space-separated, as stored in schedules)
    const roomDisplay = room.ID || roomId;
    const faculty = room.faculty || "";
    return faculty ? `${roomDisplay} ${faculty}` : roomDisplay;
  }
  
  return roomId;
}

/**
 * Get room ID from display name
 * Returns null if not found
 */
export async function getRoomIdFromDisplay(displayName) {
  if (!displayName) return null;
  
  const rooms = await fetchRoomsCache();
  const roomStr = displayName.trim();
  
  for (const [id, room] of rooms) {
    // Check for exact match with "ID Faculty" format
    if (room.ID && room.faculty) {
      const fullDisplay = `${room.ID.trim()} ${room.faculty.trim()}`;
      if (fullDisplay === roomStr) {
        return id;
      }
    }
    // Check for match with just the ID
    if (room.ID && room.ID.trim() === roomStr) {
      return id;
    }
  }
  
  return null;
}

/**
 * Resolve batch data from IDs to names for display
 */
export async function resolveBatchDataForDisplay(batchData) {
  const resolved = {};
  
  // Fetch all caches at once
  await Promise.all([
    fetchTeachersCache(),
    fetchCoursesCache(),
    fetchRoomsCache()
  ]);
  
  // Resolve each batch entry
  for (const [key, value] of Object.entries(batchData)) {
    resolved[key] = { ...value };
    
    // If we have IDs, use them; otherwise fall back to the old format
    if (value.teacherId) {
      resolved[key].teacher = await getTeacherDisplayName(value.teacherId);
    }
    if (value.courseId) {
      resolved[key].course = await getCourseDisplayName(value.courseId);
    }
    if (value.roomId) {
      resolved[key].room = await getRoomDisplayName(value.roomId);
    }
  }
  
  return resolved;
}

/**
 * Convert display values back to IDs for saving
 * Returns ONLY IDs (courseId, teacherId, roomId), not display names
 * Display names will be removed from the returned object
 */
export async function convertDisplayToIds(batchData) {
  const converted = {};
  
  // Fetch all caches
  const teachers = await fetchTeachersCache();
  const courses = await fetchCoursesCache();
  const rooms = await fetchRoomsCache();
  
  // Build reverse lookup maps (name -> id)
  const teacherByID = new Map();
  teachers.forEach((t, id) => {
    if (t.ID) teacherByID.set(t.ID.trim(), id);
  });
  
  const courseByID = new Map();
  courses.forEach((c, id) => {
    if (c.ID) courseByID.set(c.ID.trim(), id);
    if (c.code) courseByID.set(c.code.trim(), id);
  });
  
  const roomByDisplay = new Map();
  rooms.forEach((r, id) => {
    if (r.ID && r.faculty) {
      // Room format is "RoomID Faculty" (space-separated)
      const displaySpace = `${r.ID.trim()} ${r.faculty.trim()}`;
      roomByDisplay.set(displaySpace, id);
      
      // Also support dash format for compatibility
      const displayDash = `${r.ID.trim()}-${r.faculty.trim()}`;
      roomByDisplay.set(displayDash, id);
    }
    if (r.ID) {
      roomByDisplay.set(r.ID.trim(), id);
    }
  });
  
  // Convert each batch entry
  for (const [key, value] of Object.entries(batchData)) {
    // Start with only batchName - NO display names
    converted[key] = {
      batchName: value.batchName || ""
    };
    
    // If IDs already exist, use them
    if (value.courseId) {
      converted[key].courseId = String(value.courseId);
    } else if (value.course) {
      // Convert display name to ID
      const courseId = courseByID.get(value.course.trim());
      if (courseId) {
        converted[key].courseId = courseId;
      }
    }
    
    if (value.teacherId) {
      converted[key].teacherId = String(value.teacherId);
    } else if (value.teacher) {
      // Convert display name to ID
      const teacherId = teacherByID.get(value.teacher.trim());
      if (teacherId) {
        converted[key].teacherId = teacherId;
      }
    }
    
    if (value.roomId) {
      converted[key].roomId = String(value.roomId);
    } else if (value.room) {
      // Convert display name to ID
      const roomStr = value.room.trim();
      let roomId = roomByDisplay.get(roomStr);
      
      // If not found, try extracting parts
      if (!roomId) {
        const spaceParts = roomStr.split(' ');
        if (spaceParts.length >= 2) {
          const lookupKey = `${spaceParts[0].trim()} ${spaceParts.slice(1).join(' ').trim()}`;
          roomId = roomByDisplay.get(lookupKey);
        }
        
        // Try just the ID part
        if (!roomId && spaceParts.length >= 1) {
          roomId = roomByDisplay.get(spaceParts[0].trim());
        }
      }
      
      if (roomId) {
        converted[key].roomId = roomId;
      }
    }
  }
  
  return converted;
}

/**
 * Clear cache (useful after updates)
 */
export function clearCache() {
  cache.teachers.clear();
  cache.courses.clear();
  cache.rooms.clear();
  cache.lastFetch.teachers = 0;
  cache.lastFetch.courses = 0;
  cache.lastFetch.rooms = 0;
}
