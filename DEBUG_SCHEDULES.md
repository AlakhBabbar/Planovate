# Debug Guide: Schedules Not Saving to Firestore

## Issue Analysis

I've added comprehensive debug logging to trace why schedules aren't being saved. The logging will help identify where the problem occurs.

## Debug Logs Added

### 1. **TimetableManagement.jsx** (Line ~287)
- Logs the data being sent to `saveTimetable()` including:
  - metadata (class, branch, semester, type)
  - tables array
  - timeSlots
  - batches object
  - batchData object

### 2. **timetables.js** (Line ~91)
- Logs what's being passed to `buildScheduleOccurrences()`
- Shows table IDs, batch counts, and time slot counts
- Reports how many schedules were built

### 3. **timetableHelpers.js** (Line ~34)
- Logs input parameters to `buildScheduleOccurrences()`
- Shows which tables are being processed
- Logs each cell being added or skipped
- Shows total occurrences built

### 4. **schedules.js** (Line ~60)
- Confirms `saveSchedules()` was called
- Shows how many schedules are being saved

## Testing Steps

1. **Open Developer Console** (F12 in browser)
2. **Go to Timetable Management page**
3. **Fill in the form**:
   - Class
   - Branch/Batch
   - Semester
   - Type
4. **Add some schedule data** in the timetable cells:
   - Select a course
   - Select a teacher
   - Select a room
5. **Click "Save Timetable"**
6. **Check the console** for debug messages

## What to Look For

### ✅ **Expected Flow** (If working correctly):
```
🚀 Saving timetable with data: { ... }
📦 buildScheduleOccurrences called with: { ... }
📋 Processing tables: [...]
✅ Adding schedule: table_xxx [0, 0, 0] - Course Name
✅ Adding schedule: table_xxx [0, 1, 0] - Another Course
📊 Total occurrences built: 10
🔍 Building schedules with: { ... }
📋 Built schedules: 10 occurrences
💾 saveSchedules called with: { timetableId: "...", schedulesCount: 10 }
```

### ❌ **Problem Indicators**:

#### Problem 1: No schedules built
```
📦 buildScheduleOccurrences called with: { ... }
📋 Processing tables: []  ← EMPTY ARRAY
📊 Total occurrences built: 0  ← ZERO OCCURRENCES
⚠️ No occurrences were built!
```
**Cause**: `batchesByTable` or `batchDataByTable` is empty
**Solution**: Check how cells are being populated in the UI

#### Problem 2: Empty batchData
```
📦 buildScheduleOccurrences called with: {
  batchesByTableKeys: ["table_123"],
  batchDataByTableKeys: []  ← EMPTY
}
⏭️ Skipping empty cell: table_123 [0, 0, 0]  ← ALL CELLS SKIPPED
📊 Total occurrences built: 0
```
**Cause**: Batch data is not being stored when user fills cells
**Solution**: Check `updateBatch()` function in TimetableManagement

#### Problem 3: Firebase error
```
💾 saveSchedules called with: { ... }
Error: Missing or insufficient permissions
```
**Cause**: Firebase security rules or configuration issue
**Solution**: Check Firebase console and security rules

## Common Issues & Solutions

### Issue 1: Empty `batchData` object
**Symptom**: Debug shows `batchDataByTableKeys: []`
**Cause**: User input not being captured
**Fix**: Check that `onUpdateBatch` is properly wired in `TimetableTable` component

### Issue 2: Table IDs mismatch
**Symptom**: `batchesByTable` has keys, but `batchDataByTable` has different keys
**Cause**: Table ID generation inconsistency
**Fix**: Ensure both objects use the same table ID from `activeTable` state

### Issue 3: All cells marked as empty
**Symptom**: All cells show "⏭️ Skipping empty cell"
**Cause**: Fields are empty strings or whitespace
**Fix**: Verify that course/teacher/room values are being set correctly

### Issue 4: Firebase not configured
**Symptom**: Error about Firebase not initialized
**Cause**: Missing or incorrect environment variables
**Fix**: Check `.env` file has all required `VITE_FIREBASE_*` variables

## Quick Fix Checklist

- [ ] Check browser console for debug logs
- [ ] Verify `batchData` state is populated when you edit cells
- [ ] Confirm table IDs match between `batches` and `batchData`
- [ ] Ensure at least one cell has course/teacher/room data
- [ ] Check Firebase environment variables are set
- [ ] Verify Firebase security rules allow write access

## Next Steps

After reviewing the console logs, identify which stage fails:
1. **Data collection** (TimetableManagement)
2. **Schedule building** (timetableHelpers)
3. **Firestore writing** (schedules)

Then we can apply the appropriate fix!
