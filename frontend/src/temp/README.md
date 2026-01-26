# Data Migration Tool

## Overview
This migration tool converts your timetable data structure from storing names directly to using unique IDs with references.

## What Changes?

### Current Structure (Before Migration)
- **Teacher**: Stored as Teacher ID (e.g., "T001")
- **Course**: Stored as Course ID (e.g., "CS101")
- **Room**: Stored as "Room ID-Faculty" (e.g., "R101-Engineering")

### New Structure (After Migration)
- **Teacher**: Stored as unique document ID (unid) from teachers collection
- **Course**: Stored as unique document ID (unid) from courses collection
- **Room**: Stored as unique document ID (unid) from rooms collection

The old fields (teacher, course, room) will be **preserved** for backward compatibility.

New fields added:
- `teacherId` - references teachers collection
- `courseId` - references courses collection
- `roomId` - rooms collection

## How to Use

### Access the Migration Tool
1. Navigate to `/data-migration` route in your browser
2. The URL should be: `http://localhost:5173/data-migration` (or your deployment URL)

### Migration Steps

#### Step 1: Analyze (Dry Run)
1. Click **"1. Analyze (Dry Run)"** button
2. Review the analysis results:
   - Total schedules to be migrated
   - Number of successful mappings found
   - Number of items not found
   - Example conversions showing what will change
3. Check for any "Not Found" items - these may need to be fixed in your source data

#### Step 2: Migrate Database
1. **IMPORTANT**: Create a database backup before proceeding
2. Click **"2. Migrate Database"** button
3. Confirm the warning dialog
4. Wait for the migration to complete
5. Review the results:
   - Total schedules processed
   - Number successfully updated
   - Any errors encountered

#### Step 3: Verify Results
1. Click **"3. Verify Results"** button
2. Review verification statistics:
   - How many schedules now have teacher IDs
   - How many schedules now have course IDs
   - How many schedules now have room IDs
3. Check sample schedules to ensure both old and new fields exist

## Technical Details

### Files Created
- `migrationLogic.js` - Core migration functions
- `DataMigration.jsx` - UI component for migration
- `idDisplayHelpers.js` - Helper functions for ID/name conversion

### Modified Files
- `main.jsx` - Added route for migration page
- `TimetableManagement.jsx` - Updated to use ID conversion
- `timetableHelpers.js` - Added ID field handling

## Post-Migration

### Displaying Timetables
The TimetableManagement page now automatically:
1. Loads timetables with IDs
2. Resolves IDs to display names using `resolveBatchDataForDisplay()`
3. Shows the user-friendly names in the UI

### Saving Timetables
When saving, the system:
1. Converts display names back to IDs using `convertDisplayToIds()`
2. Saves both the display names AND the IDs
3. This maintains backward compatibility

### Caching
The system uses a 5-minute cache for ID-to-name lookups to improve performance:
- Teacher names
- Course codes
- Room identifiers

Clear the cache after bulk updates using `clearCache()` from `idDisplayHelpers.js`.

## Troubleshooting

### Items Not Found During Analysis
If you see "NOT FOUND" in the analysis:
1. Check that the item exists in its respective collection (teachers/courses/rooms)
2. Verify the ID format matches exactly
3. For rooms, ensure the format is "RoomID-Faculty"

### Migration Errors
If migration fails:
1. Check the browser console for detailed error messages
2. Verify Firestore permissions
3. Ensure all collections are accessible
4. Check that document IDs are valid

### Display Issues After Migration
If names don't display correctly:
1. Check browser console for errors
2. Verify the cache is working (check Network tab)
3. Clear cache using `clearCache()` if needed
4. Ensure all IDs in schedules exist in their respective collections

## Rollback

If you need to rollback:
1. Restore your database from backup
2. The old fields were preserved, so existing functionality should continue to work
3. Update the code to use the old field names

## Safety Features

- **Dry run analysis** before actual migration
- **Preserves old fields** for backward compatibility
- **Batch processing** to handle large datasets
- **Progress tracking** during migration
- **Error reporting** for failed updates

## Support

If you encounter issues:
1. Check the browser console for detailed errors
2. Review the verification results
3. Ensure your data structure matches the expected format
4. Contact your development team for assistance
