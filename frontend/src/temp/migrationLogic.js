/**
 * Migration Logic: Convert schedules from storing names to storing unique IDs
 * 
 * Current Structure:
 * - Room: stored as "Room ID + Faculty" (e.g., "R101-Engineering")
 * - Course: stored as "Course ID" (e.g., "CS101")
 * - Teacher: stored as "Teacher ID" (e.g., "T001")
 * 
 * New Structure:
 * - Room: stored as unique document ID (unid)
 * - Course: stored as unique document ID (unid)
 * - Teacher: stored as unique document ID (unid)
 */

import { 
  collection, 
  getDocs, 
  writeBatch,
  doc
} from "firebase/firestore";
import { db } from "../firebase/firebaseConfig";

/**
 * Fetches all collections data
 */
export async function fetchCollections() {
  const teachersSnap = await getDocs(collection(db, "teachers"));
  const coursesSnap = await getDocs(collection(db, "courses"));
  const roomsSnap = await getDocs(collection(db, "rooms"));
  
  const teachers = teachersSnap.docs.map(d => ({ 
    unid: d.id, 
    ...d.data() 
  }));
  
  const courses = coursesSnap.docs.map(d => ({ 
    unid: d.id, 
    ...d.data() 
  }));
  
  const rooms = roomsSnap.docs.map(d => ({ 
    unid: d.id, 
    ...d.data() 
  }));
  
  return { teachers, courses, rooms };
}

/**
 * Fetches all schedules
 */
export async function fetchAllSchedules() {
  const schedulesSnap = await getDocs(collection(db, "schedules"));
  return schedulesSnap.docs.map(d => ({ 
    docId: d.id, 
    ...d.data() 
  }));
}

/**
 * Fetches all timetables
 */
export async function fetchAllTimetables() {
  const timetablesSnap = await getDocs(collection(db, "timetables"));
  return timetablesSnap.docs.map(d => ({ 
    id: d.id, 
    ...d.data() 
  }));
}

/**
 * Build lookup maps for matching
 */
export function buildLookupMaps(teachers, courses, rooms) {
  // Teacher lookup by ID
  const teacherByID = new Map();
  teachers.forEach(t => {
    if (t.ID) {
      teacherByID.set(t.ID.trim(), t.unid);
    }
  });
  
  // Course lookup by ID
  const courseByID = new Map();
  courses.forEach(c => {
    if (c.ID) {
      courseByID.set(c.ID.trim(), c.unid);
    }
  });
  
  // Room lookup by "ID Faculty" format (space-separated)
  const roomByIDFaculty = new Map();
  rooms.forEach(r => {
    if (r.ID && r.faculty) {
      // Store with space separator (e.g., "TCLT4 Technical")
      const keySpace = `${r.ID.trim()} ${r.faculty.trim()}`;
      roomByIDFaculty.set(keySpace, r.unid);
      
      // Also store with dash separator for compatibility
      const keyDash = `${r.ID.trim()}-${r.faculty.trim()}`;
      roomByIDFaculty.set(keyDash, r.unid);
    }
    // Also add just ID as fallback
    if (r.ID) {
      roomByIDFaculty.set(r.ID.trim(), r.unid);
    }
  });
  
  return { teacherByID, courseByID, roomByIDFaculty };
}

/**
 * Convert a single schedule entry from names to IDs
 */
export function convertScheduleEntry(schedule, lookupMaps) {
  const { teacherByID, courseByID, roomByIDFaculty } = lookupMaps;
  const updated = { ...schedule };
  let changes = [];
  
  // Convert teacher ID to unid
  if (schedule.teacher) {
    const teacherUnid = teacherByID.get(schedule.teacher.trim());
    if (teacherUnid) {
      updated.teacherId = teacherUnid;
      changes.push(`teacher: "${schedule.teacher}" → ID: ${teacherUnid}`);
    } else {
      changes.push(`teacher: "${schedule.teacher}" → NOT FOUND`);
    }
  }
  
  // Convert course ID to unid
  if (schedule.course) {
    const courseUnid = courseByID.get(schedule.course.trim());
    if (courseUnid) {
      updated.courseId = courseUnid;
      changes.push(`course: "${schedule.course}" → ID: ${courseUnid}`);
    } else {
      changes.push(`course: "${schedule.course}" → NOT FOUND`);
    }
  }
  
  // Convert room ID to unid
  // Room format is "RoomID Faculty" (e.g., "TCLT4 Technical")
  if (schedule.room) {
    const roomStr = schedule.room.trim();
    let roomUnid = roomByIDFaculty.get(roomStr);
    
    // If not found directly, try extracting ID and Faculty parts
    if (!roomUnid) {
      // Try space separator first (e.g., "TCLT4 Technical")
      const spaceParts = roomStr.split(' ');
      if (spaceParts.length >= 2) {
        const roomId = spaceParts[0].trim();
        const faculty = spaceParts.slice(1).join(' ').trim();
        const lookupKey = `${roomId} ${faculty}`;
        roomUnid = roomByIDFaculty.get(lookupKey);
      }
      
      // If still not found, try dash separator
      if (!roomUnid && roomStr.includes('-')) {
        roomUnid = roomByIDFaculty.get(roomStr);
      }
      
      // Last resort: try just the room ID part
      if (!roomUnid && spaceParts.length >= 1) {
        roomUnid = roomByIDFaculty.get(spaceParts[0].trim());
      }
    }
    
    if (roomUnid) {
      updated.roomId = roomUnid;
      changes.push(`room: "${schedule.room}" → ID: ${roomUnid}`);
    } else {
      changes.push(`room: "${schedule.room}" → NOT FOUND`);
    }
  }
  
  return { updated, changes };
}

/**
 * Analyze what will be migrated for a specific timetable (dry run)
 */
export async function analyzeTimetableMigration(timetableId) {
  const allSchedules = await fetchAllSchedules();
  const schedules = allSchedules.filter(s => s.timetableId === timetableId);
  const { teachers, courses, rooms } = await fetchCollections();
  const lookupMaps = buildLookupMaps(teachers, courses, rooms);
  
  const analysis = {
    timetableId,
    totalSchedules: schedules.length,
    teacherMappings: 0,
    courseMappings: 0,
    roomMappings: 0,
    teacherNotFound: 0,
    courseNotFound: 0,
    roomNotFound: 0,
    examples: []
  };
  
  schedules.forEach((schedule, idx) => {
    const { updated, changes } = convertScheduleEntry(schedule, lookupMaps);
    
    if (updated.teacherId) analysis.teacherMappings++;
    else if (schedule.teacher) analysis.teacherNotFound++;
    
    if (updated.courseId) analysis.courseMappings++;
    else if (schedule.course) analysis.courseNotFound++;
    
    if (updated.roomId) analysis.roomMappings++;
    else if (schedule.room) analysis.roomNotFound++;
    
    // Add first 5 examples
    if (idx < 5 && changes.length > 0) {
      analysis.examples.push({
        docId: schedule.docId,
        changes
      });
    }
  });
  
  return analysis;
}

/**
 * Analyze what will be migrated (dry run) - all timetables
 */
export async function analyzeMigration() {
  const schedules = await fetchAllSchedules();
  const { teachers, courses, rooms } = await fetchCollections();
  const lookupMaps = buildLookupMaps(teachers, courses, rooms);
  
  const analysis = {
    totalSchedules: schedules.length,
    teacherMappings: 0,
    courseMappings: 0,
    roomMappings: 0,
    teacherNotFound: 0,
    courseNotFound: 0,
    roomNotFound: 0,
    examples: []
  };
  
  schedules.forEach((schedule, idx) => {
    const { updated, changes } = convertScheduleEntry(schedule, lookupMaps);
    
    if (updated.teacherId) analysis.teacherMappings++;
    else if (schedule.teacher) analysis.teacherNotFound++;
    
    if (updated.courseId) analysis.courseMappings++;
    else if (schedule.course) analysis.courseNotFound++;
    
    if (updated.roomId) analysis.roomMappings++;
    else if (schedule.room) analysis.roomNotFound++;
    
    // Add first 5 examples
    if (idx < 5 && changes.length > 0) {
      analysis.examples.push({
        docId: schedule.docId,
        changes
      });
    }
  });
  
  return analysis;
}

/**
 * Perform migration for a specific timetable
 */
export async function performTimetableMigration(timetableId, onProgress) {
  const allSchedules = await fetchAllSchedules();
  const schedules = allSchedules.filter(s => s.timetableId === timetableId);
  const { teachers, courses, rooms } = await fetchCollections();
  const lookupMaps = buildLookupMaps(teachers, courses, rooms);
  
  const schedulesCol = collection(db, "schedules");
  let processed = 0;
  let updated = 0;
  const errors = [];
  
  // Process in batches of 450 (Firestore limit is 500)
  const batchSize = 450;
  for (let i = 0; i < schedules.length; i += batchSize) {
    const batch = writeBatch(db);
    const batchSchedules = schedules.slice(i, i + batchSize);
    
    batchSchedules.forEach(schedule => {
      try {
        const { updated: convertedSchedule } = convertScheduleEntry(schedule, lookupMaps);
        
        // Only update if we have at least one ID mapping
        if (convertedSchedule.teacherId || convertedSchedule.courseId || convertedSchedule.roomId) {
          const docRef = doc(schedulesCol, schedule.docId);
          
          // Add the new ID fields
          const updateData = {};
          if (convertedSchedule.teacherId) updateData.teacherId = String(convertedSchedule.teacherId);
          if (convertedSchedule.courseId) updateData.courseId = String(convertedSchedule.courseId);
          if (convertedSchedule.roomId) updateData.roomId = String(convertedSchedule.roomId);
          
          batch.update(docRef, updateData);
          updated++;
        }
        
        processed++;
      } catch (error) {
        errors.push({
          docId: schedule.docId,
          error: error.message
        });
      }
    });
    
    await batch.commit();
    
    if (onProgress) {
      onProgress({
        processed,
        total: schedules.length,
        updated,
        errors: errors.length
      });
    }
  }
  
  return {
    timetableId,
    total: schedules.length,
    processed,
    updated,
    errors
  };
}

/**
 * Verify migration for a specific timetable
 */
export async function verifyTimetableMigration(timetableId) {
  const allSchedules = await fetchAllSchedules();
  const schedules = allSchedules.filter(s => s.timetableId === timetableId);
  
  const stats = {
    timetableId,
    total: schedules.length,
    withTeacherId: 0,
    withCourseId: 0,
    withRoomId: 0,
    withOldFormat: 0,
    samples: []
  };
  
  schedules.forEach((schedule, idx) => {
    if (schedule.teacherId) stats.withTeacherId++;
    if (schedule.courseId) stats.withCourseId++;
    if (schedule.roomId) stats.withRoomId++;
    if (schedule.teacher && !schedule.teacherId) stats.withOldFormat++;
    
    // Collect first 10 samples
    if (idx < 10) {
      stats.samples.push({
        docId: schedule.docId,
        teacher: schedule.teacher,
        teacherId: schedule.teacherId,
        course: schedule.course,
        courseId: schedule.courseId,
        room: schedule.room,
        roomId: schedule.roomId
      });
    }
  });
  
  return stats;
}

/**
 * Verify migration by checking a sample of schedules
 */
export async function verifyMigration() {
  const schedules = await fetchAllSchedules();
  
  const stats = {
    total: schedules.length,
    withTeacherId: 0,
    withCourseId: 0,
    withRoomId: 0,
    withOldFormat: 0,
    samples: []
  };
  
  schedules.forEach((schedule, idx) => {
    if (schedule.teacherId) stats.withTeacherId++;
    if (schedule.courseId) stats.withCourseId++;
    if (schedule.roomId) stats.withRoomId++;
    if (schedule.teacher && !schedule.teacherId) stats.withOldFormat++;
    
    // Collect first 10 samples
    if (idx < 10) {
      stats.samples.push({
        docId: schedule.docId,
        teacher: schedule.teacher,
        teacherId: schedule.teacherId,
        course: schedule.course,
        courseId: schedule.courseId,
        room: schedule.room,
        roomId: schedule.roomId
      });
    }
  });
  
  return stats;
}

/**
 * Get migration status for each timetable
 */
export async function getTimetableMigrationStatus() {
  const timetables = await fetchAllTimetables();
  const allSchedules = await fetchAllSchedules();
  
  const statusList = timetables.map(tt => {
    const schedules = allSchedules.filter(s => s.timetableId === tt.timetableId);
    const totalSchedules = schedules.length;
    const migratedSchedules = schedules.filter(s => 
      s.teacherId || s.courseId || s.roomId
    ).length;
    
    return {
      timetableId: tt.timetableId,
      class: tt.class,
      branch: tt.branch,
      semester: tt.semester,
      type: tt.type,
      totalSchedules,
      migratedSchedules,
      isMigrated: migratedSchedules > 0,
      migrationProgress: totalSchedules > 0 ? (migratedSchedules / totalSchedules) * 100 : 0
    };
  });
  
  return statusList;
}

/**
 * Perform the actual migration for all timetables
 */
export async function performMigration(onProgress) {
  const schedules = await fetchAllSchedules();
  const { teachers, courses, rooms } = await fetchCollections();
  const lookupMaps = buildLookupMaps(teachers, courses, rooms);
  
  const schedulesCol = collection(db, "schedules");
  let processed = 0;
  let updated = 0;
  const errors = [];
  
  // Process in batches of 450 (Firestore limit is 500)
  const batchSize = 450;
  for (let i = 0; i < schedules.length; i += batchSize) {
    const batch = writeBatch(db);
    const batchSchedules = schedules.slice(i, i + batchSize);
    
    batchSchedules.forEach(schedule => {
      try {
        const { updated: convertedSchedule } = convertScheduleEntry(schedule, lookupMaps);
        
        // Only update if we have at least one ID mapping
        if (convertedSchedule.teacherId || convertedSchedule.courseId || convertedSchedule.roomId) {
          const docRef = doc(schedulesCol, schedule.docId);
          
          // Add the new ID fields
          const updateData = {};
          if (convertedSchedule.teacherId) updateData.teacherId = String(convertedSchedule.teacherId);
          if (convertedSchedule.courseId) updateData.courseId = String(convertedSchedule.courseId);
          if (convertedSchedule.roomId) updateData.roomId = String(convertedSchedule.roomId);
          
          batch.update(docRef, updateData);
          updated++;
        }
        
        processed++;
      } catch (error) {
        errors.push({
          docId: schedule.docId,
          error: error.message
        });
      }
    });
    
    await batch.commit();
    
    if (onProgress) {
      onProgress({
        processed,
        total: schedules.length,
        updated,
        errors: errors.length
      });
    }
  }
  
  return {
    total: schedules.length,
    processed,
    updated,
    errors
  };
}
