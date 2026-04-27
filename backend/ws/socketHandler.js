/**
 * WebSocket message handler — MongoDB version
 *
 * Messages FROM client:
 *   open_timetable  { timetableId, meta, days, timeSlots }
 *   cell_focus      { row, col }       — user hovering cell for 2.5s
 *   cursor_move     { row, col }       — cursor position (immediate)
 *   close_timetable {}
 *
 * Messages TO client:
 *   connected       {}
 *   computing       { status: "started"|"done"|"cancelled" }
 *   suggestions     { cursorRow, cursorCol, neighbors }
 *   cell_suggestions{ row, col, suggestions[] }
 *   error           { message }
 */

import { watchSchedulesByTimetableId, watchAllOtherSchedules } from '../services/scheduleService.js';
import { getAllCourses } from '../services/courseService.js';
import { getAllTeachers } from '../services/teacherService.js';
import { getAllRooms } from '../services/roomService.js';
import { getAllCurriculums, findCurriculumForMeta } from '../services/curriculumService.js';
import { computeSuggestionGrid } from '../engine/computeEngine.js';
import { getNeighborSuggestions } from '../engine/suggestionBuilder.js';
import { checkCellConflicts } from '../engine/conflictEngine.js';

const DWELL_MS = 2500; // ms user must stay on cell before suggestions fire

function createClientState() {
  return {
    timetableId: null,
    meta: null,
    cursorRow: null,
    cursorCol: null,
    // Poll stop functions (replace unsubscribe)
    stopCurrent: null,
    stopOthers: null,
    // Cached data
    currentSchedules: [],
    otherSchedules: [],
    allCourses: [],
    allTeachers: [],
    allRooms: [],
    curriculum: null,
    // Pre-computed grid
    suggestionGrid: null,
    days: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat'],
    timeSlots: [],
    // Timers
    recomputeTimer: null,
    dwellTimer: null,
    isComputing: false,
  };
}

function send(ws, data) {
  if (ws.readyState === 1) ws.send(JSON.stringify(data));
}

function scheduleRecompute(ws, state) {
  if (state.recomputeTimer) clearTimeout(state.recomputeTimer);

  state.recomputeTimer = setTimeout(async () => {
    if (!state.curriculum) return;

    state.isComputing = true;
    send(ws, { type: 'computing', status: 'started' });

    try {
      const grid = computeSuggestionGrid({
        currentSchedules: state.currentSchedules,
        otherSchedules: state.otherSchedules,
        curriculum: state.curriculum,
        allCourses: state.allCourses,
        allTeachers: state.allTeachers,
        allRooms: state.allRooms,
        days: state.days,
        timeSlots: state.timeSlots,
      });

      state.suggestionGrid = grid;
      state.isComputing = false;
      send(ws, { type: 'computing', status: 'done' });

      // Push neighbor suggestions if cursor is set
      if (state.cursorRow !== null && state.cursorCol !== null) {
        sendNeighborSuggestions(ws, state, 'suggestions_updated');
      }
    } catch (err) {
      state.isComputing = false;
      console.error('[ws] compute error:', err);
      send(ws, { type: 'computing', status: 'cancelled' });
      send(ws, { type: 'error', message: err.message });
    }
  }, 400);
}

function sendNeighborSuggestions(ws, state, type = 'suggestions') {
  if (!state.suggestionGrid || state.cursorRow === null || state.cursorCol === null) return;

  const neighbors = getNeighborSuggestions(
    state.suggestionGrid,
    state.cursorRow,
    state.cursorCol,
    state.timeSlots.length,
    state.days.length
  );

  send(ws, { type, cursorRow: state.cursorRow, cursorCol: state.cursorCol, neighbors });
}

function sendCellSuggestions(ws, state, row, col) {
  if (!state.suggestionGrid) return;
  const key = `${row}-${col}`;
  const suggestions = state.suggestionGrid.get(key) || [];
  send(ws, { type: 'cell_suggestions', row, col, suggestions });
}

function cleanup(state) {
  if (state.stopCurrent) { state.stopCurrent(); state.stopCurrent = null; }
  if (state.stopOthers)  { state.stopOthers();  state.stopOthers  = null; }
  if (state.recomputeTimer) { clearTimeout(state.recomputeTimer); state.recomputeTimer = null; }
  if (state.dwellTimer)     { clearTimeout(state.dwellTimer);     state.dwellTimer     = null; }
}

async function handleOpenTimetable(ws, state, payload) {
  const { timetableId, meta, days, timeSlots } = payload;
  if (!timetableId || !meta) {
    send(ws, { type: 'error', message: 'open_timetable requires timetableId and meta' });
    return;
  }

  cleanup(state);

  state.timetableId = timetableId;
  state.meta        = meta;
  state.cursorRow   = null;
  state.cursorCol   = null;
  state.suggestionGrid = null;
  state.days      = days      || ['mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  state.timeSlots = timeSlots || [];

  send(ws, { type: 'computing', status: 'started' });

  try {
    // Fetch all static data in parallel
    const [courses, teachers, rooms, curriculums] = await Promise.all([
      getAllCourses(),
      getAllTeachers(),
      getAllRooms(),
      getAllCurriculums(),
    ]);

    state.allCourses  = courses;
    state.allTeachers = teachers;
    state.allRooms    = rooms;
    state.curriculum  = findCurriculumForMeta(curriculums, meta);

    console.log(`[ws] data loaded — courses:${courses.length} teachers:${teachers.length} rooms:${rooms.length} curriculums:${curriculums.length}`);
    console.log(`[ws] curriculum found: ${!!state.curriculum} for`, JSON.stringify(meta));
    if (state.curriculum) {
      console.log(`[ws] curriculum courses: ${state.curriculum.courses?.length ?? 0}`);
    }

    if (!state.curriculum) {
      console.warn(`[ws] No curriculum for ${JSON.stringify(meta)}`);
      send(ws, {
        type: 'warning',
        message: `No curriculum for ${meta.class} ${meta.branch} sem ${meta.semester} (${meta.type}) — suggestions limited`,
      });
    }

    // Start polling current timetable schedules
    state.stopCurrent = watchSchedulesByTimetableId(
      timetableId,
      (schedules) => {
        state.currentSchedules = schedules;

        // Auto-infer timeSlots from schedule data if not provided
        if (state.timeSlots.length === 0 && schedules.length > 0) {
          const times = [...new Set(schedules.map(s => String(s.time || '').trim().toLowerCase()))].filter(Boolean).sort();
          state.timeSlots = times;
        }

        scheduleRecompute(ws, state);
      },
      (err) => send(ws, { type: 'error', message: err.message })
    );

    // Start polling other timetable schedules (for teacher/room conflict detection)
    state.stopOthers = watchAllOtherSchedules(
      timetableId,
      (schedules) => {
        state.otherSchedules = schedules;
        scheduleRecompute(ws, state);
      },
      (err) => send(ws, { type: 'error', message: err.message })
    );

    send(ws, { type: 'open_timetable_ack', timetableId });
  } catch (err) {
    console.error('[ws] open_timetable error:', err);
    send(ws, { type: 'error', message: err.message });
    send(ws, { type: 'computing', status: 'cancelled' });
  }
}

function handleCursorMove(ws, state, payload) {
  const { row, col } = payload;
  if (typeof row !== 'number' || typeof col !== 'number') {
    send(ws, { type: 'error', message: 'cursor_move requires numeric row and col' });
    return;
  }

  state.cursorRow = row;
  state.cursorCol = col;
  sendNeighborSuggestions(ws, state);
}

function handleCellFocus(ws, state, payload) {
  const { row, col } = payload;
  if (typeof row !== 'number' || typeof col !== 'number') return;

  // Clear previous dwell timer
  if (state.dwellTimer) clearTimeout(state.dwellTimer);

  // After DWELL_MS, send specific suggestions for this cell
  state.dwellTimer = setTimeout(() => {
    state.cursorRow = row;
    state.cursorCol = col;
    sendCellSuggestions(ws, state, row, col);
    sendNeighborSuggestions(ws, state);
  }, DWELL_MS);
}

function handleCloseTimetable(ws, state) {
  cleanup(state);
  state.timetableId       = null;
  state.meta              = null;
  state.currentSchedules  = [];
  state.otherSchedules    = [];
  state.suggestionGrid    = null;
  state.cursorRow         = null;
  state.cursorCol         = null;
}

async function handleCheckCell(ws, state, payload) {
  const { row, col, batchIndex = 0, day, time, teacherId, roomId } = payload;

  if (!state.timetableId) {
    send(ws, { type: 'conflict_result', row, col, batchIndex, conflicts: [] });
    return;
  }
  if (!day || !time) {
    send(ws, { type: 'conflict_result', row, col, batchIndex, conflicts: [] });
    return;
  }

  try {
    const rawConflicts = await checkCellConflicts({
      timetableId: state.timetableId,
      day,
      time,
      rowIndex:   row,
      colIndex:   col,
      batchIndex,
      teacherId:  teacherId || null,
      roomId:     roomId    || null,
    });

    // Enrich each conflict descriptor with display names
    const Timetable = (await import('../models/Timetable.js')).default;
    const timetableCache = new Map();

    const enriched = await Promise.all(rawConflicts.map(async (c) => {
      // Timetable details (cached per unique id)
      let tt = timetableCache.get(c.timetableId);
      if (!tt) {
        tt = await Timetable.findOne({ timetableId: c.timetableId }).lean() || {};
        timetableCache.set(c.timetableId, tt);
      }

      // Resolve display names from session state
      const teacherDoc = c.type === 'teacher'
        ? state.allTeachers.find(t => String(t.unid) === String(c.conflictingId) || String(t.ID) === String(c.conflictingId))
        : null;
      const roomDoc = c.type === 'room'
        ? state.allRooms.find(r => String(r.unid) === String(c.conflictingId) || String(r.ID) === String(c.conflictingId))
        : null;

      return {
        ...c,
        // Conflicting timetable context
        displayClass:    tt.class    || c.timetableId,
        displayBranch:   tt.branch   || '',
        displaySemester: tt.semester || '',
        displayType:     tt.type     || '',
        // Entity display names
        teacherName: teacherDoc?.name || (c.type === 'teacher' ? c.conflictingId : null),
        roomName:    roomDoc?.name    || (c.type === 'room'    ? c.conflictingId : null),
      };
    }));

    send(ws, { type: 'conflict_result', row, col, batchIndex, conflicts: enriched });
  } catch (err) {
    console.error('[ws] check_cell error:', err);
    send(ws, { type: 'conflict_result', row, col, batchIndex, conflicts: [], error: err.message });
  }
}



export function handleConnection(ws) {
  const state = createClientState();

  console.log('[ws] client connected');

  ws.on('message', async (raw) => {
    let msg;
    try { msg = JSON.parse(raw); }
    catch { send(ws, { type: 'error', message: 'Invalid JSON' }); return; }

    console.log('[ws] ←', msg.type, msg.timetableId || '');

    switch (msg.type) {
      case 'open_timetable':  await handleOpenTimetable(ws, state, msg); break;
      case 'cursor_move':     handleCursorMove(ws, state, msg); break;
      case 'cell_focus':      handleCellFocus(ws, state, msg); break;
      case 'check_cell':      await handleCheckCell(ws, state, msg); break;
      case 'close_timetable': handleCloseTimetable(ws, state); break;
      default: send(ws, { type: 'error', message: `Unknown type: ${msg.type}` });
    }
  });

  ws.on('close', () => { console.log('[ws] client disconnected'); cleanup(state); });
  ws.on('error', (err) => { console.error('[ws] error:', err.message); cleanup(state); });

  send(ws, { type: 'connected', message: 'Planovate compute engine ready' });
}
