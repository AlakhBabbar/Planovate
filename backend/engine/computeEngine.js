/**
 * Compute Engine
 *
 * Takes all data (schedules, courses, teachers, rooms, curriculum) and
 * produces a suggestion grid: for every empty cell in the current timetable,
 * a ranked list of conflict-free (course, teacher, room) combinations.
 *
 * Key rules:
 * - NO teacher double-booking (non-negotiable)
 * - NO room double-booking (non-negotiable)
 * - Only suggest courses from the active curriculum
 * - Prioritize courses with remaining lecture hours
 * - Top 3 suggestions per cell
 * - Suggest batch splitting for lab/practical courses when appropriate
 */

import { normalize } from "../models/Schedule.js";
import { buildOccupationMaps, isTeacherFree, isRoomFree } from "./conflictChecker.js";

const MAX_SUGGESTIONS = 3;

/**
 * Count how many lecture hours each course already occupies in the current timetable.
 *
 * @param {Array} currentSchedules - schedules for the timetable being edited
 * @returns {Map<string, number>}   courseId → number of slots placed
 */
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
 * Determine remaining lecture hours per course based on curriculum.
 *
 * Each curriculum course has a `credits` (or lecture-hours-per-week) field on
 * the course document.  We compare that to how many slots are already placed.
 *
 * @param {Object} curriculum     - the matching curriculum document
 * @param {Array}  allCourses     - all course documents (for credits lookup)
 * @param {Map}    placedHours    - courseId → placed slot count
 * @returns {Array<{courseId, courseName, courseCode, remaining, total, teacherIds}>}
 */
function getRemainingCourses(curriculum, allCourses, placedHours) {
  if (!curriculum?.courses?.length) return [];

  // Build a lookup: courseId/unid/ID → course doc
  const courseMap = new Map();
  for (const c of allCourses) {
    if (c.unid) courseMap.set(String(c.unid), c);
    if (c.ID)   courseMap.set(String(c.ID), c);
    if (c.code) courseMap.set(String(c.code), c);
  }

  const remaining = [];

  for (const entry of curriculum.courses) {
    const cid = String(entry.courseId || entry.unid || "");
    if (!cid) continue;

    const courseDoc = courseMap.get(cid);
    const totalHours = courseDoc ? (parseFloat(courseDoc.credits) || 0) : 0;
    const placed = placedHours.get(cid) || 0;
    const left = Math.max(0, totalHours - placed);

    remaining.push({
      courseId: cid,
      courseName: courseDoc?.name || cid,
      courseCode: courseDoc?.code || courseDoc?.ID || cid,
      remaining: left,
      total: totalHours,
      placed,
      teacherIds: entry.teacherIds || courseDoc?.teachers || [],
      isLab: /lab|practical|workshop/i.test(courseDoc?.name || ""),
      credits: totalHours,
    });
  }

  // Sort: most remaining hours first, then alphabetical
  remaining.sort((a, b) => b.remaining - a.remaining || a.courseCode.localeCompare(b.courseCode));

  return remaining;
}

/**
 * Compute the full suggestion grid for a timetable.
 *
 * @param {Object} params
 * @param {Array}  params.currentSchedules  - schedules for this timetable
 * @param {Array}  params.otherSchedules    - schedules from all OTHER timetables
 * @param {Object} params.curriculum        - the matching curriculum document
 * @param {Array}  params.allCourses        - all course documents
 * @param {Array}  params.allTeachers       - all teacher documents
 * @param {Array}  params.allRooms          - all room documents
 * @param {Array}  params.days              - ["mon","tue",...,"sat"]
 * @param {Array}  params.timeSlots         - ["7:00 - 7:55", ...]
 *
 * @returns {Map<string, Array>} "row-col" → [{rank, courseId, courseName, teacherId, teacherName, roomId, roomName, reason, suggestBatchSplit}]
 */
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
  // Combine ALL schedules for conflict checking
  const allSchedules = [...currentSchedules, ...otherSchedules];
  const { teacherOccupied, roomOccupied } = buildOccupationMaps(allSchedules);

  // Figure out which courses still need hours
  const placedHours = countPlacedHours(currentSchedules);
  const remainingCourses = getRemainingCourses(curriculum, allCourses, placedHours);

  // Build teacher lookup
  const teacherMap = new Map();
  for (const t of allTeachers) {
    if (t.unid) teacherMap.set(String(t.unid), t);
    if (t.ID)   teacherMap.set(String(t.ID), t);
  }

  // Build a set of occupied cells in current timetable
  const occupiedCells = new Set();
  for (const s of currentSchedules) {
    if (s.courseId || s.teacherId || s.roomId) {
      occupiedCells.add(`${s.rowIndex}-${s.colIndex}`);
    }
  }

  // Build room availability lookup
  const roomAvailability = new Map();
  for (const r of allRooms) {
    const rid = String(r.unid || r.ID || "");
    if (rid) roomAvailability.set(rid, r);
  }

  const suggestionGrid = new Map();

  const normalizedDays = days.map((d) => normalize(d).toLowerCase());
  const normalizedSlots = timeSlots.map((t) => normalize(t).toLowerCase());

  for (let row = 0; row < normalizedSlots.length; row++) {
    for (let col = 0; col < normalizedDays.length; col++) {
      const cellKey = `${row}-${col}`;

      // Skip cells that already have data
      if (occupiedCells.has(cellKey)) continue;

      const day  = normalizedDays[col];
      const time = normalizedSlots[row];
      const suggestions = [];

      // Try each remaining course
      for (const course of remainingCourses) {
        if (course.remaining <= 0) continue;

        // Find available teachers for this course at this slot
        const availableTeachers = [];
        for (const tid of course.teacherIds) {
          const tStr = String(tid);
          if (isTeacherFree(teacherOccupied, day, time, tStr)) {
            const tDoc = teacherMap.get(tStr);
            availableTeachers.push({
              teacherId: tStr,
              teacherName: tDoc?.name || tDoc?.ID || tStr,
            });
          }
        }

        if (availableTeachers.length === 0) continue;

        // Find available rooms at this slot
        const availableRooms = [];
        for (const r of allRooms) {
          const rid = String(r.unid || r.ID || "");
          if (!rid) continue;
          if (!isRoomFree(roomOccupied, day, time, rid)) continue;

          // Check room availability schedule if it exists
          const avail = r.availability?.day;
          if (avail) {
            const dayAvail = avail[day];
            if (dayAvail?.time?.length > 0) {
              // Room has specific available times — check if this slot is one
              const timeMatch = dayAvail.time.some(
                (t) => normalize(t).toLowerCase() === time
              );
              if (!timeMatch) continue;
            }
            // If dayAvail.time is empty/missing, room is available all day
          }

          availableRooms.push({
            roomId: rid,
            roomName: r.name || r.ID || rid,
          });
        }

        if (availableRooms.length === 0) continue;

        // Pick best teacher (first available, preferring curriculum-assigned)
        const teacher = availableTeachers[0];
        const room = availableRooms[0];

        const reason = course.remaining === course.total
          ? `${course.courseCode} not yet scheduled (${course.total}h/week needed)`
          : `${course.courseCode} needs ${course.remaining} more hours (${course.placed}/${course.total})`;

        const suggestion = {
          courseId: course.courseId,
          courseName: course.courseName,
          courseCode: course.courseCode,
          teacherId: teacher.teacherId,
          teacherName: teacher.teacherName,
          roomId: room.roomId,
          roomName: room.roomName,
          batchName: "",
          reason,
          suggestBatchSplit: false,
        };

        // Suggest batch split for lab courses
        if (course.isLab) {
          suggestion.suggestBatchSplit = true;
          suggestion.reason += " (Lab — consider splitting into batches)";
        }

        suggestions.push(suggestion);

        if (suggestions.length >= MAX_SUGGESTIONS) break;
      }

      // Rank and store
      suggestions.forEach((s, i) => (s.rank = i + 1));

      if (suggestions.length > 0) {
        suggestionGrid.set(cellKey, suggestions);
      }
    }
  }

  return suggestionGrid;
}
