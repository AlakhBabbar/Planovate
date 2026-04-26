import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const basePath = path.join(__dirname, 'src', 'firebase', 'services');

const normalizeHelper = `
const normalize = (value) =>
  String(value ?? "")
    .trim()
    .replace(/\\s+/g, " ");
`;

const getCodeFor = (fileName) => {
  if (fileName === 'courses.js') return `import { apiFetch, createQueryString } from "./apiClient";
${normalizeHelper}

export async function listCourses({ faculty, department, semester } = {}) {
  const query = createQueryString({ faculty, department, semester });
  return await apiFetch(\`/courses\${query}\`);
}

export async function upsertCourse(course) {
  const unid = course.unid ?? Date.now();
  const payload = {
    unid,
    ID: normalize(course.ID),
    name: normalize(course.name),
    code: normalize(course.code),
    credits: normalize(course.credits),
    lectureHours: course.lectureHours !== undefined ? Number(course.lectureHours) || 0 : 0,
    type: normalize(course.type) || "Theory",
    teachers: Array.isArray(course.teachers) ? course.teachers : [],
    faculty: normalize(course.faculty),
    department: normalize(course.department),
    semester: normalize(course.semester),
  };
  await apiFetch(\`/courses/\${unid}\`, { method: 'PUT', body: JSON.stringify(payload) });
  return unid;
}

export async function deleteCourse(unid) {
  await apiFetch(\`/courses/\${unid}\`, { method: 'DELETE' });
}

export async function listSemesters({ faculty, department } = {}) {
  if (!faculty || !department) return [];
  const query = createQueryString({ faculty, department });
  const courses = await apiFetch(\`/courses\${query}\`);
  const set = new Set();
  courses.forEach(c => {
    const semester = normalize(c.semester);
    if (semester) set.add(semester);
  });
  return Array.from(set).sort((a, b) => a.localeCompare(b));
}
`;

  if (fileName === 'teachers.js') return `import { apiFetch, createQueryString } from "./apiClient";
${normalizeHelper}

export async function listTeachers({ faculty, department } = {}) {
  const query = createQueryString({ faculty, department });
  return await apiFetch(\`/teachers\${query}\`);
}

export async function upsertTeacher(teacher) {
  const unid = teacher.unid ?? Date.now();
  const payload = {
    unid,
    ID: normalize(teacher.ID),
    name: normalize(teacher.name),
    faculty: normalize(teacher.faculty),
    department: normalize(teacher.department),
  };
  await apiFetch(\`/teachers/\${unid}\`, { method: 'PUT', body: JSON.stringify(payload) });
  return unid;
}

export async function deleteTeacher(unid) {
  await apiFetch(\`/teachers/\${unid}\`, { method: 'DELETE' });
}
`;

  if (fileName === 'rooms.js') return `import { apiFetch, createQueryString } from "./apiClient";
${normalizeHelper}

export async function listRooms({ faculty } = {}) {
  const query = createQueryString({ faculty });
  return await apiFetch(\`/rooms\${query}\`);
}

export async function upsertRoom(room) {
  const unid = room.unid ?? Date.now();
  const payload = {
    unid,
    ID: normalize(room.ID),
    name: normalize(room.name),
    capacity: Number(room.capacity) || 0,
    floor: normalize(room.floor),
    faculty: normalize(room.faculty),
    availability: room.availability || {
      day: {
        mon: [],
        tue: [],
        wed: [],
        thu: [],
        fri: [],
        sat: [],
      },
    },
  };
  await apiFetch(\`/rooms/\${unid}\`, { method: 'PUT', body: JSON.stringify(payload) });
  return unid;
}

export async function deleteRoom(unid) {
  await apiFetch(\`/rooms/\${unid}\`, { method: 'DELETE' });
}
`;

  if (fileName === 'curriculums.js') return `import { apiFetch, createQueryString } from "./apiClient";

export async function getCurriculum(id) {
  const res = await apiFetch(\`/curriculums/\${id}\`);
  return res ? res : null;
}

export async function saveCurriculum(id, courses) {
  const [classVal, branchVal, semesterVal, typeVal] = id.split("_");
  const payload = {
    curriculumId: id,
    class: classVal,
    branch: branchVal,
    semester: semesterVal,
    type: typeVal,
    courses: courses.map(c => ({
      courseId: String(c.courseId),
      teacherIds: c.teacherIds || [],
    })),
  };
  await apiFetch(\`/curriculums/\${id}\`, { method: 'PUT', body: JSON.stringify(payload) });
}

export async function deleteCurriculum(id) {
  await apiFetch(\`/curriculums/\${id}\`, { method: 'DELETE' });
}

export async function listCurriculums() {
  return await apiFetch(\`/curriculums\`);
}
`;

  if (fileName === 'timetables.js') return `import { apiFetch } from "./apiClient";

export async function saveTimetable(timetableData) {
  const unid = \`tt_\${timetableData.meta.class}_\${timetableData.meta.branch}_\${timetableData.meta.semester}_\${timetableData.meta.type}\`.toLowerCase().replace(/[^a-z0-9_]/g, "_");
  const payload = {
    unid,
    name: timetableData.meta.name || "Untitled",
    class: timetableData.meta.class,
    branch: timetableData.meta.branch,
    semester: timetableData.meta.semester,
    type: timetableData.meta.type,
    days: timetableData.days || [],
    timeSlots: timetableData.timeSlots || [],
  };
  await apiFetch(\`/timetables/\${unid}\`, { method: 'PUT', body: JSON.stringify(payload) });
  return unid;
}

export async function getTimetable(unid) {
  return await apiFetch(\`/timetables/\${unid}\`);
}

export async function listTimetables() {
  return await apiFetch(\`/timetables\`);
}

export async function deleteTimetable(unid) {
  await apiFetch(\`/timetables/\${unid}\`, { method: 'DELETE' });
}
`;

  if (fileName === 'schedules.js') return `import { apiFetch, createQueryString } from "./apiClient";

export async function getSchedulesByTimetableId(timetableId) {
  const query = createQueryString({ timetableId });
  return await apiFetch(\`/schedules\${query}\`);
}

export async function saveSchedules({ timetableId, schedules }) {
  // To simulate batch processing efficiently, we could delete all existing and insert new ones.
  // Actually, standard PUT /api/schedules is not ideal here since we just want to bulk replace.
  // For simplicity since the backend is basic, we will bulk POST instead if they don't exist, but we should clear first.
  
  // We can just fetch existing ones and delete them one by one, then create new ones.
  const existing = await apiFetch(\`/schedules?timetableId=\${timetableId}\`);
  await Promise.all(existing.map(s => apiFetch(\`/schedules/\${s._id}\`, { method: 'DELETE' })));
  
  // Insert new
  await Promise.all(schedules.map(s => {
    s.timetableId = timetableId;
    return apiFetch(\`/schedules\`, { method: 'POST', body: JSON.stringify(s) });
  }));
}

export async function deleteAllSchedulesByTimetableId(timetableId) {
  const existing = await apiFetch(\`/schedules?timetableId=\${timetableId}\`);
  await Promise.all(existing.map(s => apiFetch(\`/schedules/\${s._id}\`, { method: 'DELETE' })));
}

export async function listSchedules() {
  return await apiFetch(\`/schedules\`);
}
`;

  if (fileName === 'tempSchedules.js') return `import { apiFetch, createQueryString } from "./apiClient";

export async function getTempSchedules(timetableId) {
  const query = createQueryString({ timetableId });
  return await apiFetch(\`/tempschedules\${query}\`);
}

export async function upsertTempSchedules({ timetableId, schedules }) {
  // Clear first then post new
  const existing = await apiFetch(\`/tempschedules?timetableId=\${timetableId}\`);
  await Promise.all(existing.map(s => apiFetch(\`/tempschedules/\${s._id}\`, { method: 'DELETE' })));
  
  await Promise.all(schedules.map(s => {
    s.timetableId = timetableId;
    return apiFetch(\`/tempschedules\`, { method: 'POST', body: JSON.stringify(s) });
  }));
}

export async function clearTempSchedules(timetableId) {
  const existing = await apiFetch(\`/tempschedules?timetableId=\${timetableId}\`);
  await Promise.all(existing.map(s => apiFetch(\`/tempschedules/\${s._id}\`, { method: 'DELETE' })));
}
`;

  if (fileName === 'settings.js') return `import { apiFetch } from "./apiClient";

export async function getPrograms() {
  const res = await apiFetch(\`/settings/programs\`);
  return res && res.list ? res.list : [];
}

export async function savePrograms(programs) {
  await apiFetch(\`/settings/programs\`, { method: 'PUT', body: JSON.stringify({ _docId: 'programs', list: programs }) });
}

export async function getBranches() {
  const res = await apiFetch(\`/settings/branches\`);
  return res && res.list ? res.list : [];
}

export async function saveBranches(branches) {
  await apiFetch(\`/settings/branches\`, { method: 'PUT', body: JSON.stringify({ _docId: 'branches', list: branches }) });
}

export async function getAllSettings() {
  const [programs, branches] = await Promise.all([
    getPrograms(),
    getBranches(),
  ]);
  return { programs, branches };
}
`;

  return "";
}

const files = ['courses.js', 'teachers.js', 'rooms.js', 'curriculums.js', 'timetables.js', 'schedules.js', 'tempSchedules.js', 'settings.js'];

files.forEach(file => {
  fs.writeFileSync(path.join(basePath, file), getCodeFor(file));
});

console.log('Frontend services updated to use generic MongoDB api endpoints!');
