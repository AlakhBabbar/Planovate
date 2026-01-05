# Schedule Saving Flow Diagram

## Complete Data Flow

```
User Input (TimetableManagement.jsx)
    ↓
    When user types in cell
    ↓
TimetableCell → onUpdateBatch()
    ↓
updateBatch(rowIndex, colIndex, batchIndex, field, value)
    ↓
setBatchData with updateBatchData utility
    ↓
State structure: {
  [tableId]: {
    "0-0-0": { course: "CS101", teacher: "Prof Smith", room: "Room 101", batchName: "A" },
    "0-1-0": { course: "CS102", teacher: "Prof Jones", room: "Room 102", batchName: "B" }
  }
}
    ↓
    User clicks "Save Timetable"
    ↓
saveToFirestore() function
    ↓
timetableService.saveTimetable({
  meta: { class, branch, semester, type },
  tables: ["table_1234567890_abc"],  // Array of table IDs
  timeSlots: ["9:00-10:00", "10:00-11:00", ...],
  days: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
  batchesByTable: {
    "table_1234567890_abc": {
      "0-0": 1,  // 1 batch at row 0, col 0
      "0-1": 2   // 2 batches at row 0, col 1
    }
  },
  batchDataByTable: {
    "table_1234567890_abc": {
      "0-0-0": { course: "...", teacher: "...", room: "...", batchName: "..." },
      "0-1-0": { course: "...", teacher: "...", room: "...", batchName: "..." },
      "0-1-1": { course: "...", teacher: "...", room: "...", batchName: "..." }
    }
  }
})
    ↓
timetables.js → saveTimetable()
    ↓
1. Generate timetableId = "tt_class__branch__semester"
2. Save timetable metadata to Firestore
    ↓
3. Call buildScheduleOccurrences()
    ↓
timetableHelpers.js → buildScheduleOccurrences()
    ↓
For each table:
  For each time slot (row):
    For each day (col):
      For each batch in that cell:
        Get data from batchDataByTable[tableId][key]
        If cell has data (course/teacher/room/batch):
          Add to occurrences array
    ↓
Return array of schedule occurrences: [
  {
    timetableId: "tt_class__branch__semester",
    tableId: "table_1234567890_abc",
    rowIndex: 0,
    colIndex: 0,
    batchIndex: 0,
    day: "mon",
    time: "9:00-10:00",
    class: "btech",
    branch: "cse",
    batch: "a",
    course: "cs101",
    teacher: "prof_smith",
    room: "room_101"
  },
  // ... more occurrences
]
    ↓
schedules.js → saveSchedules()
    ↓
1. Get existing schedules from Firestore
2. Create/update schedule documents:
   Document ID = "tt_class__branch__semester__table_xxx-0-0-0"
3. Delete orphaned documents (cells that were cleared)
    ↓
Firestore Database

schedules collection:
  - tt_class__branch__semester__table_xxx-0-0-0
  - tt_class__branch__semester__table_xxx-0-1-0
  - tt_class__branch__semester__table_xxx-0-1-1
  ...
```

## Debug Checkpoints

### Checkpoint 1: User Input
**Location**: TimetableCell component  
**Check**: Are values being sent to `onUpdateBatch`?  
**Debug**: Add `console.log` in the cell component's onChange

### Checkpoint 2: State Update
**Location**: TimetableManagement.jsx → updateBatch()  
**Check**: Is `setBatchData` being called?  
**Debug**: Log `prev` and `updatedBatchData` in updateBatch

### Checkpoint 3: Save Trigger
**Location**: TimetableManagement.jsx → saveToFirestore()  
**Check**: Are `batches` and `batchData` populated?  
**Debug**: Check the 🚀 log we added

### Checkpoint 4: Schedule Building
**Location**: timetableHelpers.js → buildScheduleOccurrences()  
**Check**: Are occurrences being created?  
**Debug**: Check the 📦, 📋, and 📊 logs we added

### Checkpoint 5: Firestore Write
**Location**: schedules.js → saveSchedules()  
**Check**: Is Firebase receiving the data?  
**Debug**: Check the 💾 log and any Firebase errors

## Common Failure Points

### 1. Empty batchData
**Symptom**: `dataKeys: []` in console  
**Cause**: Input handlers not updating state  
**Fix**: Verify TimetableCell is calling `onUpdateBatch`

### 2. Wrong table ID
**Symptom**: `batchesByTableKeys` and `batchDataByTableKeys` don't match  
**Cause**: Table switching or ID mismatch  
**Fix**: Ensure `activeTable` is consistent

### 3. All cells skipped
**Symptom**: "⏭️ Skipping empty cell" for all cells  
**Cause**: Fields are empty strings or whitespace  
**Fix**: Check that values aren't being normalized to empty

### 4. Zero occurrences
**Symptom**: "📊 Total occurrences built: 0"  
**Cause**: No valid data in any cell  
**Fix**: Add data to at least one cell (course, teacher, or room)

### 5. Firebase error
**Symptom**: Error in `saveSchedules`  
**Cause**: Permission denied or network issue  
**Fix**: Check Firebase console and security rules

## Expected vs Actual

### What SHOULD happen:
1. User types in cell → State updates immediately
2. State contains data in `batchData[tableId][key]`
3. Save button → Builds schedules array (length > 0)
4. Saves to Firestore → Success message

### What MIGHT be happening (based on common issues):
1. User types in cell → ❌ State doesn't update
2. State is empty: `batchData = {}`
3. Save button → Builds empty array (length = 0)
4. Nothing saved to Firestore

## Manual Test

1. Open console (F12)
2. Go to Timetable page
3. Fill: Class="BTech", Branch="CSE", Semester="1"
4. In first cell (Mon, 9:00-10:00):
   - Select a course
   - Select a teacher
   - Select a room
5. Click Save
6. Review console logs in order:
   - 🚀 Should show batchData with at least one entry
   - 📦 Should show tables array is not empty
   - 🔍 Should show dataForTable has keys
   - 🔎 Should find data for at least one key
   - ✅ Should add at least one schedule
   - 📊 Should report total > 0
   - 💾 Should call saveSchedules with count > 0

If any step fails, that's where the problem is!
