/**
 * Room document shape.
 *
 * Firestore collection: "rooms"
 * Doc ID: numeric unid
 *
 * @typedef {Object} Room
 * @property {number} unid
 * @property {string} ID          - display code e.g. "R101"
 * @property {string} name
 * @property {number} capacity
 * @property {string} floor
 * @property {string} faculty
 * @property {Object} availability - { day: { mon: { time: [] }, ... } }
 */

export default {};
