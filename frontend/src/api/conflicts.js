import { apiFetch } from './apiClient';

/** Fetch all active/resolved conflicts across all timetables */
export async function getAllConflicts() {
  const data = await apiFetch('/conflicts');
  return data.conflicts || [];
}

/** Fetch conflicts for a specific timetable */
export async function getConflictsForTimetable(timetableId) {
  const data = await apiFetch(`/conflicts/${encodeURIComponent(timetableId)}`);
  return data.conflicts || [];
}

/** Delete all conflicts for a timetable (call on save) */
export async function deleteConflictsForTimetable(timetableId) {
  return apiFetch(`/conflicts/${encodeURIComponent(timetableId)}`, { method: 'DELETE' });
}
