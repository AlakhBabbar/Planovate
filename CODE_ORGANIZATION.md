# Code Organization Guide

## Overview
This codebase follows a clear separation of concerns:
- **Firebase Services**: Only handle database operations (read/write to Firestore)
- **Utils**: Contain all business logic, calculations, and data transformations
- **Pages/Components**: Handle UI and user interactions, orchestrate services and utils

## Directory Structure

### `/firebase/services/`
Contains ONLY Firestore CRUD operations. No business logic allowed.

#### Files:
- **timetables.js**: Database operations for timetable documents
  - `listTimetables()` - Fetch all timetables with filters
  - `saveTimetable()` - Save timetable (orchestrates utils and DB ops)
  - `loadTimetable()` - Load timetable (orchestrates utils and DB ops)
  - `deleteTimetable()` - Delete timetable document

- **schedules.js**: Database operations for schedule documents
  - `getSchedulesByTimetableId()` - Fetch schedules
  - `deleteSchedulesByTimetableId()` - Delete schedules
  - `saveSchedules()` - Save multiple schedules
  - `deleteScheduleById()` - Delete single schedule

- **courses.js**: Database operations for courses
  - `listCourses()` - Fetch courses
  - `upsertCourse()` - Create/update course
  - `deleteCourse()` - Delete course
  - `listSemesters()` - Fetch unique semesters

- **teachers.js**: Database operations for teachers
  - `listTeachers()` - Fetch teachers
  - `upsertTeacher()` - Create/update teacher
  - `deleteTeacher()` - Delete teacher
  - `listFaculties()` - Fetch unique faculties
  - `listDepartments()` - Fetch departments by faculty

- **rooms.js**: Database operations for rooms
  - `listRooms()` - Fetch rooms
  - `upsertRoom()` - Create/update room
  - `deleteRoom()` - Delete room
  - `listFaculties()` - Fetch unique faculties

### `/utils/`
Contains ALL business logic, data transformations, and calculations.

#### Files:
- **dataHelpers.js**: Common data manipulation utilities
  - `normalize()` - Trim and collapse whitespace
  - `safeId()` - Generate Firestore-safe IDs
  - `cellKey()` - Generate cell keys
  - `dataKey()` - Generate data keys
  - `DEFAULT_DAYS` - Constant for default weekdays

- **timetableHelpers.js**: Timetable-specific business logic
  - `getBatchCount()` - Calculate batch count for a cell
  - `generateTimetableId()` - Generate timetable document ID
  - `buildScheduleOccurrences()` - Convert timetable data to schedule list
  - `reconstructTimetableFromSchedules()` - Convert schedules back to timetable
  - `prepareTimetablePayload()` - Prepare data for storage

- **Conflict.js**: Conflict detection logic
  - `checkConflicts()` - Detect teacher and room conflicts

## Rules

### ✅ DO:
1. Keep all data fetching/writing in `/firebase/services/`
2. Keep all calculations and logic in `/utils/`
3. If utils need data, they should:
   - Accept data as parameters (preferred)
   - OR call firebase service functions
4. Use utility functions from utils when working in pages/components
5. Document new functions with JSDoc comments

### ❌ DON'T:
1. Put business logic in firebase service files
2. Put database operations in utils
3. Duplicate logic across files - extract to utils
4. Mix concerns - keep clear boundaries

## Example Usage

### Good ✅
```javascript
// In a page component
import { timetableService } from "../firebase/services";
import { generateTimetableId, buildScheduleOccurrences } from "../utils/timetableHelpers";

// Generate ID using utility
const id = generateTimetableId({ class, branch, semester });

// Fetch data using service
const timetable = await timetableService.loadTimetable(id);

// Process data using utility
const schedules = buildScheduleOccurrences(timetable);
```

### Bad ❌
```javascript
// DON'T: Business logic in service files
export async function saveTimetable(data) {
  // ❌ This logic should be in utils
  const id = data.class.toLowerCase() + "_" + data.branch;
  
  // ❌ This calculation should be in utils
  const processed = data.items.map(item => {
    return item.value * 2 + 10;
  });
  
  await setDoc(doc, processed);
}
```

## Migration Guide

When adding new features:

1. **If you need to fetch/write data:**
   - Add function to appropriate file in `/firebase/services/`
   - Keep it simple - just DB operations

2. **If you need to process/transform data:**
   - Add function to appropriate file in `/utils/`
   - Or create new util file if it's a new domain

3. **If you need both:**
   - Create util function for logic
   - Create service function for DB operation
   - Service can call util if needed

## Benefits

1. **Maintainability**: Clear separation makes code easier to understand
2. **Testability**: Utils can be tested without mocking Firestore
3. **Reusability**: Logic in utils can be used anywhere
4. **Scalability**: Easy to find and modify specific functionality
5. **Team Collaboration**: Clear boundaries reduce merge conflicts
