# Quick Start Guide - Data Migration

## 🎯 Quick Overview
This guide helps you migrate from storing names to using unique IDs in your timetable system.

## ⚡ Quick Steps

### 1. Access Migration Tool
```
http://localhost:5173/data-migration
```

### 2. Run the 3-Step Process

#### Step 1: Analyze ✓
- Click "1. Analyze (Dry Run)"
- Review what will change
- Check for any "Not Found" items

#### Step 2: Migrate ⚠️
- **BACKUP YOUR DATABASE FIRST!**
- Click "2. Migrate Database"
- Confirm the warning
- Wait for completion

#### Step 3: Verify ✅
- Click "3. Verify Results"
- Check all schedules have IDs
- Review sample data

## 📊 What Changes?

### Before Migration
```
schedule: {
  teacher: "T001",
  course: "CS101",
  room: "R101-Engineering"
}
```

### After Migration
```
schedule: {
  teacher: "T001",           // ✓ Kept for compatibility
  course: "CS101",           // ✓ Kept for compatibility
  room: "R101-Engineering",  // ✓ Kept for compatibility
  teacherId: "1234567890",   // ✨ NEW
  courseId: "9876543210",    // ✨ NEW
  roomId: "1357924680"       // ✨ NEW
}
```

## 🔧 After Migration

### Everything Works Automatically!
- ✅ Load timetables - names display correctly
- ✅ Edit timetables - saves with IDs
- ✅ Create new timetables - uses IDs
- ✅ Export - works as before
- ✅ Conflict detection - works as before

### No Code Changes Needed for Users!
The system automatically:
1. Converts IDs to names for display
2. Converts names back to IDs when saving

## ⚠️ Important

### Before Migration
- [ ] Backup your Firestore database
- [ ] Test on non-production data first
- [ ] Verify all teachers/courses/rooms have IDs

### During Migration
- [ ] Don't close the browser tab
- [ ] Don't refresh the page
- [ ] Watch the progress bar

### After Migration
- [ ] Run verification
- [ ] Test loading a timetable
- [ ] Test saving a timetable
- [ ] Check for console errors

## 🐛 Troubleshooting

### "Items Not Found" in Analysis
→ Check that items exist in their collections
→ Verify ID formats match

### Migration Takes Too Long
→ Normal for large databases
→ Check Firestore quotas

### Names Don't Display After Migration
→ Check browser console
→ Clear cache and refresh

## 📞 Need Help?

1. Check [temp/README.md](temp/README.md) for detailed guide
2. Check [MIGRATION_SUMMARY.md](../MIGRATION_SUMMARY.md) for technical details
3. Review browser console for errors
4. Contact your development team

## 🎉 Success Checklist

After migration, verify these work:
- [ ] Open Timetable Management page
- [ ] Load an existing timetable
- [ ] See course/teacher/room names (not IDs)
- [ ] Edit a cell
- [ ] Save the timetable
- [ ] Reload the page
- [ ] Verify changes persisted
- [ ] Check no console errors

## 🔄 Rollback (If Needed)

If something goes wrong:
1. Restore database from backup
2. Old fields are preserved, so nothing breaks
3. System continues to work with old fields

---

**Remember**: This is a ONE-TIME migration. Once done, the system will use IDs automatically for all future operations.
