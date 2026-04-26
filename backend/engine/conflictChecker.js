/**
 * Conflict Checker
 *
 * Given ALL schedules (from every timetable), builds lookup maps
 * to quickly determine what's occupied at any (day, time) slot.
 */

const normalize = (value) =>
  String(value ?? "")
    .trim()
    .replace(/\s+/g, " ");

/**
 * Build occupation maps from a list of schedule documents.
 *
 * @param {Array} schedules - all schedule documents across all timetables
 * @returns {{
 *   teacherOccupied: Map<string, Set<string>>,   // "day|time" → Set of teacherIds
 *   roomOccupied:    Map<string, Set<string>>,    // "day|time" → Set of roomIds
 *   slotDetails:     Map<string, Array>            // "day|time" → full schedule entries
 * }}
 */
export function buildOccupationMaps(schedules) {
  const teacherOccupied = new Map(); // "day|time" → Set<teacherId>
  const roomOccupied    = new Map(); // "day|time" → Set<roomId>
  const slotDetails     = new Map(); // "day|time" → [schedule entries]

  for (const s of schedules) {
    const day  = normalize(s.day).toLowerCase();
    const time = normalize(s.time).toLowerCase();
    if (!day || !time) continue;

    const key = `${day}|${time}`;

    // Teacher occupation
    if (s.teacherId) {
      if (!teacherOccupied.has(key)) teacherOccupied.set(key, new Set());
      teacherOccupied.get(key).add(String(s.teacherId));
    }

    // Room occupation
    if (s.roomId) {
      if (!roomOccupied.has(key)) roomOccupied.set(key, new Set());
      roomOccupied.get(key).add(String(s.roomId));
    }

    // Full details
    if (!slotDetails.has(key)) slotDetails.set(key, []);
    slotDetails.get(key).push(s);
  }

  return { teacherOccupied, roomOccupied, slotDetails };
}

/**
 * Check if a teacher is free at a specific day+time.
 */
export function isTeacherFree(teacherOccupied, day, time, teacherId) {
  const key = `${normalize(day).toLowerCase()}|${normalize(time).toLowerCase()}`;
  const occupied = teacherOccupied.get(key);
  if (!occupied) return true;
  return !occupied.has(String(teacherId));
}

/**
 * Check if a room is free at a specific day+time.
 */
export function isRoomFree(roomOccupied, day, time, roomId) {
  const key = `${normalize(day).toLowerCase()}|${normalize(time).toLowerCase()}`;
  const occupied = roomOccupied.get(key);
  if (!occupied) return true;
  return !occupied.has(String(roomId));
}
