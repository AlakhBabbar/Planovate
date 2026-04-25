/**
 * Curriculum document shape.
 *
 * Firestore collection: "curriculums"
 * Doc ID: {class}_{branch}_{sem}_{type}
 *
 * @typedef {Object} CurriculumCourse
 * @property {string} courseId
 * @property {string[]} teacherIds
 *
 * @typedef {Object} Curriculum
 * @property {string} curriculumId
 * @property {string} class
 * @property {string} branch
 * @property {string} semester
 * @property {string} type
 * @property {CurriculumCourse[]} courses
 * @property {number} totalCredits
 * @property {number} expectedCredits
 */

export default {};
