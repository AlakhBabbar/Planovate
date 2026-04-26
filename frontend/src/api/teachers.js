import { apiFetch, createQueryString } from "./apiClient";

const normalize = (value) =>
  String(value ?? "")
    .trim()
    .replace(/\s+/g, " ");


export async function listTeachers({ faculty, department } = {}) {
  const query = createQueryString({ faculty, department });
  return await apiFetch(`/teachers${query}`);
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
  await apiFetch(`/teachers/${unid}`, { method: 'PUT', body: JSON.stringify(payload) });
  return unid;
}

export async function deleteTeacher(unid) {
  await apiFetch(`/teachers/${unid}`, { method: 'DELETE' });
}

export async function listFaculties() {
  const items = await apiFetch('/teachers');
  const set = new Set();
  items.forEach(i => {
    const faculty = normalize(i.faculty);
    if (faculty) set.add(faculty);
  });
  return Array.from(set).sort((a, b) => a.localeCompare(b));
}

export async function listDepartments({ faculty } = {}) {
  const query = createQueryString({ faculty });
  const items = await apiFetch(`/teachers${query}`);
  const set = new Set();
  items.forEach(i => {
    const department = normalize(i.department);
    if (department) set.add(department);
  });
  return Array.from(set).sort((a, b) => a.localeCompare(b));
}
