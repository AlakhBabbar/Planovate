/**
 * Schedule service — MongoDB with polling-based "live" watchers.
 * Since MongoDB has no built-in onSnapshot, we poll every POLL_INTERVAL ms.
 */
import Schedule from '../models/Schedule.js';
import TempSchedule from '../models/TempSchedule.js';

const POLL_INTERVAL = 4000; // 4 seconds

export async function getSchedulesByTimetableId(timetableId) {
  if (!timetableId) return [];
  return await Schedule.find({ timetableId: String(timetableId) }).lean();
}

export async function getTempSchedulesByTimetableId(timetableId) {
  if (!timetableId) return [];
  return await TempSchedule.find({ timetableId: String(timetableId) }).lean();
}

export async function getAllSchedules() {
  return await Schedule.find({}).lean();
}

/**
 * Poll schedules for ONE timetable.
 * Returns a stop() function to cancel.
 */
export function watchSchedulesByTimetableId(timetableId, onData, onError) {
  let stopped = false;

  async function poll() {
    if (stopped) return;
    try {
      const schedules = await getSchedulesByTimetableId(timetableId);
      onData(schedules);
    } catch (err) {
      console.error('[scheduleService] poll error:', err);
      if (onError) onError(err);
    }
    if (!stopped) setTimeout(poll, POLL_INTERVAL);
  }

  // Initial fetch immediately
  poll();

  return () => { stopped = true; };
}

/**
 * Poll ALL schedules except a given timetableId.
 * If activeTimetableIds is provided, only include schedules from those timetables.
 * Returns a stop() function to cancel.
 */
export function watchAllOtherSchedules(excludeTimetableId, onData, onError, activeTimetableIds = null) {
  let stopped = false;

  async function poll() {
    if (stopped) return;
    try {
      const filter = { timetableId: { $ne: String(excludeTimetableId) } };
      // If active timetable IDs are provided, restrict to only those
      if (activeTimetableIds && activeTimetableIds.length > 0) {
        filter.timetableId = { $ne: String(excludeTimetableId), $in: activeTimetableIds };
      }
      const all = await Schedule.find(filter).lean();
      onData(all);
    } catch (err) {
      console.error('[scheduleService] poll error (others):', err);
      if (onError) onError(err);
    }
    if (!stopped) setTimeout(poll, POLL_INTERVAL);
  }

  poll();

  return () => { stopped = true; };
}
