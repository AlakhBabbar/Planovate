import { apiFetch, createQueryString } from "./apiClient";

export async function getSchedulesByTimetableId(timetableId) {
  const query = createQueryString({ timetableId });
  return await apiFetch(`/schedules${query}`);
}

export async function saveSchedules({ timetableId, schedules }) {
  // To simulate batch processing efficiently, we could delete all existing and insert new ones.
  // Actually, standard PUT /api/schedules is not ideal here since we just want to bulk replace.
  // For simplicity since the backend is basic, we will bulk POST instead if they don't exist, but we should clear first.
  
  // We can just fetch existing ones and delete them one by one, then create new ones.
  const existing = await apiFetch(`/schedules?timetableId=${timetableId}`);
  await Promise.all(existing.map(s => apiFetch(`/schedules/${s._id}`, { method: 'DELETE' })));
  
  // Insert new
  await Promise.all(schedules.map(s => {
    s.timetableId = timetableId;
    return apiFetch(`/schedules`, { method: 'POST', body: JSON.stringify(s) });
  }));
}

export async function deleteAllSchedulesByTimetableId(timetableId) {
  const existing = await apiFetch(`/schedules?timetableId=${timetableId}`);
  await Promise.all(existing.map(s => apiFetch(`/schedules/${s._id}`, { method: 'DELETE' })));
}

export async function getAllSchedules() {
  return await apiFetch(`/schedules`);
}
