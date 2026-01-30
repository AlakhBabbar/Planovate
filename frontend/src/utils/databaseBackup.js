/**
 * Database Backup Utility
 * Downloads all Firestore collections as separate JSON files
 * Excludes auto-generated fields except unique IDs
 */

import { 
  teacherService, 
  courseService, 
  roomService, 
  timetableService,
  scheduleService 
} from "../firebase/services";

/**
 * Fields to exclude from backup (auto-generated fields)
 */
const EXCLUDED_FIELDS = ['createdAt', 'updatedAt', 'timestamp'];

/**
 * Removes excluded fields from an object
 */
function cleanData(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  
  const cleaned = { ...obj };
  EXCLUDED_FIELDS.forEach(field => {
    delete cleaned[field];
  });
  
  return cleaned;
}

/**
 * Downloads data as JSON file
 */
function downloadJSON(data, filename) {
  const jsonString = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Fetches all data from a collection and cleans it
 */
async function fetchCollection(name, fetchFn) {
  try {
    console.log(`Fetching ${name}...`);
    const data = await fetchFn();
    const cleaned = data.map(item => cleanData(item));
    return { success: true, data: cleaned, count: cleaned.length };
  } catch (error) {
    console.error(`Error fetching ${name}:`, error);
    return { success: false, error: error.message, count: 0 };
  }
}

/**
 * Main function to backup entire database
 */
export async function backupCompleteDatabase() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
  const results = {
    timestamp: new Date().toISOString(),
    collections: {},
    summary: {}
  };

  try {
    // Fetch all collections
    const collections = [
      { name: 'teachers', fetchFn: () => teacherService.listTeachers() },
      { name: 'courses', fetchFn: () => courseService.listCourses() },
      { name: 'rooms', fetchFn: () => roomService.listRooms() },
      { name: 'timetables', fetchFn: () => timetableService.listTimetables() },
    ];

    // Fetch each collection
    for (const { name, fetchFn } of collections) {
      const result = await fetchCollection(name, fetchFn);
      
      if (result.success) {
        results.collections[name] = result.data;
        results.summary[name] = { count: result.count, status: 'success' };
        
        // Download individual JSON file for each collection
        downloadJSON(result.data, `${name}_${timestamp}.json`);
      } else {
        results.summary[name] = { count: 0, status: 'failed', error: result.error };
      }
      
      // Small delay between downloads
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    // Fetch schedules for each timetable
    if (results.collections.timetables && results.collections.timetables.length > 0) {
      console.log('Fetching schedules for all timetables...');
      const allSchedules = [];
      
      for (const timetable of results.collections.timetables) {
        try {
          const schedules = await scheduleService.getSchedulesByTimetableId(timetable.timetableId);
          const cleanedSchedules = schedules.map(item => cleanData(item));
          allSchedules.push(...cleanedSchedules);
        } catch (error) {
          console.error(`Error fetching schedules for timetable ${timetable.timetableId}:`, error);
        }
      }
      
      results.collections.schedules = allSchedules;
      results.summary.schedules = { count: allSchedules.length, status: 'success' };
      downloadJSON(allSchedules, `schedules_${timestamp}.json`);
      
      // Small delay
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    // Download complete backup summary
    downloadJSON(results, `backup_complete_${timestamp}.json`);

    return {
      success: true,
      summary: results.summary,
      timestamp: results.timestamp
    };
    
  } catch (error) {
    console.error('Error during backup:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Gets backup summary without downloading
 */
export async function getBackupSummary() {
  try {
    const [teachers, courses, rooms, timetables] = await Promise.all([
      teacherService.listTeachers(),
      courseService.listCourses(),
      roomService.listRooms(),
      timetableService.listTimetables(),
    ]);

    return {
      teachers: teachers.length,
      courses: courses.length,
      rooms: rooms.length,
      timetables: timetables.length,
      total: teachers.length + courses.length + rooms.length + timetables.length
    };
  } catch (error) {
    console.error('Error getting backup summary:', error);
    return null;
  }
}

/**
 * Reads and parses a JSON file
 */
async function readJSONFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        resolve(data);
      } catch (error) {
        reject(new Error(`Failed to parse ${file.name}: ${error.message}`));
      }
    };
    reader.onerror = () => reject(new Error(`Failed to read ${file.name}`));
    reader.readAsText(file);
  });
}

/**
 * Uploads data to a specific collection
 */
async function uploadCollection(name, data, upsertFn) {
  const results = {
    total: data.length,
    success: 0,
    failed: 0,
    errors: []
  };

  for (const item of data) {
    try {
      await upsertFn(item);
      results.success++;
    } catch (error) {
      results.failed++;
      results.errors.push({ item, error: error.message });
      console.error(`Error uploading ${name} item:`, error);
    }
  }

  return results;
}

/**
 * Main function to restore database from backup files
 */
export async function restoreFromBackup(files) {
  const results = {
    timestamp: new Date().toISOString(),
    collections: {},
    summary: {}
  };

  try {
    // Parse all files
    const fileData = {};
    for (const file of files) {
      try {
        const data = await readJSONFile(file);
        
        // Determine collection name from filename
        const fileName = file.name.toLowerCase();
        if (fileName.includes('teacher')) {
          fileData.teachers = Array.isArray(data) ? data : [];
        } else if (fileName.includes('course')) {
          fileData.courses = Array.isArray(data) ? data : [];
        } else if (fileName.includes('room')) {
          fileData.rooms = Array.isArray(data) ? data : [];
        } else if (fileName.includes('timetable')) {
          fileData.timetables = Array.isArray(data) ? data : [];
        } else if (fileName.includes('schedule')) {
          fileData.schedules = Array.isArray(data) ? data : [];
        } else if (fileName.includes('backup_complete')) {
          // Extract collections from complete backup file
          if (data.collections) {
            Object.assign(fileData, data.collections);
          }
        }
      } catch (error) {
        console.error(`Error reading file ${file.name}:`, error);
        results.summary[file.name] = { status: 'failed', error: error.message };
      }
    }

    // Upload teachers
    if (fileData.teachers && fileData.teachers.length > 0) {
      console.log(`Uploading ${fileData.teachers.length} teachers...`);
      const result = await uploadCollection('teachers', fileData.teachers, teacherService.upsertTeacher);
      results.summary.teachers = { 
        total: result.total, 
        success: result.success, 
        failed: result.failed,
        status: result.failed === 0 ? 'success' : 'partial'
      };
    }

    // Upload courses
    if (fileData.courses && fileData.courses.length > 0) {
      console.log(`Uploading ${fileData.courses.length} courses...`);
      const result = await uploadCollection('courses', fileData.courses, courseService.upsertCourse);
      results.summary.courses = { 
        total: result.total, 
        success: result.success, 
        failed: result.failed,
        status: result.failed === 0 ? 'success' : 'partial'
      };
    }

    // Upload rooms
    if (fileData.rooms && fileData.rooms.length > 0) {
      console.log(`Uploading ${fileData.rooms.length} rooms...`);
      const result = await uploadCollection('rooms', fileData.rooms, roomService.upsertRoom);
      results.summary.rooms = { 
        total: result.total, 
        success: result.success, 
        failed: result.failed,
        status: result.failed === 0 ? 'success' : 'partial'
      };
    }

    // Upload timetables (using saveTimetable with proper structure)
    if (fileData.timetables && fileData.timetables.length > 0) {
      console.log(`Uploading ${fileData.timetables.length} timetables...`);
      const timetableResults = {
        total: fileData.timetables.length,
        success: 0,
        failed: 0,
        errors: []
      };

      for (const timetable of fileData.timetables) {
        try {
          // Prepare timetable data structure for saveTimetable
          const timetableData = {
            meta: {
              class: timetable.class,
              branch: timetable.branch,
              semester: timetable.semester,
              type: timetable.type,
              faculty: timetable.faculty,
              department: timetable.department
            },
            tables: [],
            days: timetable.days || [],
            timeSlots: timetable.timeSlots || [],
            batchesByTable: {},
            batchDataByTable: {}
          };

          await timetableService.saveTimetable(timetableData);
          timetableResults.success++;
        } catch (error) {
          timetableResults.failed++;
          timetableResults.errors.push({ item: timetable, error: error.message });
          console.error('Error uploading timetable:', error);
        }
      }

      results.summary.timetables = { 
        total: timetableResults.total, 
        success: timetableResults.success, 
        failed: timetableResults.failed,
        status: timetableResults.failed === 0 ? 'success' : 'partial'
      };
    }

    // Upload schedules
    if (fileData.schedules && fileData.schedules.length > 0) {
      console.log(`Uploading ${fileData.schedules.length} schedules...`);
      
      // Group schedules by timetableId
      const schedulesByTimetable = {};
      fileData.schedules.forEach(schedule => {
        if (!schedulesByTimetable[schedule.timetableId]) {
          schedulesByTimetable[schedule.timetableId] = [];
        }
        schedulesByTimetable[schedule.timetableId].push(schedule);
      });

      const scheduleResults = {
        total: fileData.schedules.length,
        success: 0,
        failed: 0,
        errors: []
      };

      // Upload schedules for each timetable
      for (const [timetableId, schedules] of Object.entries(schedulesByTimetable)) {
        try {
          await scheduleService.saveSchedules({ timetableId, schedules });
          scheduleResults.success += schedules.length;
        } catch (error) {
          scheduleResults.failed += schedules.length;
          scheduleResults.errors.push({ timetableId, error: error.message });
          console.error(`Error uploading schedules for timetable ${timetableId}:`, error);
        }
      }

      results.summary.schedules = { 
        total: scheduleResults.total, 
        success: scheduleResults.success, 
        failed: scheduleResults.failed,
        status: scheduleResults.failed === 0 ? 'success' : 'partial'
      };
    }

    return {
      success: true,
      summary: results.summary,
      timestamp: results.timestamp
    };
    
  } catch (error) {
    console.error('Error during restore:', error);
    return {
      success: false,
      error: error.message
    };
  }
}
