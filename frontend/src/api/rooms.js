import { apiFetch, createQueryString } from "./apiClient";

const normalize = (value) =>
  String(value ?? "")
    .trim()
    .replace(/\s+/g, " ");


export async function listRooms({ faculty } = {}) {
  const query = createQueryString({ faculty });
  return await apiFetch(`/rooms${query}`);
}

export async function upsertRoom(room) {
  const unid = room.unid ?? Date.now();
  const payload = {
    unid,
    ID: normalize(room.ID),
    name: normalize(room.name),
    capacity: Number(room.capacity) || 0,
    floor: normalize(room.floor),
    faculty: normalize(room.faculty),
    availability: room.availability || {
      day: {
        mon: [],
        tue: [],
        wed: [],
        thu: [],
        fri: [],
        sat: [],
      },
    },
  };
  await apiFetch(`/rooms/${unid}`, { method: 'PUT', body: JSON.stringify(payload) });
  return unid;
}

export async function deleteRoom(unid) {
  await apiFetch(`/rooms/${unid}`, { method: 'DELETE' });
}

export async function listFaculties() {
  const items = await apiFetch('/rooms');
  const set = new Set();
  items.forEach(i => {
    const faculty = normalize(i.faculty);
    if (faculty) set.add(faculty);
  });
  return Array.from(set).sort((a, b) => a.localeCompare(b));
}
