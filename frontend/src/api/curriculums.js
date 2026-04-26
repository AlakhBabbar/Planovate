import { apiFetch, createQueryString } from "./apiClient";

export async function getCurriculum(id) {
  const res = await apiFetch(`/curriculums/${id}`);
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
  await apiFetch(`/curriculums/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
}

export async function deleteCurriculum(id) {
  await apiFetch(`/curriculums/${id}`, { method: 'DELETE' });
}

export async function listCurriculums() {
  return await apiFetch(`/curriculums`);
}
