import { apiFetch, createQueryString } from "./apiClient";

export async function getTempSchedulesByTimetableId(timetableId) {
  const query = createQueryString({ timetableId });
  return await apiFetch(`/tempschedules${query}`);
}

export async function upsertTempSchedules(timetableId, schedules) {
  // Clear first then post new
  const existing = await apiFetch(`/tempschedules?timetableId=${timetableId}`);
  await Promise.all(existing.map(s => apiFetch(`/tempschedules/${s._id}`, { method: 'DELETE' })));
  
  await Promise.all(schedules.map(s => {
    s.timetableId = timetableId;
    return apiFetch(`/tempschedules`, { method: 'POST', body: JSON.stringify(s) });
  }));
}

export async function deleteTempSchedulesByTimetableId(timetableId) {
  const existing = await apiFetch(`/tempschedules?timetableId=${timetableId}`);
  await Promise.all(existing.map(s => apiFetch(`/tempschedules/${s._id}`, { method: 'DELETE' })));
}
