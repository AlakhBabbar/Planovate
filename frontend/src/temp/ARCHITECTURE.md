# Data Migration Architecture

## System Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER INTERFACE                           │
│  ┌────────────────┐              ┌────────────────────────┐     │
│  │  Timetable     │              │  Data Migration        │     │
│  │  Management    │              │  Page                  │     │
│  │  /timetable    │              │  /data-migration       │     │
│  └────────┬───────┘              └──────────┬─────────────┘     │
└───────────┼──────────────────────────────────┼───────────────────┘
            │                                  │
            │                                  │
┌───────────▼──────────────────────────────────▼───────────────────┐
│                      APPLICATION LAYER                            │
│                                                                   │
│  ┌──────────────────────┐      ┌──────────────────────────┐    │
│  │ idDisplayHelpers.js  │      │  migrationLogic.js       │    │
│  │                      │      │                          │    │
│  │ • resolveBatchData   │      │ • analyzeMigration()     │    │
│  │ • convertDisplayToIds│      │ • performMigration()     │    │
│  │ • getTeacherName()   │      │ • verifyMigration()      │    │
│  │ • getCourseCode()    │      │ • buildLookupMaps()      │    │
│  │ • getRoomDisplay()   │      │                          │    │
│  └──────────┬───────────┘      └───────────┬──────────────┘    │
│             │                              │                    │
│  ┌──────────▼──────────────────────────────▼──────────────┐    │
│  │            timetableHelpers.js                          │    │
│  │                                                         │    │
│  │  • buildScheduleOccurrences() - includes ID fields     │    │
│  │  • reconstructTimetableFromSchedules() - preserves IDs │    │
│  └──────────┬──────────────────────────────────────────────┘    │
└─────────────┼─────────────────────────────────────────────────────┘
              │
              │
┌─────────────▼─────────────────────────────────────────────────────┐
│                      DATA LAYER (Firebase)                         │
│                                                                    │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐           │
│  │  Teachers    │  │   Courses    │  │    Rooms     │           │
│  │  Collection  │  │  Collection  │  │  Collection  │           │
│  ├──────────────┤  ├──────────────┤  ├──────────────┤           │
│  │ unid: "123"  │  │ unid: "456"  │  │ unid: "789"  │           │
│  │ ID: "T001"   │  │ ID: "CS101"  │  │ ID: "R101"   │           │
│  │ name: "John" │  │ code: "CS101"│  │ faculty: "E" │           │
│  └──────────────┘  └──────────────┘  └──────────────┘           │
│                                                                    │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │                   Schedules Collection                      │  │
│  ├────────────────────────────────────────────────────────────┤  │
│  │ OLD FORMAT (Before Migration):                             │  │
│  │   teacher: "T001"                                          │  │
│  │   course: "CS101"                                          │  │
│  │   room: "R101-Engineering"                                 │  │
│  ├────────────────────────────────────────────────────────────┤  │
│  │ NEW FORMAT (After Migration):                              │  │
│  │   teacher: "T001"           ← Kept for compatibility       │  │
│  │   course: "CS101"           ← Kept for compatibility       │  │
│  │   room: "R101-Engineering"  ← Kept for compatibility       │  │
│  │   teacherId: "123"          ← NEW: References teachers doc │  │
│  │   courseId: "456"           ← NEW: References courses doc  │  │
│  │   roomId: "789"             ← NEW: References rooms doc    │  │
│  └────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────┘
```

## Data Flow: Loading a Timetable

```
1. User opens Timetable Management page
   ↓
2. TimetableManagement.jsx calls timetableService.loadTimetable()
   ↓
3. Loads schedules with both old fields AND new ID fields
   ↓
4. Calls resolveBatchDataForDisplay(batchData)
   ↓
5. idDisplayHelpers.js:
   - Fetches teachers/courses/rooms (cached)
   - Looks up IDs to get display names
   - Returns batchData with names
   ↓
6. User sees friendly names in the UI (not IDs)
```

## Data Flow: Saving a Timetable

```
1. User edits timetable cells with names (e.g., "T001", "CS101")
   ↓
2. User clicks "Save Timetable"
   ↓
3. TimetableManagement.jsx calls convertDisplayToIds(batchData)
   ↓
4. idDisplayHelpers.js:
   - Fetches teachers/courses/rooms (cached)
   - Builds reverse lookup maps (name → ID)
   - Converts each name to its unid
   - Returns batchData with BOTH names and IDs
   ↓
5. timetableHelpers.buildScheduleOccurrences():
   - Creates schedule documents
   - Includes both old fields (teacher, course, room)
   - Includes new fields (teacherId, courseId, roomId)
   ↓
6. Saves to Firestore with both formats
```

## Migration Process Flow

```
┌─────────────────────────────────────────────────────────────┐
│                  STEP 1: ANALYZE                             │
├─────────────────────────────────────────────────────────────┤
│  1. Fetch all schedules                                      │
│  2. Fetch all teachers, courses, rooms                       │
│  3. Build lookup maps (ID → unid)                           │
│  4. For each schedule:                                       │
│     - Try to find matching teacher by ID                     │
│     - Try to find matching course by ID                      │
│     - Try to find matching room by ID-Faculty               │
│  5. Count successes and failures                            │
│  6. Show user what will change                              │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│                  STEP 2: MIGRATE                             │
├─────────────────────────────────────────────────────────────┤
│  1. User confirms migration                                  │
│  2. Process schedules in batches of 450                     │
│  3. For each schedule:                                       │
│     - Look up teacher ID → get unid                         │
│     - Look up course ID → get unid                          │
│     - Look up room ID → get unid                            │
│     - Add teacherId, courseId, roomId fields                │
│     - Keep original fields                                   │
│  4. Update Firestore documents                              │
│  5. Track progress and errors                               │
│  6. Show completion summary                                 │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│                  STEP 3: VERIFY                              │
├─────────────────────────────────────────────────────────────┤
│  1. Fetch all schedules again                                │
│  2. Count how many have teacherId                           │
│  3. Count how many have courseId                            │
│  4. Count how many have roomId                              │
│  5. Show sample schedules with both old and new fields      │
│  6. User confirms migration success                         │
└─────────────────────────────────────────────────────────────┘
```

## Caching Strategy

```
┌─────────────────────────────────────────┐
│          Cache Structure                 │
├─────────────────────────────────────────┤
│                                          │
│  cache.teachers: Map<unid, teacher>     │
│  cache.courses: Map<unid, course>       │
│  cache.rooms: Map<unid, room>           │
│                                          │
│  lastFetch.teachers: timestamp           │
│  lastFetch.courses: timestamp            │
│  lastFetch.rooms: timestamp              │
│                                          │
│  Duration: 5 minutes                     │
│                                          │
└─────────────────────────────────────────┘

Benefits:
✓ Reduces Firestore reads
✓ Improves performance
✓ Automatically refreshes after 5 minutes
✓ Can be manually cleared with clearCache()
```

## Error Handling

```
┌─────────────────────────────────────────┐
│         Error Scenarios                  │
├─────────────────────────────────────────┤
│                                          │
│  1. Teacher ID not found                 │
│     → Keep original value               │
│     → Log in "Not Found" count          │
│                                          │
│  2. Course ID not found                  │
│     → Keep original value               │
│     → Log in "Not Found" count          │
│                                          │
│  3. Room ID not found                    │
│     → Keep original value               │
│     → Log in "Not Found" count          │
│                                          │
│  4. Firestore write fails                │
│     → Track in errors array             │
│     → Continue with next batch          │
│     → Report at end                     │
│                                          │
└─────────────────────────────────────────┘
```

## Backward Compatibility

```
OLD CODE (Still Works):
────────────────────────
schedule.teacher  → "T001"
schedule.course   → "CS101"
schedule.room     → "R101-Engineering"

NEW CODE (Also Works):
────────────────────────
schedule.teacher   → "T001"           ← Original
schedule.course    → "CS101"          ← Original
schedule.room      → "R101-Eng"       ← Original
schedule.teacherId → "1234567890"     ← NEW
schedule.courseId  → "9876543210"     ← NEW
schedule.roomId    → "1357924680"     ← NEW

Display Logic:
────────────────────────
if (schedule.teacherId) {
  // Use new format: look up name by ID
  displayName = getTeacherDisplayName(teacherId)
} else {
  // Use old format: display as-is
  displayName = schedule.teacher
}
```

## Performance Considerations

```
┌──────────────────────────────────────────────┐
│         Performance Metrics                   │
├──────────────────────────────────────────────┤
│                                               │
│  Cache Hit Rate: ~95% after first load       │
│  Cache Miss: Initial load + every 5 min      │
│                                               │
│  Migration Speed: ~450 docs/second           │
│  (Limited by Firestore batch write)          │
│                                               │
│  Memory Usage: Minimal (only caches IDs)     │
│                                               │
│  Network: Reduced by caching                 │
│                                               │
└──────────────────────────────────────────────┘
```
