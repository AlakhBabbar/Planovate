import { apiFetch } from "./apiClient";

export async function getCurriculum(id) {
  const res = await apiFetch(`/curriculums/${id}`);
  return res ? res : null;
}

/**
 * Save (create or update) a curriculum.
 * @param {string} id - curriculumId
 * @param {Array}  courses - [{ courseId, teacherIds[] }]
 * @param {Object} meta - { className, branch, semester, type } (optional override)
 */
export async function saveCurriculum(id, courses, meta = {}) {
  const payload = {
    curriculumId: id,
    class: meta.className || meta.class || '',
    branch: meta.branch || '',
    semester: meta.semester || '',
    type: meta.type || '',
    courses: (courses || []).map(c => ({
      courseId: String(c.courseId ?? c.unid ?? c.ID ?? ''),
      teacherIds: c.teacherIds || [],
    })),
  };
  return await apiFetch(`/curriculums/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
}

export async function deleteCurriculum(id) {
  await apiFetch(`/curriculums/${id}`, { method: 'DELETE' });
}

export async function listCurriculums() {
  return await apiFetch(`/curriculums`);
}
