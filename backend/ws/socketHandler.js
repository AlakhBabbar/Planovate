/**
 * WebSocket message handler
 *
 * Manages per-client state:
 * - Which timetable they have open
 * - Their cursor position
 * - Active Firestore onSnapshot listeners
 * - Pre-computed suggestion grid
 */

import {
  watchSchedulesByTimetableId,
  watchAllOtherSchedules,
} from "../services/scheduleService.js";
import { getAllCourses } from "../services/courseService.js";
import { getAllTeachers } from "../services/teacherService.js";
import { getAllRooms } from "../services/roomService.js";
import {
  getAllCurriculums,
  findCurriculumForMeta,
} from "../services/curriculumService.js";
import { computeSuggestionGrid } from "../engine/computeEngine.js";
import { getNeighborSuggestions } from "../engine/suggestionBuilder.js";
const normalize = (value) =>
  String(value ?? "")
    .trim()
    .replace(/\s+/g, " ");

/**
 * Per-client state object.
 */
function createClientState() {
  return {
    timetableId: null,
    meta: null,            // { class, branch, semester, type }
    cursorRow: null,
    cursorCol: null,
    // Firestore listeners (unsubscribe functions)
    unsubCurrent: null,
    unsubOthers: null,
    // Cached data
    currentSchedules: [],
    otherSchedules: [],
    allCourses: [],
    allTeachers: [],
    allRooms: [],
    curriculum: null,
    // Pre-computed
    suggestionGrid: null,
    days: [],
    timeSlots: [],
    // Recompute debounce
    recomputeTimer: null,
    isComputing: false,
  };
}

/**
 * Send a JSON message to the client.
 */
function send(ws, data) {
  if (ws.readyState === 1) {
    ws.send(JSON.stringify(data));
  }
}

/**
 * Trigger a recompute of the suggestion grid (debounced).
 * After computing, if the client has a cursor position, immediately send neighbor suggestions.
 */
function scheduleRecompute(ws, state) {
  if (state.recomputeTimer) clearTimeout(state.recomputeTimer);

  state.recomputeTimer = setTimeout(async () => {
    if (!state.curriculum) return;

    state.isComputing = true;
    send(ws, { type: "computing", status: "started" });

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

      send(ws, { type: "computing", status: "done" });

      // If cursor is set, push updated suggestions immediately
      if (state.cursorRow !== null && state.cursorCol !== null) {
        sendNeighborSuggestions(ws, state, "suggestions_updated");
      }
    } catch (err) {
      state.isComputing = false;
      console.error("[ws] compute error:", err);
      send(ws, { type: "computing", status: "cancelled" });
      send(ws, { type: "error", message: err.message });
    }
  }, 300); // 300ms debounce
}

/**
 * Send neighbor suggestions for the current cursor position.
 */
function sendNeighborSuggestions(ws, state, type = "suggestions") {
  if (!state.suggestionGrid || state.cursorRow === null || state.cursorCol === null) {
    return;
  }

  const neighbors = getNeighborSuggestions(
    state.suggestionGrid,
    state.cursorRow,
    state.cursorCol,
    state.timeSlots.length,
    state.days.length
  );

  send(ws, { type, cursorRow: state.cursorRow, cursorCol: state.cursorCol, neighbors });
}

/**
 * Clean up all listeners and timers for a client.
 */
function cleanup(state) {
  if (state.unsubCurrent) {
    state.unsubCurrent();
    state.unsubCurrent = null;
  }
  if (state.unsubOthers) {
    state.unsubOthers();
    state.unsubOthers = null;
  }
  if (state.recomputeTimer) {
    clearTimeout(state.recomputeTimer);
    state.recomputeTimer = null;
  }
}

/**
 * Handle "open_timetable" — the main setup flow.
 * Sets up onSnapshot listeners and fetches static data.
 */
async function handleOpenTimetable(ws, state, payload) {
  const { timetableId, meta } = payload;
  if (!timetableId || !meta) {
    send(ws, { type: "error", message: "open_timetable requires timetableId and meta" });
    return;
  }

  // Clean up previous listeners if switching timetables
  cleanup(state);

  state.timetableId = timetableId;
  state.meta = meta;
  state.cursorRow = null;
  state.cursorCol = null;
  state.suggestionGrid = null;

  send(ws, { type: "computing", status: "started" });

  try {
    // Fetch static data in parallel
    const [courses, teachers, rooms, curriculums] = await Promise.all([
      getAllCourses(),
      getAllTeachers(),
      getAllRooms(),
      getAllCurriculums(),
    ]);

    state.allCourses = courses;
    state.allTeachers = teachers;
    state.allRooms = rooms;

    // Find matching curriculum
    state.curriculum = findCurriculumForMeta(curriculums, meta);

    if (!state.curriculum) {
      console.warn(`[ws] No curriculum found for ${JSON.stringify(meta)}`);
      send(ws, {
        type: "error",
        message: `No curriculum found for ${meta.class} ${meta.branch} sem ${meta.semester} (${meta.type})`,
      });
    }

    // Get timetable days/timeSlots from the timetable doc
    // (Will be filled when first schedule snapshot arrives, or we default)
    state.days = ["mon", "tue", "wed", "thu", "fri", "sat"];
    state.timeSlots = []; // Will be populated from timetable meta

    // Set up live listener: current timetable schedules
    state.unsubCurrent = watchSchedulesByTimetableId(
      timetableId,
      (schedules) => {
        state.currentSchedules = schedules;

        // Infer timeSlots from schedule data if not yet set
        if (state.timeSlots.length === 0 && schedules.length > 0) {
          const times = new Set(schedules.map((s) => normalize(s.time).toLowerCase()));
          state.timeSlots = Array.from(times).sort();
        }

        console.log(`[ws] current schedules updated: ${schedules.length} entries`);
        scheduleRecompute(ws, state);
      },
      (err) => send(ws, { type: "error", message: err.message })
    );

    // Set up live listener: all OTHER timetable schedules
    state.unsubOthers = watchAllOtherSchedules(
      timetableId,
      (schedules) => {
        state.otherSchedules = schedules;
        console.log(`[ws] other schedules updated: ${schedules.length} entries`);
        scheduleRecompute(ws, state);
      },
      (err) => send(ws, { type: "error", message: err.message })
    );
  } catch (err) {
    console.error("[ws] open_timetable error:", err);
    send(ws, { type: "error", message: err.message });
    send(ws, { type: "computing", status: "cancelled" });
  }
}

/**
 * Handle "cursor_move" — send suggestions for neighbor cells.
 */
function handleCursorMove(ws, state, payload) {
  const { row, col } = payload;
  if (typeof row !== "number" || typeof col !== "number") {
    send(ws, { type: "error", message: "cursor_move requires row and col (numbers)" });
    return;
  }

  state.cursorRow = row;
  state.cursorCol = col;

  sendNeighborSuggestions(ws, state);
}

/**
 * Handle "close_timetable" — teardown listeners.
 */
function handleCloseTimetable(ws, state) {
  cleanup(state);
  state.timetableId = null;
  state.meta = null;
  state.currentSchedules = [];
  state.otherSchedules = [];
  state.suggestionGrid = null;
  state.cursorRow = null;
  state.cursorCol = null;
}

// ── Exported handler ────────────────────────────────────────────────────────

/**
 * Set up message handling for a newly-connected WebSocket client.
 *
 * @param {WebSocket} ws
 */
export function handleConnection(ws) {
  const state = createClientState();

  console.log("[ws] client connected");

  ws.on("message", async (raw) => {
    let msg;
    try {
      msg = JSON.parse(raw);
    } catch {
      send(ws, { type: "error", message: "Invalid JSON" });
      return;
    }

    console.log("[ws] ←", msg.type, msg.timetableId || "");

    switch (msg.type) {
      case "open_timetable":
        await handleOpenTimetable(ws, state, msg);
        break;

      case "cursor_move":
        handleCursorMove(ws, state, msg);
        break;

      case "close_timetable":
        handleCloseTimetable(ws, state);
        break;

      default:
        send(ws, { type: "error", message: `Unknown message type: ${msg.type}` });
    }
  });

  ws.on("close", () => {
    console.log("[ws] client disconnected");
    cleanup(state);
  });

  ws.on("error", (err) => {
    console.error("[ws] error:", err.message);
    cleanup(state);
  });

  // Send a welcome message
  send(ws, { type: "connected", message: "Planovate compute engine ready" });
}
