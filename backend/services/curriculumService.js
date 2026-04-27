/**
 * Curriculum service — MongoDB
 */
import Curriculum from '../models/Curriculum.js';

export async function getAllCurriculums() {
  return await Curriculum.find({}).lean();
}

export async function getCurriculumById(id) {
  return await Curriculum.findById(id).lean();
}

/**
 * Find curriculum matching timetable metadata.
 */
export function findCurriculumForMeta(curriculums, meta) {
  const norm = (v) => String(v ?? '').trim().toLowerCase();
  return curriculums.find(
    (c) =>
      norm(c.class || c.className) === norm(meta.class) &&
      norm(c.branch) === norm(meta.branch) &&
      norm(c.semester) === norm(meta.semester) &&
      norm(c.type) === norm(meta.type)
  ) || null;
}
