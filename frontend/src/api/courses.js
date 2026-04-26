import { apiFetch, createQueryString } from "./apiClient";

const normalize = (value) =>
  String(value ?? "")
    .trim()
    .replace(/\s+/g, " ");


export async function listCourses({ faculty, department, semester } = {}) {
  const query = createQueryString({ faculty, department, semester });
  return await apiFetch(`/courses${query}`);
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
  await apiFetch(`/courses/${unid}`, { method: 'PUT', body: JSON.stringify(payload) });
  return unid;
}

export async function deleteCourse(unid) {
  await apiFetch(`/courses/${unid}`, { method: 'DELETE' });
}

export async function listSemesters({ faculty, department } = {}) {
  if (!faculty || !department) return [];
  const query = createQueryString({ faculty, department });
  const courses = await apiFetch(`/courses${query}`);
  const set = new Set();
  courses.forEach(c => {
    const semester = normalize(c.semester);
    if (semester) set.add(semester);
  });
  return Array.from(set).sort((a, b) => a.localeCompare(b));
}

export async function listFaculties() {
  const items = await apiFetch('/courses');
  const set = new Set();
  items.forEach(i => {
    const faculty = normalize(i.faculty);
    if (faculty) set.add(faculty);
  });
  return Array.from(set).sort((a, b) => a.localeCompare(b));
}

export async function listDepartments({ faculty } = {}) {
  const query = createQueryString({ faculty });
  const items = await apiFetch(`/courses${query}`);
  const set = new Set();
  items.forEach(i => {
    const department = normalize(i.department);
    if (department) set.add(department);
  });
  return Array.from(set).sort((a, b) => a.localeCompare(b));
}
