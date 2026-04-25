/**
 * Course document shape.
 *
 * Firestore collection: "courses"
 * Doc ID: numeric unid
 *
 * @typedef {Object} Course
 * @property {number} unid
 * @property {string} ID          - display code e.g. "CS301"
 * @property {string} name
 * @property {string} code
 * @property {string} credits
 * @property {string[]} teachers  - array of teacher IDs that can teach this course
 * @property {string} faculty
 * @property {string} department
 * @property {string} semester
 */

export default {};
