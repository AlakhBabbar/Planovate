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
import { upsertConflicts, resolveConflictsForCell, loadConflictsForTimetable } from '../services/conflictService.js';
import Setting from '../models/Setting.js';
import Timetable from '../models/Timetable.js';

/**
 * Resolve which timetable IDs belong to active semesters.
 * Returns null if no setting exists OR no timetables match (= no filtering).
 */
async function getActiveTimetableIds() {
  try {
    const setting = await Setting.findOne({ _docId: 'activeSemesters' }).lean();
    if (!setting?.list?.active || setting.list.active.length === 0) return null;

    const activeSems = setting.list.active.map(String);
    const timetables = await Timetable.find({ semester: { $in: activeSems } }, { unid: 1 }).lean();
    const ids = timetables.map(t => t.unid).filter(Boolean);
    console.log(`[semester-filter] active semesters: [${activeSems}] → ${ids.length} timetable(s)`);
    // If no timetables found for active semesters, fall back to no filtering
    return ids.length > 0 ? ids : null;
  } catch (err) {
    console.warn('[semester-filter] error loading active semesters:', err.message);
    return null;
  }
}

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
    activeTimetableIds: null, // null = no filter, [] = filter active
    // Pre-computed grid
    suggestionGrid: null,
    days: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat'],
    timeSlots: [],
    // Timers
    recomputeTimer: null,
    dwellTimer: null,
    isComputing: false,
    suggestionsEnabled: false,
  };
}

function send(ws, data) {
  if (ws.readyState === 1) ws.send(JSON.stringify(data));
}

function scheduleRecompute(ws, state) {
  // Only compute if suggestions have been explicitly enabled by the user
  if (!state.suggestionsEnabled) {
    console.log('[compute] SKIP — suggestions not enabled by user');
    return;
  }

  if (state.recomputeTimer) clearTimeout(state.recomputeTimer);

  console.log('[compute] scheduling recompute in 400ms...');

  state.recomputeTimer = setTimeout(async () => {
    console.log('[compute] ── RECOMPUTE TRIGGERED ──');
    console.log(`[compute]   timetableId:       ${state.timetableId}`);
    console.log(`[compute]   curriculum:        ${state.curriculum ? 'YES (' + (state.curriculum.courses?.length ?? 0) + ' courses)' : 'NONE'}`);
    console.log(`[compute]   currentSchedules:  ${state.currentSchedules.length}`);
    console.log(`[compute]   otherSchedules:    ${state.otherSchedules.length}`);
    console.log(`[compute]   allCourses:        ${state.allCourses.length}`);
    console.log(`[compute]   allTeachers:       ${state.allTeachers.length}`);
    console.log(`[compute]   allRooms:          ${state.allRooms.length}`);
    console.log(`[compute]   days:              ${state.days.join(', ')}`);
    console.log(`[compute]   timeSlots:         ${state.timeSlots.length} (${state.timeSlots.slice(0, 3).join(', ')}${state.timeSlots.length > 3 ? '...' : ''})`);

    if (!state.curriculum) {
      console.warn('[compute] ABORT — no curriculum found for this timetable. Suggestions require a curriculum.');
      send(ws, { type: 'computing', status: 'done' });
      send(ws, { type: 'all_suggestions', suggestions: {} });
      return;
    }

    if (state.timeSlots.length === 0) {
      console.warn('[compute] ABORT — no timeSlots. Cannot generate grid without time slots.');
      send(ws, { type: 'computing', status: 'done' });
      send(ws, { type: 'all_suggestions', suggestions: {} });
      return;
    }

    state.isComputing = true;
    send(ws, { type: 'computing', status: 'started' });
    console.log('[compute] STATUS → started (sent to frontend)');

    try {
      const startMs = Date.now();
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
      const elapsed = Date.now() - startMs;

      state.suggestionGrid = grid;
      state.isComputing = false;

      let totalSuggestions = 0;
      for (const arr of grid.values()) totalSuggestions += arr.length;

      console.log(`[compute] ✓ DONE in ${elapsed}ms — ${grid.size} cells, ${totalSuggestions} total suggestions`);
      send(ws, { type: 'computing', status: 'done' });

      // Send all suggestions to frontend for sidebar panel
      sendAllSuggestions(ws, state);

      // Push neighbor suggestions if cursor is set
      if (state.cursorRow !== null && state.cursorCol !== null) {
        sendNeighborSuggestions(ws, state, 'suggestions_updated');
      }
    } catch (err) {
      state.isComputing = false;
      console.error('[compute] ✗ ERROR:', err.message);
      console.error(err.stack);
      send(ws, { type: 'computing', status: 'cancelled' });
      send(ws, { type: 'error', message: err.message });
    }
  }, 400);
}

/**
 * Send the full suggestion grid to the frontend in one shot.
 * Frontend uses this to populate the SuggestionPanel sidebar.
 */
function sendAllSuggestions(ws, state) {
  if (!state.suggestionGrid) return;
  const allSuggestions = {};
  let totalCount = 0;
  for (const [key, suggestions] of state.suggestionGrid.entries()) {
    if (suggestions && suggestions.length > 0) {
      allSuggestions[key] = suggestions;
      totalCount += suggestions.length;
    }
  }
  console.log(`[ws] sending all_suggestions — ${Object.keys(allSuggestions).length} cells, ${totalCount} total suggestions`);
  send(ws, { type: 'all_suggestions', suggestions: allSuggestions });
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

  try {
    // Fetch all static data + active semester config in parallel
    const [courses, teachers, rooms, curriculums, activeTtIds] = await Promise.all([
      getAllCourses(),
      getAllTeachers(),
      getAllRooms(),
      getAllCurriculums(),
      getActiveTimetableIds(),
    ]);

    state.activeTimetableIds = activeTtIds;

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

    // Start polling other timetable schedules — filtered by active semesters
    state.stopOthers = watchAllOtherSchedules(
      timetableId,
      (schedules) => {
        state.otherSchedules = schedules;
        scheduleRecompute(ws, state);
      },
      (err) => send(ws, { type: 'error', message: err.message }),
      state.activeTimetableIds
    );

    send(ws, { type: 'open_timetable_ack', timetableId });

    // Push stored conflicts for this timetable (persisted from previous sessions)
    try {
      const storedConflicts = await loadConflictsForTimetable(timetableId);
      if (storedConflicts.length) {
        send(ws, { type: 'stored_conflicts', timetableId, conflicts: storedConflicts });
      }
    } catch (e) {
      console.warn('[ws] could not load stored conflicts:', e.message);
    }
  } catch (err) {
    console.error('[ws] open_timetable error:', err);
    send(ws, { type: 'error', message: err.message });
    // Still send ack so frontend overlay doesn't get stuck
    send(ws, { type: 'open_timetable_ack', timetableId });
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
      activeTimetableIds: state.activeTimetableIds,
    });

    // Enrich each conflict descriptor with display names
    const Timetable = (await import('../models/Timetable.js')).default;
    const timetableCache = new Map();

    const enriched = await Promise.all(rawConflicts.map(async (c) => {
      // Look up the CONFLICTING timetable's display info (not the caller's)
      const lookupId = c.conflictingTimetableId;
      let tt = timetableCache.get(lookupId);
      if (!tt) {
        tt = await Timetable.findOne({ timetableId: lookupId }).lean() || {};
        timetableCache.set(lookupId, tt);
      }

      // Resolve entity display names from session state
      const teacherDoc = c.type === 'teacher'
        ? state.allTeachers.find(t => String(t.unid) === String(c.conflictingId) || String(t.ID) === String(c.conflictingId))
        : null;
      const roomDoc = c.type === 'room'
        ? state.allRooms.find(r => String(r.unid) === String(c.conflictingId) || String(r.ID) === String(c.conflictingId))
        : null;

      return {
        ...c,
        // Source timetable (the open one being edited)
        sourceTimetableId:   state.timetableId,
        // Conflicting timetable display fields
        displayClass:    tt.class    || lookupId,
        displayBranch:   tt.branch   || '',
        displaySemester: tt.semester || '',
        displayType:     tt.type     || '',
        // Entity display names
        teacherName: teacherDoc?.name || (c.type === 'teacher' ? c.conflictingId : null),
        roomName:    roomDoc?.name    || (c.type === 'room'    ? c.conflictingId : null),
      };
    }));

    send(ws, { type: 'conflict_result', row, col, batchIndex, conflicts: enriched });

    // Persist to Conflict collection
    try {
      if (enriched.length) {
        await upsertConflicts(enriched.map(c => ({
          ...c,
          // Source = the timetable being edited
          sourceTimetableId:  state.timetableId,
          sourceScheduleType: 'temp', // user is editing a temp cell
          rowIndex: row,
          colIndex: col,
          batchIndex,
        })));
      } else {
        // No conflicts → resolve any existing ones for this cell
        await resolveConflictsForCell({
          sourceTimetableId: state.timetableId,
          rowIndex: row,
          colIndex: col,
          batchIndex,
        });
      }
    } catch (e) {
      console.warn('[ws] conflict persist error:', e.message);
    }

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
      case 'enable_suggestions': {
        console.log('[ws] suggestions ENABLED by user');
        state.suggestionsEnabled = true;
        send(ws, { type: 'suggestions_enabled' });
        // Always trigger compute — curriculum alone is enough for suggestions
        scheduleRecompute(ws, state);
        break;
      }
      case 'disable_suggestions': {
        console.log('[ws] suggestions DISABLED by user');
        state.suggestionsEnabled = false;
        if (state.recomputeTimer) { clearTimeout(state.recomputeTimer); state.recomputeTimer = null; }
        state.suggestionGrid = null;
        send(ws, { type: 'suggestions_disabled' });
        break;
      }
      case 'close_timetable': handleCloseTimetable(ws, state); break;
      default: send(ws, { type: 'error', message: `Unknown type: ${msg.type}` });
    }
  });

  ws.on('close', () => { console.log('[ws] client disconnected'); cleanup(state); });
  ws.on('error', (err) => { console.error('[ws] error:', err.message); cleanup(state); });

  send(ws, { type: 'connected', message: 'Planovate compute engine ready' });
}
