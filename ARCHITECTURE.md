# Codebase Architecture

## Layer Separation

```
┌─────────────────────────────────────────────────────────┐
│                    PAGES / COMPONENTS                    │
│              (UI, User Interactions, State)              │
│                                                          │
│  - TimetableManagement.jsx                              │
│  - CourseLoad.jsx                                       │
│  - RoomLoad.jsx                                         │
│  - TeacherLoad.jsx                                      │
└────────────────┬────────────────────────────────────────┘
                 │
                 │ imports & calls
                 │
    ┌────────────┴────────────┐
    │                         │
    ▼                         ▼
┌─────────────────┐   ┌──────────────────┐
│  UTILS LAYER    │   │  FIREBASE LAYER  │
│  (Logic Only)   │◄──┤  (Database Only) │
│                 │   │                  │
│ • dataHelpers   │   │ • timetables     │
│ • timetableHelp │   │ • schedules      │
│ • Conflict      │   │ • courses        │
│                 │   │ • teachers       │
│                 │   │ • rooms          │
└─────────────────┘   └──────────────────┘
                               │
                               │ Firestore API
                               │
                               ▼
                    ┌─────────────────┐
                    │    FIRESTORE    │
                    │    DATABASE     │
                    └─────────────────┘
```

## Data Flow Examples

### Example 1: Saving a Timetable

```
User clicks Save
     │
     ▼
TimetableManagement.jsx
     │
     │ calls saveToFirestore()
     │
     ├─► generateTimetableId() ──────────► [utils/timetableHelpers]
     │   (generates ID from meta)
     │
     ├─► timetableService.saveTimetable() ─► [firebase/services/timetables]
     │                                        │
     │                                        ├─► prepareTimetablePayload() ──► [utils]
     │                                        ├─► buildScheduleOccurrences() ──► [utils]
     │                                        ├─► saveTimetableDocument() ─────► Firestore
     │                                        └─► saveSchedules() ─────────────► Firestore
     │
     └─► Success!
```

### Example 2: Loading a Timetable

```
User enters class, branch, semester
     │
     ▼
TimetableManagement.jsx (useEffect)
     │
     ├─► generateTimetableId() ──────────────► [utils/timetableHelpers]
     │   (generates ID to check)
     │
     └─► timetableService.loadTimetable() ───► [firebase/services/timetables]
                                                 │
                                                 ├─► getTimetableById() ─────────► Firestore
                                                 ├─► getSchedulesByTimetableId() ► Firestore
                                                 └─► reconstructFromSchedules() ──► [utils]
                                                     (transforms data)
                                                     │
                                                     ▼
                                              Returns complete timetable
```

### Example 3: Checking Conflicts

```
User updates teacher/room
     │
     ▼
TimetableManagement.jsx
     │
     │ calls updateBatch()
     │
     └─► checkConflicts() ───────────────────► [utils/Conflict]
         (pure logic, no DB calls)
         │
         └─► Returns conflict status
```

## File Responsibilities

### Firebase Services (Database Layer)
- **ONLY** Firestore operations
- **NO** calculations or transformations
- **NO** business rules
- Simple CRUD operations

```javascript
// ✅ GOOD - Just database operations
export async function getSchedules(timetableId) {
  const snap = await getDocs(query(...));
  return snap.docs.map(d => d.data());
}

// ❌ BAD - Has business logic
export async function getSchedules(timetableId) {
  const snap = await getDocs(query(...));
  const data = snap.docs.map(d => d.data());
  // ❌ This logic belongs in utils
  return data.filter(item => item.count > 5)
             .map(item => item.value * 2);
}
```

### Utils (Business Logic Layer)
- **ALL** calculations and transformations
- **ALL** business rules
- **ALL** data processing
- Can call Firebase services if needed

```javascript
// ✅ GOOD - Pure business logic
export function calculateTotal(items) {
  return items.reduce((sum, item) => sum + item.value, 0);
}

// ✅ GOOD - Can fetch data if needed
export async function getProcessedData(id) {
  const raw = await someService.fetchData(id);
  return processData(raw); // Transform using logic
}

// ❌ BAD - Direct Firestore calls
export async function getData(id) {
  // ❌ Should use service layer
  const snap = await getDoc(doc(db, "collection", id));
  return snap.data();
}
```

### Pages/Components (Presentation Layer)
- **UI rendering**
- **User interactions**
- **State management**
- Orchestrates services and utils

```javascript
// ✅ GOOD - Orchestrates services and utils
const handleSave = async () => {
  const id = generateTimetableId(meta);  // Utils
  await timetableService.save(data);     // Service
  setMessage("Saved!");                  // State
};

// ❌ BAD - Has business logic
const handleSave = async () => {
  // ❌ This should be in utils
  const id = meta.class.toLowerCase() + "_" + meta.branch;
  await timetableService.save(data);
};
```

## Quick Reference

| Need to...                | Add to...           |
|--------------------------|---------------------|
| Fetch from Firestore     | firebase/services   |
| Save to Firestore        | firebase/services   |
| Transform data           | utils               |
| Calculate values         | utils               |
| Validate input           | utils               |
| Check business rules     | utils               |
| Display UI               | pages/components    |
| Handle user events       | pages/components    |
| Manage state             | pages/components    |
