/**
 * Compute Engine — Smart Suggestion Grid
 *
 * Rules applied (in priority order):
 *
 * 1. CONTINUITY: Same course → same time slot across days (Mon/Tue/Wed pattern)
 * 2. CREDIT LIMIT: Never exceed lecture hours defined in curriculum
 * 3. BACK-TO-BACK: For a single day, try to keep same room for consecutive slots
 * 4. LAB GROUPING: Labs need 2-3 consecutive slots + batch splitting suggestion
 * 5. SAME FACULTY ROOM: After a course, prefer rooms in same building/faculty
 * 6. TEACHER LOAD: Prefer teachers with fewer assigned slots
 * 7. CONFLICT FREE: No teacher or room double-booking (hard constraint)
 */

import { buildOccupationMaps, isTeacherFree, isRoomFree } from './conflictChecker.js';

const normalize = (value) => String(value ?? '').trim().replace(/\s+/g, ' ');
const MAX_SUGGESTIONS = 3;

// ── Helpers ────────────────────────────────────────────────────────────────

function countPlacedHours(currentSchedules) {
  const counts = new Map();
  for (const s of currentSchedules) {
    if (!s.courseId) continue;
    const cid = String(s.courseId);
    counts.set(cid, (counts.get(cid) || 0) + 1);
  }
  return counts;
}

/**
 * Build a map: "day|row" → { courseId, teacherId, roomId }
 * Used for back-to-back same-room scoring.
 */
function buildCurrentSlotMap(currentSchedules) {
  const map = new Map();
  for (const s of currentSchedules) {
    if (!s.day || s.rowIndex == null || s.colIndex == null) continue;
    const key = `${normalize(s.day).toLowerCase()}|${s.rowIndex}`;
    map.set(key, s);
  }
  return map;
}

/**
 * Get how many times each teacher is already placed.
 */
function countTeacherLoad(currentSchedules) {
  const load = new Map();
  for (const s of currentSchedules) {
    if (!s.teacherId) continue;
    const tid = String(s.teacherId);
    load.set(tid, (load.get(tid) || 0) + 1);
  }
  return load;
}

/**
 * How many times does this course appear at this time-slot row across ALL days?
 * (Same-slot continuity check)
 */
function countCourseAtRow(currentSchedules, courseId, row) {
  return currentSchedules.filter(
    (s) => String(s.courseId) === String(courseId) && s.rowIndex === row
  ).length;
}

/**
 * Which days already have this course at this row?
 */
function getDaysWithCourseAtRow(currentSchedules, courseId, row) {
  const days = new Set();
  for (const s of currentSchedules) {
    if (String(s.courseId) === String(courseId) && s.rowIndex === row) {
      days.add(normalize(s.day).toLowerCase());
    }
  }
  return days;
}

/**
 * Score a suggestion based on smart rules. Higher = better.
 */
function scoreSuggestion({
  course,
  teacher,
  room,
  row,
  col,
  day,
  currentSchedules,
  slotMap,
  teacherLoad,
  days,
  timeSlots,
}) {
  let score = 100;

  // Rule 1: CONTINUITY — course already at same time slot on other days → prefer it
  const daysAtRow = getDaysWithCourseAtRow(currentSchedules, course.courseId, row);
  if (daysAtRow.size > 0 && !daysAtRow.has(day)) {
    score += 40 * daysAtRow.size; // strong boost for continuity
  }

  // Rule 2: CREDIT weight — courses with more remaining hours get higher priority
  score += Math.min(course.remaining * 8, 40);

  // Rule 3: BACK-TO-BACK same room — check adjacent rows same day
  const prevKey = `${day}|${row - 1}`;
  const nextKey = `${day}|${row + 1}`;
  const prevSlot = slotMap.get(prevKey);
  const nextSlot = slotMap.get(nextKey);

  if (prevSlot?.roomId && String(prevSlot.roomId) === String(room.roomId)) score += 20;
  if (nextSlot?.roomId && String(nextSlot.roomId) === String(room.roomId)) score += 20;

  // Same course back-to-back (important for labs, also good for continuity)
  if (prevSlot?.courseId && String(prevSlot.courseId) === String(course.courseId)) score += 15;
  if (nextSlot?.courseId && String(nextSlot.courseId) === String(course.courseId)) score += 15;

  // Rule 4: LAB — heavy preference for consecutive slots
  if (course.isLab) {
    const hasAdjacent = prevSlot?.courseId === course.courseId || nextSlot?.courseId === course.courseId;
    if (hasAdjacent) score += 35;
    else score -= 10; // penalize isolated lab slot
  }

  // Rule 5: SAME FACULTY ROOM — if prev/next slot has a room in same building
  const prevBuilding = prevSlot ? String(prevSlot.roomId || '').split('-')[0] : '';
  const roomBuilding = String(room.roomId || '').split('-')[0];
  if (prevBuilding && roomBuilding && prevBuilding === roomBuilding) score += 10;

  // Rule 6: TEACHER LOAD — prefer teachers with fewer slots (lower load = fresher)
  const load = teacherLoad.get(String(teacher.teacherId)) || 0;
  score -= load * 3;

  return score;
}

function getRemainingCourses(curriculum, allCourses, placedHours) {
  if (!curriculum?.courses?.length) return [];

  const courseMap = new Map();
  for (const c of allCourses) {
    if (c.unid != null) courseMap.set(String(c.unid), c);
    if (c.ID)           courseMap.set(String(c.ID), c);
    if (c.code)         courseMap.set(String(c.code), c);
  }

  const remaining = [];

  for (const entry of curriculum.courses) {
    const cid = String(entry.courseId || entry.unid || '');
    if (!cid) continue;

    const courseDoc = courseMap.get(cid);

    // credits can be String ("3") or Number. lectureHours is a Number fallback.
    const rawCredits = courseDoc?.credits ?? courseDoc?.lectureHours ?? 0;
    const totalHours = parseFloat(rawCredits) || 0;
    const placed = placedHours.get(cid) || 0;

    // If totalHours is unknown (0), treat as needing 3 hours so it still shows up
    const effectiveTotal = totalHours > 0 ? totalHours : 3;
    const left = Math.max(0, effectiveTotal - placed);

    remaining.push({
      courseId: cid,
      courseName: courseDoc?.name || cid,
      courseCode: courseDoc?.code || courseDoc?.ID || cid,
      remaining: left,
      total: effectiveTotal,
      placed,
      teacherIds: entry.teacherIds || [],
      isLab: /lab|practical|workshop/i.test(courseDoc?.name || ''),
      credits: effectiveTotal,
      // Carry the raw course doc so we can access teachers[] fallback
      _courseDoc: courseDoc,
    });
  }

  // Sort: most remaining first, then alpha
  remaining.sort((a, b) => b.remaining - a.remaining || a.courseCode.localeCompare(b.courseCode));
  return remaining;
}

// ── Main export ────────────────────────────────────────────────────────────

export function computeSuggestionGrid({
  currentSchedules,
  otherSchedules,
  curriculum,
  allCourses,
  allTeachers,
  allRooms,
  days,
  timeSlots,
}) {
  const allSchedules = [...currentSchedules, ...otherSchedules];
  const { teacherOccupied, roomOccupied } = buildOccupationMaps(allSchedules);

  const placedHours      = countPlacedHours(currentSchedules);
  const slotMap          = buildCurrentSlotMap(currentSchedules);
  const teacherLoad      = countTeacherLoad(currentSchedules);
  const remainingCourses = getRemainingCourses(curriculum, allCourses, placedHours);

  console.log(`[engine] courses in curriculum: ${curriculum?.courses?.length ?? 0}, remaining: ${remainingCourses.length}, timeSlots: ${timeSlots.length}, days: ${days.length}`);

  // Teacher lookup — by unid AND by ID
  const teacherMap = new Map();
  for (const t of allTeachers) {
    if (t.unid != null) teacherMap.set(String(t.unid), t);
    if (t.ID)           teacherMap.set(String(t.ID), t);
  }

  // Occupied cells in current timetable
  const occupiedCells = new Set();
  for (const s of currentSchedules) {
    if (s.courseId || s.teacherId || s.roomId) {
      occupiedCells.add(`${s.rowIndex}-${s.colIndex}`);
    }
  }

  const suggestionGrid = new Map();
  const normalizedDays  = days.map((d) => normalize(d).toLowerCase());
  const normalizedSlots = timeSlots.map((t) => normalize(t).toLowerCase());

  for (let row = 0; row < normalizedSlots.length; row++) {
    for (let col = 0; col < normalizedDays.length; col++) {
      const cellKey = `${row}-${col}`;
      if (occupiedCells.has(cellKey)) continue;

      const day  = normalizedDays[col];
      const time = normalizedSlots[row];
      const candidates = [];

      for (const course of remainingCourses) {
        if (course.remaining <= 0) continue;

        // Find available teachers:
        // Primary: teacherIds from curriculum entry; Fallback: all teachers
        const candidateIds = course.teacherIds.length > 0
          ? course.teacherIds.map(String)
          : allTeachers.map(t => String(t.unid ?? t.ID ?? '')).filter(Boolean);

        const availableTeachers = [];
        for (const tStr of candidateIds) {
          if (!tStr) continue;
          if (isTeacherFree(teacherOccupied, day, time, tStr)) {
            const tDoc = teacherMap.get(tStr);
            availableTeachers.push({ teacherId: tStr, teacherName: tDoc?.name || tDoc?.ID || tStr });
          }
        }
        if (availableTeachers.length === 0) continue;

        // Find available rooms
        const availableRooms = [];
        for (const r of allRooms) {
          const rid = String(r.unid || r.ID || '');
          if (!rid || !isRoomFree(roomOccupied, day, time, rid)) continue;
          availableRooms.push({ roomId: rid, roomName: r.name || r.ID || rid, building: String(rid).split('-')[0] });
        }
        if (availableRooms.length === 0) continue;

        // Score each teacher × room combination (top combo wins)
        let bestScore = -Infinity;
        let bestTeacher = availableTeachers[0];
        let bestRoom    = availableRooms[0];

        for (const teacher of availableTeachers.slice(0, 3)) {
          for (const room of availableRooms.slice(0, 5)) {
            const s = scoreSuggestion({
              course, teacher, room, row, col, day,
              currentSchedules, slotMap, teacherLoad, days, timeSlots
            });
            if (s > bestScore) { bestScore = s; bestTeacher = teacher; bestRoom = room; }
          }
        }

        // Continuity reason
        const daysAtRow = getDaysWithCourseAtRow(currentSchedules, course.courseId, row);
        let reason;
        if (daysAtRow.size > 0) {
          reason = `${course.courseCode} already at this time on ${[...daysAtRow].join('/')} — keep continuity`;
        } else if (course.remaining === course.total) {
          reason = `${course.courseCode} not yet scheduled (${course.total}h/week needed)`;
        } else {
          reason = `${course.courseCode} needs ${course.remaining} more hour${course.remaining > 1 ? 's' : ''} (${course.placed}/${course.total})`;
        }

        if (course.isLab) {
          reason += ' · Lab: consider consecutive slots + batch split';
        }

        candidates.push({
          courseId:         course.courseId,
          courseName:       course.courseName,
          courseCode:       course.courseCode,
          teacherId:        bestTeacher.teacherId,
          teacherName:      bestTeacher.teacherName,
          roomId:           bestRoom.roomId,
          roomName:         bestRoom.roomName,
          batchName:        '',
          isLab:            course.isLab,
          suggestBatchSplit: course.isLab,
          reason,
          score:            bestScore,
        });

        if (candidates.length >= MAX_SUGGESTIONS * 3) break; // gather extra for sorting
      }

      // Sort by score descending, take top MAX_SUGGESTIONS
      candidates.sort((a, b) => b.score - a.score);
      const top = candidates.slice(0, MAX_SUGGESTIONS);
      top.forEach((s, i) => { s.rank = i + 1; delete s.score; });

      if (top.length > 0) suggestionGrid.set(cellKey, top);
    }
  }

  return suggestionGrid;
}
