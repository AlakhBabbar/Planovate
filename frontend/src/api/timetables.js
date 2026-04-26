import { apiFetch } from "./apiClient";

export async function saveTimetable(timetableData) {
  const unid = `tt_${timetableData.meta.class}_${timetableData.meta.branch}_${timetableData.meta.semester}_${timetableData.meta.type}`.toLowerCase().replace(/[^a-z0-9_]/g, "_");
  const payload = {
    unid,
    name: timetableData.meta.name || "Untitled",
    class: timetableData.meta.class,
    branch: timetableData.meta.branch,
    semester: timetableData.meta.semester,
    type: timetableData.meta.type,
    days: timetableData.days || [],
    timeSlots: timetableData.timeSlots || [],
  };
  await apiFetch(`/timetables/${unid}`, { method: 'PUT', body: JSON.stringify(payload) });
  return unid;
}

export async function getTimetable(unid) {
  return await apiFetch(`/timetables/${unid}`);
}

export async function loadTimetable(unid) {
  const data = await apiFetch(`/timetables/${unid}`);
  if (!data) return null;
  
  return {
    meta: {
      name: data.name,
      class: data.class,
      branch: data.branch,
      semester: data.semester,
      type: data.type,
    },
    days: data.days || [],
    timeSlots: data.timeSlots || [],
    tables: data.tables || [],
    batchesByTable: data.batchesByTable || {},
    batchDataByTable: data.batchDataByTable || {}
  };
}

export async function listTimetables() {
  return await apiFetch(`/timetables`);
}

export async function deleteTimetable(unid) {
  await apiFetch(`/timetables/${unid}`, { method: 'DELETE' });
}
